import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage, Blob } from '@google/genai';
import { decodeLiveAudio, encode, decode } from '../utils/audioPlayer';
import type { Screen, VoiceSettings, VocalizationType } from '../types';
import { MicrophoneIcon, XMarkIcon, ChevronLeftIcon, Cog6ToothIcon } from '../components/icons/Icons';
import ListeningScreen from './ListeningScreen'; 
import VoiceSettingsModal from '../components/VoiceSettingsModal';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API_KEY is not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

type LiveSession = Awaited<ReturnType<typeof ai.live.connect>>;

interface ChatHistoryItem {
  id: number;
  text: string;
  type: 'user' | 'model';
}

const NOISE_THRESHOLD = 0.01; // Adjust this value to control noise sensitivity

const constructLiveSystemInstruction = (settings: VoiceSettings): string => {
  const baseInstruction = `You are an AI chat assistant roleplaying as ${settings.character}. Your goal is to have a pleasant and engaging live voice conversation. You are an expert in both English and conversational Marathi. Accurately detect the user's language in each turn and respond *only* in that language. Your Marathi transcription must be precise. Keep responses relatively short and conversational.`;

  const toneDescriptions: Record<string, string> = {
    Flirty: "that is very supportive, coy, dallying, and spoony. The tone should be smooth, teasing and slightly intimate but not vulgar, using a vocal smile, slow pace, and soft tone curve.",
    Angry: "that is very direct, frustrated, and sharp.",
    Supportive: "that is encouraging, warm, and positive.",
    Sweet: "that is gentle, kind, and very pleasant.",
    Sad: "that is soft, slow, and reflects a gentle sadness.",
    Happy: "that is energetic, smiling, and enthusiastic.",
    Energetic: "that is high-energy, lively, and fast-paced, suitable for motivation.",
    Calm: "that is cool, soft, and has a relaxing vibe, suitable for meditation.",
    Professional: "that is articulate, clear, and formal.",
    Romantic: "that is sweet, gentle, and caring.",
    Elegant: "that is confident, poised, and attractive with a classy feel. It uses a vocal arch (pitch goes up, then down, then slightly up again).",
    'Anime Character': "that has the personality and attitude of a sweet, energetic, and cute anime girl character. Use expressive and varied intonation.",
  };

  const vocalizationInstructions: Record<VocalizationType, string> = {
    pleasure: "You must add more vocalization of pleasure (like subtle sighs or gasps) in your responses.",
    au_sounds: "You must add more 'ah' and 'uh' sounds to make the response sound more intimate or expressive.",
    spoony: "Ensure the tone is extremely affectionate, slightly over-the-top, and very endearing.",
    breath: "Incorporate realistic, subtle human-like breathing sounds during pauses to make the voice sound more natural and less robotic.",
  };

  let instructions = [baseInstruction];
  
  instructions.push(`Your primary emotional and speech tone is ${settings.tone}.`);

  if (settings.tone !== 'Normal' && toneDescriptions[settings.tone]) {
      instructions.push(`For this tone, you must speak with a voice ${toneDescriptions[settings.tone]}.`);
  }
  
  instructions.push(`Your emotional intensity must be ${settings.intensity} times the normal level.`);

  const selectedVocalizations = settings.vocalizations.map(v => vocalizationInstructions[v]).join(' ');
  if(selectedVocalizations) {
      instructions.push(selectedVocalizations);
  }

  return instructions.join(' ');
};

const LiveCoachScreen: React.FC<{ setActiveScreen: (screen: Screen) => void, fromScreen: Screen }> = ({ setActiveScreen, fromScreen }) => {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [userLiveInput, setUserLiveInput] = useState('');
  const [modelLiveOutput, setModelLiveOutput] = useState('');
  const [transcriptionHistory, setTranscriptionHistory] = useState<ChatHistoryItem[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    character: 'NoxzAI',
    tone: 'Anime Character',
    intensity: 1.5,
    vocalizations: ['breath'],
  });
  const VOICE_SETTINGS_KEY = 'noxz_live_voice_settings';

  const sessionRef = useRef<LiveSession | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>());
  const nextStartTimeRef = useRef(0);
  const currentInputTranscription = useRef('');
  const currentOutputTranscription = useRef('');
  const turnCompleteTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const savedSettings = localStorage.getItem(VOICE_SETTINGS_KEY);
    if(savedSettings) {
      try {
        setVoiceSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error("Failed to parse live voice settings from localStorage", e);
      }
    }
  }, []);
  
  const startSession = useCallback(async () => {
    if (isSessionActive || isConnecting) return;
    setIsConnecting(true);
    setError(null);

    try {
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            if (!inputAudioContextRef.current || !mediaStreamRef.current) return;
            
            const source = inputAudioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
            const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                if (isModelSpeaking) return;
                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                
                let rms = 0;
                for (let i = 0; i < inputData.length; i++) {
                    rms += inputData[i] * inputData[i];
                }
                rms = Math.sqrt(rms / inputData.length);
                
                if (rms > NOISE_THRESHOLD) {
                    const pcmBlob = createBlob(inputData);
                    sessionPromise.then((session) => {
                        session.sendRealtimeInput({ media: pcmBlob });
                    }).catch(console.error);
                }
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current.destination);
            scriptProcessorRef.current = scriptProcessor;
          },
          onmessage: async (message: LiveServerMessage) => {
            setIsModelSpeaking(false);
            
            if (message.serverContent?.inputTranscription) {
                if (turnCompleteTimeoutRef.current) {
                    clearTimeout(turnCompleteTimeoutRef.current);
                    turnCompleteTimeoutRef.current = null;
                }
                const text = message.serverContent.inputTranscription.text;
                currentInputTranscription.current += text;
                setUserLiveInput(currentInputTranscription.current);
            } else if (message.serverContent?.outputTranscription) {
                const text = message.serverContent.outputTranscription.text;
                currentOutputTranscription.current += text;
                setModelLiveOutput(currentOutputTranscription.current);
            }
            
            if (message.serverContent?.turnComplete) {
                if (turnCompleteTimeoutRef.current) {
                    clearTimeout(turnCompleteTimeoutRef.current);
                }

                turnCompleteTimeoutRef.current = window.setTimeout(() => {
                    const fullInput = currentInputTranscription.current;
                    const fullOutput = currentOutputTranscription.current;

                    setTranscriptionHistory(prev => {
                        const newHistory = [...prev];
                        if (fullInput.trim()) {
                            newHistory.push({ id: Date.now(), text: fullInput.trim(), type: 'user' });
                        }
                        if (fullOutput.trim()) {
                            newHistory.push({ id: Date.now() + 1, text: fullOutput.trim(), type: 'model' });
                        }
                        return newHistory.length > prev.length ? newHistory : prev;
                    });

                    currentInputTranscription.current = '';
                    currentOutputTranscription.current = '';
                    setUserLiveInput('');
                    setModelLiveOutput('');
                    turnCompleteTimeoutRef.current = null;
                }, 300);
            }

            const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64EncodedAudioString && outputAudioContextRef.current) {
              setIsModelSpeaking(true);
              const outputCtx = outputAudioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const audioBuffer = await decodeLiveAudio(decode(base64EncodedAudioString), 24000);
              const source = outputCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputCtx.destination);
              source.addEventListener('ended', () => {
                  sourcesRef.current.delete(source);
                  if (sourcesRef.current.size === 0) {
                      setIsModelSpeaking(false);
                  }
              });
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
              sourcesRef.current.forEach(source => source.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('Live session error:', e);
            setError("Connection lost. Please try again.");
            stopSession();
          },
          onclose: (e: CloseEvent) => {
            if (e.code !== 1000) { // 1000 is normal closure
                setError("Session closed unexpectedly. Please reconnect.");
            }
            stopSession();
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {},
          inputAudioTranscription: {},
          systemInstruction: constructLiveSystemInstruction(voiceSettings),
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
        },
      });

      sessionRef.current = await sessionPromise;
      setIsConnecting(false);
      setIsSessionActive(true);

    } catch (error) {
      console.error('Failed to start session:', error);
      setError("Failed to start session. Check microphone permissions and network connection.");
      setIsConnecting(false);
      stopSession();
    }
  }, [isSessionActive, isConnecting, voiceSettings, isModelSpeaking]);

  const stopSession = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    
    scriptProcessorRef.current?.disconnect();
    scriptProcessorRef.current = null;
    
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    mediaStreamRef.current = null;

    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
        inputAudioContextRef.current.close();
    }
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
        outputAudioContextRef.current.close();
    }
    
    sourcesRef.current.forEach(source => source.stop());
    sourcesRef.current.clear();

    if (turnCompleteTimeoutRef.current) {
        clearTimeout(turnCompleteTimeoutRef.current);
        turnCompleteTimeoutRef.current = null;
    }

    setIsSessionActive(false);
    setIsConnecting(false);
    setIsModelSpeaking(false);
    setUserLiveInput('');
    setModelLiveOutput('');
    if (error === null) { // Don't clear history if we stopped due to an error
        setTranscriptionHistory([]);
    }
    currentInputTranscription.current = '';
    currentOutputTranscription.current = '';
    nextStartTimeRef.current = 0;
  }, [error]);

  const retryConnection = () => {
    stopSession();
    // Use a timeout to ensure all resources are cleaned up before restarting
    setTimeout(() => {
        setError(null);
        setTranscriptionHistory([]);
        startSession();
    }, 100);
  };

  const handleSaveSettings = (newSettings: VoiceSettings) => {
    setVoiceSettings(newSettings);
    localStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(newSettings));
    setIsSettingsOpen(false);
    if (isSessionActive) {
      stopSession();
      setTimeout(startSession, 100);
    }
  };

  const createBlob = (data: Float32Array): Blob => {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    return {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  }

  useEffect(() => {
    return () => {
      stopSession();
    };
  }, [stopSession]);
  
  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <header className="p-4 flex justify-between items-center bg-black/30 backdrop-blur-sm z-20">
        <button onClick={() => setActiveScreen(fromScreen)} className="p-2 rounded-full hover:bg-white/10">
          <ChevronLeftIcon className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold">Live Coach</h1>
        <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-full hover:bg-white/10">
            <Cog6ToothIcon className="w-6 h-6" />
        </button>
      </header>

      <main className="flex-grow relative">
        <ListeningScreen 
          isSessionActive={isSessionActive} 
          isModelSpeaking={isModelSpeaking}
          userInput={userLiveInput}
          modelOutput={modelLiveOutput}
          transcriptionHistory={transcriptionHistory}
          error={error}
          onRetry={retryConnection}
        />
      </main>

      <footer className="p-4 flex flex-col items-center justify-center bg-black/30 backdrop-blur-sm z-20">
         <p className="h-6 text-sm text-gray-400 mb-4">
            {error ? 'Session ended' : isConnecting ? 'Connecting...' : isSessionActive ? 'Live session is active...' : 'Start session to talk'}
         </p>
         <div className="flex items-center justify-center gap-6">
            <button 
                onClick={startSession}
                disabled={isSessionActive || isConnecting} 
                className={`p-5 rounded-full transition-all duration-300 ${isSessionActive || isConnecting ? 'bg-gray-600 cursor-not-allowed' : 'bg-[#1E90FF] hover:bg-blue-500 shadow-lg shadow-blue-500/50'}`}
            >
                <MicrophoneIcon className="w-8 h-8"/>
            </button>
            <button 
                onClick={stopSession}
                disabled={!isSessionActive && !isConnecting} 
                className={`p-5 rounded-full transition-all duration-300 ${!isSessionActive && !isConnecting ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-red-600/80 hover:bg-red-600 shadow-lg shadow-red-500/50'}`}
            >
                <XMarkIcon className="w-8 h-8"/>
            </button>
         </div>
      </footer>

      <VoiceSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={voiceSettings}
        onSave={handleSaveSettings}
      />
    </div>
  );
};

export default LiveCoachScreen;
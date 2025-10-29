import React, { useState, useEffect, useRef } from 'react';
import type { ChatMessage, VoiceSettings, Screen, UploadedMedia } from '../types';
import { generateContentStream, generateSpeechAndPlay } from '../services/geminiService';
import GlassmorphismCard from '../components/GlassmorphismCard';
import VoiceSettingsModal from '../components/VoiceSettingsModal';
import { MicrophoneIcon, SpeakerWaveIcon, SpeakerXMarkIcon, TrashIcon, Cog6ToothIcon, SatelliteDishIcon, PaperClipIcon, XMarkIcon, CpuChipIcon } from '../components/icons/Icons';

// Type definitions for Web Speech API (for voice input)
interface SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

const TypingIndicator: React.FC = () => (
    <div className="flex items-center space-x-1.5">
        <style>
        {`
            @keyframes bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-6px); }
            }
            .bounce-1 { animation: bounce 1s infinite; animation-delay: 0s; }
            .bounce-2 { animation: bounce 1s infinite; animation-delay: 0.2s; }
            .bounce-3 { animation: bounce 1s infinite; animation-delay: 0.4s; }
        `}
        </style>
        <div className="w-2 h-2 bg-gray-400 rounded-full bounce-1"></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full bounce-2"></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full bounce-3"></div>
    </div>
);


const ChatScreen: React.FC<{setActiveScreen: (screen: Screen) => void, addEditedImage: (url: string) => void}> = ({ setActiveScreen, addEditedImage }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaToUpload, setMediaToUpload] = useState<UploadedMedia[]>([]);
  const [isThinkingMode, setIsThinkingMode] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const [speechRecognitionSupported, setSpeechRecognitionSupported] = useState(false);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    character: 'NoxzAI',
    tone: 'Normal',
    intensity: 1,
    vocalizations: [],
  });
  const CHAT_HISTORY_KEY = 'noxz_chat_history';
  const VOICE_SETTINGS_KEY = 'noxz_voice_settings';


  // Load chat history and settings from localStorage on initial render
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSpeechRecognitionSupported(!!SpeechRecognition);

    const savedSettings = localStorage.getItem(VOICE_SETTINGS_KEY);
    if(savedSettings) {
      setVoiceSettings(JSON.parse(savedSettings));
    }

    const savedHistory = localStorage.getItem(CHAT_HISTORY_KEY);
    if (savedHistory) {
      setMessages(JSON.parse(savedHistory));
    } else {
      const initialMessage = 'Hey there! I am NoxzAI. How can I help you with your photos or your day? You can attach a photo or video and ask me to edit or analyze it!';
      const initialMessages: ChatMessage[] = [{ role: 'model', text: initialMessage }];
      setMessages(initialMessages);
      generateSpeechAndPlay(initialMessage, voiceSettings);
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(initialMessages));
    }
    
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true; // Get interim results
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = 0; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setInput(finalTranscript + interimTranscript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
    };
    
    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;

  }, []);

  // Scroll to bottom and save history when messages change (with debouncing)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    
    if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(() => {
        if (messages.length > 0) {
            localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
        }
    }, 500); // Debounce save by 500ms

    return () => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
    };
  }, [messages]);

  const handleSend = async () => {
    if ((!input.trim() && mediaToUpload.length === 0) || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', text: input, attachedMedia: mediaToUpload };
    
    const currentInput = input;
    const currentMedia = mediaToUpload;
    setInput('');
    setMediaToUpload([]);
    setIsLoading(true);
    
    // Add user message and an empty model message placeholder
    setMessages(prev => [...prev, userMessage, { role: 'model', text: '' }]);

    try {
        const stream = await generateContentStream(currentInput, currentMedia, isThinkingMode);
        let modelResponseText = '';
        let modelImageUrl: string | undefined = undefined;

        for await (const chunk of stream) {
            const chunkText = chunk.text;
            modelResponseText += chunkText;

            const imagePart = chunk.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.mimeType.startsWith('image/'));
            if (imagePart?.inlineData) {
                const base64 = imagePart.inlineData.data;
                modelImageUrl = `data:${imagePart.inlineData.mimeType};base64,${base64}`;
            }

            // Update the last message (the model's placeholder) in the stream
            setMessages(prev => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage) {
                    lastMessage.text = modelResponseText;
                    if(modelImageUrl) lastMessage.imageUrl = modelImageUrl;
                }
                return newMessages;
            });
        }

        if (modelImageUrl) {
            addEditedImage(modelImageUrl);
        }

        // FIX: Only generate speech if not muted. Use a default message if an image was generated without text.
        if (!isMuted) {
            const textToSpeak = modelResponseText.trim() || (modelImageUrl ? "Here is your edited image!" : "");
            if (textToSpeak) {
               await generateSpeechAndPlay(textToSpeak, voiceSettings);
            }
        }

    } catch (error) {
      console.error('Error handling send:', error);
      const errorMessage = 'Sorry, something went wrong. The file might be too large or in an unsupported format. Please try again.';
      setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage.role === 'model') {
              lastMessage.text = errorMessage;
          }
          return newMessages;
        });
      if (!isMuted) await generateSpeechAndPlay(errorMessage, voiceSettings);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleMicMouseDown = () => {
    if (!recognitionRef.current || !speechRecognitionSupported) return;
    setIsRecording(true);
    recognitionRef.current.start();
  };
  
  const handleMicMouseUp = () => {
    if (!recognitionRef.current || !speechRecognitionSupported) return;
    setIsRecording(false);
    recognitionRef.current.stop();
  };

  const handleClearHistory = () => {
      localStorage.removeItem(CHAT_HISTORY_KEY);
      const initialMessage = 'History cleared! How can I help you?';
      const newMessages: ChatMessage[] = [{ role: 'model', text: initialMessage }];
      setMessages(newMessages);
      generateSpeechAndPlay(initialMessage, voiceSettings);
  }
  
  const handleSaveSettings = (newSettings: VoiceSettings) => {
    setVoiceSettings(newSettings);
    localStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(newSettings));
    setIsSettingsOpen(false);
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
        const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB
        const files = Array.from(event.target.files);

        // FIX: Explicitly type `file` as `File` to fix properties `size` and `name` not being found.
        const validFiles = files.filter((file: File) => {
            if (file.size > MAX_FILE_SIZE_BYTES) {
                alert(`File "${file.name}" is too large (max 20MB) and will be ignored.`);
                return false;
            }
            return true;
        });

        const uploadedMedia: UploadedMedia[] = validFiles.map((file: File) => ({
            file,
            previewUrl: URL.createObjectURL(file),
            type: file.type.startsWith('video/') ? 'video' : 'image',
        }));
        setMediaToUpload(prev => [...prev, ...uploadedMedia].slice(0, 5)); // Limit to 5 files
    }
  };
  
  const removeMedia = (index: number) => {
    setMediaToUpload(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col h-screen pt-12 pb-24">
       <div className="px-4 mb-4 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-center">AI Assistant</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsThinkingMode(!isThinkingMode)} title="Toggle Thinking Mode" className={`p-2 rounded-full transition-colors duration-200 ${isThinkingMode ? 'bg-[#1E90FF]' : 'bg-white/10 hover:bg-white/20'}`}>
            <CpuChipIcon className="w-6 h-6" />
          </button>
          <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-full bg-white/10 hover:bg-white/20">
            <Cog6ToothIcon className="w-6 h-6" />
          </button>
          <button onClick={handleClearHistory} className="p-2 rounded-full bg-white/10 hover:bg-white/20">
            <TrashIcon className="w-6 h-6" />
          </button>
          <button onClick={() => setIsMuted(!isMuted)} className="p-2 rounded-full bg-white/10 hover:bg-white/20">
            {isMuted ? <SpeakerXMarkIcon className="w-6 h-6" /> : <SpeakerWaveIcon className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <VoiceSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={voiceSettings}
        onSave={handleSaveSettings}
      />

      <div className="flex-grow overflow-y-auto px-4 space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl ${msg.role === 'user' ? 'bg-[#1E90FF] rounded-br-none' : 'bg-white/10 rounded-bl-none'}`}>
              {msg.attachedMedia && msg.attachedMedia.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {msg.attachedMedia.map((media, i) => (
                    <div key={i} className="relative w-24 h-24">
                      {media.type === 'image' ? (
                        <img src={media.previewUrl} alt="user upload" className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <video src={media.previewUrl} className="w-full h-full object-cover rounded-lg" />
                      )}
                    </div>
                  ))}
                </div>
              )}
              {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
              {msg.imageUrl && (
                <img src={msg.imageUrl} alt="AI generated content" className="mt-2 rounded-lg" />
              )}
               {/* Show typing indicator only in the last, empty, loading model message */}
              {isLoading && index === messages.length - 1 && !msg.text && !msg.imageUrl && <TypingIndicator />}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 bg-black/30 backdrop-blur-lg fixed bottom-20 left-0 right-0">
         {mediaToUpload.length > 0 && (
          <div className="pb-2 flex items-center space-x-2 overflow-x-auto max-w-lg mx-auto">
            {mediaToUpload.map((media, index) => (
              <div key={index} className="relative flex-shrink-0">
                 {media.type === 'image' ? (
                    <img src={media.previewUrl} className="w-16 h-16 object-cover rounded-md" />
                 ) : (
                    <video src={media.previewUrl} className="w-16 h-16 object-cover rounded-md" />
                 )}
                <button
                  onClick={() => removeMedia(index)}
                  className="absolute -top-1 -right-1 bg-gray-800/80 rounded-full p-0.5 text-white"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center space-x-2 max-w-lg mx-auto">
          <button
            onClick={() => setActiveScreen('liveCoach')}
            disabled={isLoading}
            className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors duration-200"
            aria-label="Start Live AI session"
          >
            <SatelliteDishIcon className="w-6 h-6 text-[#1E90FF]" />
          </button>
           <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors duration-200"
            aria-label="Attach file"
          >
            <PaperClipIcon className="w-6 h-6" />
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept="image/*,video/*" className="hidden" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask or give an edit instruction..."
            className="flex-grow bg-white/10 border border-white/20 rounded-full px-5 py-3 focus:outline-none focus:ring-2 focus:ring-[#1E90FF]"
            disabled={isLoading}
          />
          {speechRecognitionSupported && (
            <button 
              onMouseDown={handleMicMouseDown}
              onMouseUp={handleMicMouseUp}
              onTouchStart={handleMicMouseDown}
              onTouchEnd={handleMicMouseUp}
              disabled={isLoading} 
              className={`p-3 rounded-full transition-colors duration-200 ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-white/10 hover:bg-white/20'}`}
            >
                <MicrophoneIcon className="w-6 h-6" />
            </button>
          )}
          <button onClick={handleSend} disabled={isLoading || (!input.trim() && mediaToUpload.length === 0)} className="bg-[#1E90FF] hover:bg-blue-600 disabled:bg-gray-600 rounded-full p-3 transition-colors duration-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatScreen;
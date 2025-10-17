import React, { useState, useEffect, useRef } from 'react';
import type { ChatMessage } from '../types';
import { getChatResponseStream, startChat, generateSpeechFromText } from '../services/geminiService';
import { playBase64Audio } from '../utils/audioPlayer';
import GlassmorphismCard from '../components/GlassmorphismCard';
// FIX: Corrected icon imports from the new Icons.tsx file.
import { MicrophoneIcon, SpeakerWaveIcon, SpeakerXMarkIcon, TrashIcon } from '../components/icons/Icons';

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


const ChatScreen: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [speechRecognitionSupported, setSpeechRecognitionSupported] = useState(false);
  const CHAT_HISTORY_KEY = 'noxz_chat_history';

  // Load chat history from localStorage on initial render
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSpeechRecognitionSupported(!!SpeechRecognition);
    
    startChat();

    const savedHistory = localStorage.getItem(CHAT_HISTORY_KEY);
    if (savedHistory) {
      setMessages(JSON.parse(savedHistory));
    } else {
      const initialMessage = 'Hey there! I am NoxzAI. How can I help you with your photos or your day?';
      // FIX: Explicitly type initialMessages as ChatMessage[] to prevent type inference errors.
      const initialMessages: ChatMessage[] = [{ role: 'model', text: initialMessage }];
      setMessages(initialMessages);
      speak(initialMessage);
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(initialMessages));
    }
    
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

  }, []);

  // Scroll to bottom and save history when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if(messages.length > 0) {
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  const speak = async (text: string) => {
    if (isMuted || !text.trim()) return;
    
    try {
      const base64Audio = await generateSpeechFromText(text);
      await playBase64Audio(base64Audio);
    } catch (e) {
      console.error("Failed to generate or play speech:", e);
    }
  };


  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const stream = await getChatResponseStream(input);
      let modelResponse = '';
      setMessages(prev => [...prev, { role: 'model', text: '' }]);

      for await (const chunk of stream) {
        modelResponse += chunk.text;
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { role: 'model', text: modelResponse };
          return newMessages;
        });
      }
      await speak(modelResponse);

    } catch (error) {
      console.error('Error getting chat response:', error);
      const errorMessage = 'Sorry, something went wrong. Please try again.';
      setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { role: 'model', text: errorMessage };
          return newMessages;
        });
      await speak(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleMicClick = () => {
    if (!recognitionRef.current || !speechRecognitionSupported) return;
    
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
    setIsListening(!isListening);
  };
  
  const handleClearHistory = () => {
      localStorage.removeItem(CHAT_HISTORY_KEY);
      const initialMessage = 'History cleared! How can I help you?';
      // FIX: Explicitly type newMessages as ChatMessage[] to prevent type inference errors.
      const newMessages: ChatMessage[] = [{ role: 'model', text: initialMessage }];
      setMessages(newMessages);
      speak(initialMessage);
  }

  return (
    <div className="flex flex-col h-screen pt-12 pb-24">
       <div className="px-4 mb-4 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-center">AI Chat Assistant</h1>
        <div className="flex items-center gap-2">
          <button onClick={handleClearHistory} className="p-2 rounded-full bg-white/10 hover:bg-white/20">
            {/* FIX: Added className for styling. */}
            <TrashIcon className="w-6 h-6" />
          </button>
          <button onClick={() => setIsMuted(!isMuted)} className="p-2 rounded-full bg-white/10 hover:bg-white/20">
            {/* FIX: Added className for styling. */}
            {isMuted ? <SpeakerXMarkIcon className="w-6 h-6" /> : <SpeakerWaveIcon className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto px-4 space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl ${msg.role === 'user' ? 'bg-[#1E90FF] rounded-br-none' : 'bg-white/10 rounded-bl-none'}`}>
              <p className="whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        {isLoading && (messages.length === 0 || messages[messages.length - 1]?.role !== 'model' || messages[messages.length - 1]?.text === '') && (
           <div className="flex justify-start">
             <GlassmorphismCard className="px-4 py-3 rounded-2xl rounded-bl-none">
                <TypingIndicator />
            </GlassmorphismCard>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 bg-black/30 backdrop-blur-lg fixed bottom-20 left-0 right-0">
        <div className="flex items-center space-x-2 max-w-lg mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask me anything..."
            className="flex-grow bg-white/10 border border-white/20 rounded-full px-5 py-3 focus:outline-none focus:ring-2 focus:ring-[#1E90FF]"
            disabled={isLoading}
          />
          {speechRecognitionSupported && (
            <button 
              onClick={handleMicClick} 
              disabled={isLoading} 
              className={`p-3 rounded-full transition-colors duration-200 ${isListening ? 'bg-red-500 animate-pulse' : 'bg-white/10 hover:bg-white/20'}`}
            >
                {/* FIX: Added className for styling. */}
                <MicrophoneIcon className="w-6 h-6" />
            </button>
          )}
          <button onClick={handleSend} disabled={isLoading || !input.trim()} className="bg-[#1E90FF] hover:bg-blue-600 disabled:bg-gray-600 rounded-full p-3 transition-colors duration-200">
            {/* FIX: Corrected the viewBox attribute from "0 0 24" 24" to "0 0 24 24" */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatScreen;

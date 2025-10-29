import React, { useRef, useEffect } from 'react';
import './listening-animation.css';

interface ChatHistoryItem {
  id: number;
  text: string;
  type: 'user' | 'model';
}
interface ListeningScreenProps {
  isSessionActive: boolean;
  isModelSpeaking: boolean;
  userInput: string;
  modelOutput: string;
  transcriptionHistory: ChatHistoryItem[];
  error: string | null;
  onRetry: () => void;
}

const ListeningScreen: React.FC<ListeningScreenProps> = ({ 
  isSessionActive, 
  isModelSpeaking,
  userInput,
  modelOutput,
  transcriptionHistory,
  error,
  onRetry
}) => {
  const historyEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcriptionHistory]);


  return (
    <div className={`listening-container ${isSessionActive ? 'active' : ''}`}>
      <div className="sunbeam"></div>
      <div className={`particles ${isModelSpeaking ? 'speaking' : ''}`}>
        {[...Array(20)].map((_, i) => <div key={i} className="particle"></div>)}
      </div>

      {error && (
        <div className="error-overlay">
          <div className="error-card">
            <h3 className="error-title">Connection Error</h3>
            <p className="error-message">{error}</p>
            <button onClick={onRetry} className="retry-button">
              Retry
            </button>
          </div>
        </div>
      )}

      <div className="chat-history-container">
        {transcriptionHistory.map((message) => (
          <div
            key={message.id}
            className={`speech-bubble ${message.type === 'user' ? 'user-speech' : 'model-speech'}`}
          >
            {message.text}
          </div>
        ))}
        <div ref={historyEndRef} />
      </div>

      <div className="character-container">
        <div className={`character ${isSessionActive ? 'breathing' : ''} ${isModelSpeaking ? 'speaking' : ''}`}>
          <div className="character-shadow"></div>
          <div className="character-body">
            <div className="hair-back"></div>
            <div className="torso">
                <div className="neck"></div>
                <div className="shirt">
                    <div className="shirt-strap-left"></div>
                    <div className="shirt-strap-right"></div>
                </div>
            </div>
            <div className="head">
                <div className="hair-main">
                    <div className="bangs"></div>
                </div>
                <div className="face">
                    <div className="eye left">
                        <div className="pupil"></div>
                        <div className="eyelid"></div>
                    </div>
                    <div className="eye right">
                        <div className="pupil"></div>
                        <div className="eyelid"></div>
                    </div>
                    <div className="mouth"></div>
                </div>
            </div>
          </div>
        </div>
      </div>
        
      <div className="transcription-ui">
        <div className={`speech-bubble model-speech ${modelOutput ? 'visible' : ''}`}>
          {modelOutput || '...'}
        </div>
        <div className={`speech-bubble user-speech ${userInput ? 'visible' : ''}`}>
           {userInput || '...'}
        </div>
      </div>

    </div>
  );
};

export default ListeningScreen;
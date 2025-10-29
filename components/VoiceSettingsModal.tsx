
import React, { useState, useEffect } from 'react';
import type { VoiceSettings, VocalizationType } from '../types';
import GlassmorphismCard from './GlassmorphismCard';

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: VoiceSettings;
  onSave: (settings: VoiceSettings) => void;
}

const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [localSettings, setLocalSettings] = useState<VoiceSettings>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleVocalizationChange = (vocalization: VocalizationType) => {
    const currentVocalizations = localSettings.vocalizations;
    const newVocalizations = currentVocalizations.includes(vocalization)
      ? currentVocalizations.filter(v => v !== vocalization)
      : [...currentVocalizations, vocalization];
    setLocalSettings(prev => ({ ...prev, vocalizations: newVocalizations }));
  };

  const handleSave = () => {
    onSave(localSettings);
  };

  const characters: VoiceSettings['character'][] = ['NoxzAI', 'Nisha', 'Aniket'];
  const tones: VoiceSettings['tone'][] = ['Normal', 'Flirty', 'Angry', 'Supportive', 'Sweet', 'Sad', 'Happy', 'Energetic', 'Calm', 'Professional', 'Romantic', 'Elegant', 'Anime Character'];
  const vocalizationOptions: { id: VocalizationType; label: string }[] = [
    { id: 'pleasure', label: 'Vocalization of Pleasure' },
    { id: 'spoony', label: 'Make it more Spoony' },
    { id: 'breath', label: 'Add Human-like Breath' },
    { id: 'au_sounds', label: 'Add "A/U" Sounds' },
  ];

  return (
    <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md">
        <GlassmorphismCard className="w-full">
          <h2 className="text-2xl font-bold mb-6 text-center">AI Voice Settings</h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Character</label>
              <select
                value={localSettings.character}
                onChange={(e) => setLocalSettings(p => ({ ...p, character: e.target.value as VoiceSettings['character'] }))}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1E90FF]"
              >
                {characters.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Tone / Emotion</label>
              <select
                value={localSettings.tone}
                onChange={(e) => setLocalSettings(p => ({ ...p, tone: e.target.value as VoiceSettings['tone'] }))}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1E90FF]"
              >
                {tones.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Emotional Intensity: <span className="font-bold text-[#1E90FF]">{localSettings.intensity.toFixed(1)}x</span>
                </label>
                <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.1"
                    value={localSettings.intensity}
                    onChange={(e) => setLocalSettings(p => ({...p, intensity: parseFloat(e.target.value)}))}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#1E90FF]"
                />
            </div>

             <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Additional Vocalizations</label>
                <div className="space-y-2">
                    {vocalizationOptions.map(option => (
                        <label key={option.id} className="flex items-center space-x-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={localSettings.vocalizations.includes(option.id)}
                                onChange={() => handleVocalizationChange(option.id)}
                                className="h-5 w-5 rounded border-gray-300 text-[#1E90FF] bg-white/10 focus:ring-[#1E90FF]"
                            />
                            <span className="text-white">{option.label}</span>
                        </label>
                    ))}
                </div>
            </div>
          </div>
          
          <div className="mt-8 flex justify-end gap-4">
            <button 
                onClick={onClose} 
                className="bg-white/10 hover:bg-white/20 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200"
            >
              Cancel
            </button>
            <button 
                onClick={handleSave} 
                className="bg-[#1E90FF] hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200"
            >
              Save
            </button>
          </div>
        </GlassmorphismCard>
      </div>
    </div>
  );
};

export default VoiceSettingsModal;

export type Screen = 'home' | 'chat' | 'coach' | 'profile' | 'liveCoach';

export interface UploadedMedia {
  file: File;
  previewUrl: string;
  type: 'image' | 'video';
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  imageUrl?: string;
  attachedMedia?: UploadedMedia[];
}

export interface Task {
  id: string;
  name: string;
  details: string;
  duration?: number; // in minutes for Pomodoro
  reps?: number;
  xp: number;
}

export interface Schedule {
  id: string;
  name: string;
  tasks: Task[];
}

export type VocalizationType = 'pleasure' | 'au_sounds' | 'spoony' | 'breath';

export interface VoiceSettings {
  character: 'NoxzAI' | 'Nisha' | 'Aniket';
  tone: 'Normal' | 'Flirty' | 'Angry' | 'Supportive' | 'Sweet' | 'Sad' | 'Happy' | 'Energetic' | 'Calm' | 'Professional' | 'Romantic' | 'Elegant' | 'Anime Character';
  intensity: number;
  vocalizations: VocalizationType[];
}
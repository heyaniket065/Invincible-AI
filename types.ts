
export type Screen = 'home' | 'editor' | 'chat' | 'coach' | 'profile';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
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

export interface UploadedImage {
  file: File;
  previewUrl: string;
}

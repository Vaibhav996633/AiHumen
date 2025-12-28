
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export enum AssistantState {
  IDLE = 'IDLE',
  LISTENING = 'LISTENING',
  THINKING = 'THINKING',
  SPEAKING = 'SPEAKING',
}

export type Emotion = 'NEUTRAL' | 'HAPPY' | 'SAD' | 'SURPRISED' | 'THINKING';
export type Gender = 'FEMALE' | 'MALE';

export interface UserSettings {
  userName: string;
  preferredLanguage: string;
  voiceName: 'Zephyr' | 'Puck' | 'Charon' | 'Kore' | 'Fenrir';
  gender: Gender;
}

export interface TranscriptionItem {
  text: string;
  type: 'input' | 'output';
}

export interface AssistantTask {
  id: string;
  type: 'ALARM' | 'CALL' | 'APP' | 'MEMORY';
  description: string;
  status: 'PENDING' | 'COMPLETED';
}

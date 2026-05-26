export interface SessionMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  hasScreenshot?: boolean;
}

export interface AnalyzeRequest {
  screenshot_base64: string;
  question?: string;
  session_history?: Array<{ role: string; content: string }>;
}

export interface AnalyzeResponse {
  success: boolean;
  answer: string;
  model: string;
  tokens_used?: number;
}

export interface ChatRequest {
  message: string;
  session_history?: Array<{ role: string; content: string }>;
}

export interface ChatResponse {
  success: boolean;
  answer: string;
  model: string;
}

export type AppStatus = 'idle' | 'capturing' | 'analyzing' | 'ready' | 'error';

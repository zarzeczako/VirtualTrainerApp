export interface ChatResponse {
  text: string;
  buttons: string[];
  sessionId?: string;
}

export interface DialogflowConfig {
  projectId: string;
  languageCode: string;
  keyFilename?: string;
  clientEmail?: string;
  privateKey?: string;
}

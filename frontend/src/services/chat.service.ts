import http from './http.ts';

export interface ChatRequestPayload {
  text: string;
  sessionId?: string;
}

export interface ChatResponsePayload {
  text: string;
  buttons: string[];
}

class ChatService {
  async sendMessage(payload: ChatRequestPayload): Promise<ChatResponsePayload> {
    const response = await http.post('/chat', payload);
    return response.data as ChatResponsePayload;
  }
}

export const chatService = new ChatService();

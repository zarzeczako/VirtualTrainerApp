import { Body, Controller, Post } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatRequestDto } from './dto/chat-request.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  handleMessage(@Body() body: ChatRequestDto) {
    return this.chatService.sendMessage(body.text, body.sessionId);
  }
}

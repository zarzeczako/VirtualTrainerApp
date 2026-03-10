import { Controller, Post, Body, HttpCode, Logger } from '@nestjs/common';
// Usuwamy import DialogflowResponse
import { DialogflowService } from './dialogflow.service';

@Controller('dialogflow')
export class DialogflowController {
  private readonly logger = new Logger(DialogflowController.name);

  constructor(private readonly dialogflowService: DialogflowService) {}

  @Post('webhook')
  @HttpCode(200) // Zmieniamy Promise<DialogflowResponse> na Promise<any>
  async handleWebhook(@Body() body: any): Promise<any> {
    // <-- POPRAWKA TUTAJ
    this.logger.log('--- Otrzymano zapytanie Webhook od Dialogflow ---');
    this.logger.debug(JSON.stringify(body, null, 2));
    try {
      // Ta linia zostaje bez zmian, ale teraz zwróci pełny obiekt JSON
      const response = await this.dialogflowService.routeIntent(body);

      // Logujemy tylko fragment odpowiedzi tekstowej, jeśli istnieje
      if (response.fulfillmentText) {
        this.logger.log(
          `[Webhook] Wysyłanie odpowiedzi: ${response.fulfillmentText.substring(0, 50)}...`,
        );
      } else {
        this.logger.log(
          `[Webhook] Wysyłanie złożonej odpowiedzi (np. Quick Replies)`,
        );
      }
      return response;
    } catch (error) {
      this.logger.error('Błąd podczas przetwarzania webhooka:', error);
      // Zmieniamy typ odpowiedzi błędu
      const errorResponse = {
        // <-- POPRAWKA TUTAJ (usunięty typ)
        fulfillmentText:
          'Wystąpił wewnętrzny błąd w moim backendzie. Spróbuj ponownie za chwilę.',
      };
      return errorResponse;
    }
  }
}

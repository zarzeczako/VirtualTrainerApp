import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { protos, SessionsClient } from '@google-cloud/dialogflow';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ChatResponse } from './interfaces/chat.interface';

const DEFAULT_LANGUAGE = 'pl';
const FALLBACK_RESPONSE =
  'Niestety nie mam teraz gotowej odpowiedzi. Spróbuj sformułować pytanie inaczej.';

type SessionClientConfig = ConstructorParameters<typeof SessionsClient>[0];

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly projectId: string;
  private readonly languageCode: string;
  private readonly sessionClient: SessionsClient;

  constructor(private readonly configService: ConfigService) {
    this.projectId = this.configService.get<string>('DIALOGFLOW_PROJECT_ID') ?? '';
    if (!this.projectId) {
      throw new Error('DIALOGFLOW_PROJECT_ID is not configured.');
    }

    this.languageCode =
      this.configService.get<string>('DIALOGFLOW_LANGUAGE_CODE') ?? DEFAULT_LANGUAGE;

    this.sessionClient = new SessionsClient(this.buildClientOptions());
  }

  async sendMessage(text: string, sessionId?: string): Promise<ChatResponse> {
    const activeSessionId = sessionId || randomUUID();
    const sessionPath = this.sessionClient.projectAgentSessionPath(
      this.projectId,
      activeSessionId,
    );

    const request: protos.google.cloud.dialogflow.v2.IDetectIntentRequest = {
      session: sessionPath,
      queryInput: {
        text: {
          text,
          languageCode: this.languageCode,
        },
      },
    };

    try {
      const [response] = await this.sessionClient.detectIntent(request);
      const queryResult = response.queryResult;
      const messageText = this.extractText(queryResult) || FALLBACK_RESPONSE;
      const buttons = this.extractButtons(queryResult);

      return {
        text: messageText,
        buttons,
      };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Dialogflow detectIntent failed: ${error.message}`, error.stack);
      } else {
        this.logger.error('Dialogflow detectIntent failed due to unknown error.');
      }
      throw new InternalServerErrorException('Nie udało się połączyć z asystentem.');
    }
  }

  private buildClientOptions(): SessionClientConfig {
    const keyFilename =
      this.configService.get<string>('DIALOGFLOW_KEY_FILE') ||
      this.configService.get<string>('GOOGLE_APPLICATION_CREDENTIALS') ||
      this.resolveBundledKeyFile();

    if (keyFilename) {
      return { keyFilename };
    }

    const clientEmail = this.configService.get<string>('DIALOGFLOW_CLIENT_EMAIL');
    const privateKey = this.configService.get<string>('DIALOGFLOW_PRIVATE_KEY');

    if (clientEmail && privateKey) {
      return {
        credentials: {
          client_email: clientEmail,
          private_key: privateKey.replace(/\\n/g, '\n'),
        },
      };
    }

    this.logger.warn('Using default Google Application Credentials context for Dialogflow.');
    return {};
  }

  private resolveBundledKeyFile(): string | undefined {
    const bundledPath = join(process.cwd(), 'google-credentiols-dialogflow.json');
    if (existsSync(bundledPath)) {
      return bundledPath;
    }
    return undefined;
  }

  private extractText(
    queryResult?: protos.google.cloud.dialogflow.v2.IQueryResult | null,
  ): string {
    if (!queryResult) {
      return '';
    }

    if (queryResult.fulfillmentText && queryResult.fulfillmentText.trim().length > 0) {
      return queryResult.fulfillmentText.trim();
    }

    const texts =
      queryResult.fulfillmentMessages?.flatMap((message) => message.text?.text ?? []) ?? [];
    const fallback = texts.find((entry) => entry && entry.trim().length > 0);

    return fallback?.trim() ?? '';
  }

  private extractButtons(
    queryResult?: protos.google.cloud.dialogflow.v2.IQueryResult | null,
  ): string[] {
    if (!queryResult?.fulfillmentMessages?.length) {
      return [];
    }

    const quickReplyValues: string[] = [];
    queryResult.fulfillmentMessages.forEach((message) => {
      message.quickReplies?.quickReplies?.forEach((reply) => {
        const trimmed = reply?.trim();
        if (trimmed) {
          quickReplyValues.push(trimmed);
        }
      });
    });

    return Array.from(new Set(quickReplyValues));
  }
}

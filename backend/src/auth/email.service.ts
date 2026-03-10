import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
      tls: {
        rejectUnauthorized: false, // Accept self-signed certificates (for development)
      },
    });
  }

  async sendPasswordResetEmail(
    to: string,
    resetToken: string,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: `"Wirtualny Trener" <${this.configService.get<string>('SMTP_USER')}>`,
      to,
      subject: 'Resetowanie hasła - Wirtualny Trener',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { color: white; margin: 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏋️ Wirtualny Trener</h1>
            </div>
            <div class="content">
              <h2>Resetowanie hasła</h2>
              <p>Otrzymałeś tę wiadomość, ponieważ poprosiłeś o zresetowanie hasła do swojego konta.</p>
              <p>Kliknij poniższy przycisk, aby ustawić nowe hasło:</p>
              <a href="${resetUrl}" class="button">Resetuj hasło</a>
              <p>Lub skopiuj i wklej poniższy link do przeglądarki:</p>
              <p style="background: white; padding: 10px; border-radius: 5px; word-break: break-all;">
                ${resetUrl}
              </p>
              <p><strong>Link jest ważny przez 1 godzinę.</strong></p>
              <p>Jeśli nie prosiłeś o zresetowanie hasła, zignoruj tę wiadomość.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Wirtualny Trener. Wszystkie prawa zastrzeżone.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Resetowanie hasła - Wirtualny Trener

Otrzymałeś tę wiadomość, ponieważ poprosiłeś o zresetowanie hasła do swojego konta.

Kliknij poniższy link, aby ustawić nowe hasło:
${resetUrl}

Link jest ważny przez 1 godzinę.

Jeśli nie prosiłeś o zresetowanie hasła, zignoruj tę wiadomość.

© ${new Date().getFullYear()} Wirtualny Trener
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email resetowania hasła wysłany do: ${to}`);
    } catch (error) {
      console.error('❌ Błąd wysyłki emaila:', error);
      throw new Error('Failed to send password reset email');
    }
  }
}

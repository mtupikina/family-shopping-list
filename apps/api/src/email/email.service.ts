import { Resend } from 'resend';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    this.resend = apiKey ? new Resend(apiKey) : null;
  }

  async sendMagicLink(email: string, token: string): Promise<void> {
    const appWebUrl = this.config.get<string>('APP_WEB_URL', 'http://localhost:4200');
    const link = `${appWebUrl.replace(/\/$/, '')}/auth/verify?token=${token}`;

    if (!this.resend) {
      this.logger.log(`Magic link for ${email}: ${link}`);
      return;
    }

    const from = this.config.get<string>('EMAIL_FROM', 'Family List <onboarding@resend.dev>');

    await this.resend.emails.send({
      from,
      to: email,
      subject: 'Sign in to Family Shopping List',
      html: `<p>Click the link below to sign in:</p><p><a href="${link}">${link}</a></p><p>This link expires in 15 minutes.</p>`,
    });
  }
}

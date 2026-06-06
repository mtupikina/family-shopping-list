import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface ParsedSender {
  name: string;
  email: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey: string | undefined;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('BREVO_API_KEY');
  }

  async sendMagicLink(email: string, token: string): Promise<void> {
    const appWebUrl = this.config.get<string>('APP_WEB_URL', 'http://localhost:4200');
    const link = `${appWebUrl.replace(/\/$/, '')}/auth/verify?token=${token}`;

    if (!this.apiKey) {
      this.logger.log(`Magic link for ${email}: ${link}`);
      return;
    }

    await this.sendEmail(
      email,
      'Sign in to Family Shopping List',
      `<p>Click the link below to sign in:</p><p><a href="${link}">${link}</a></p><p>This link expires in 15 minutes.</p>`,
      `Magic link for ${email}: ${link}`,
    );
  }

  async sendFamilyInvite(email: string, token: string, familyName: string): Promise<void> {
    const appWebUrl = this.config.get<string>('APP_WEB_URL', 'http://localhost:4200');
    const link = `${appWebUrl.replace(/\/$/, '')}/join?token=${token}`;

    if (!this.apiKey) {
      this.logger.log(`Family invite for ${email} (${familyName}): ${link}`);
      return;
    }

    await this.sendEmail(
      email,
      `Join ${familyName} on Family Shopping List`,
      `<p>You have been invited to join <strong>${familyName}</strong>.</p><p><a href="${link}">Accept invitation</a></p><p>This invitation expires in 7 days.</p>`,
      `Family invite for ${email} (${familyName}): ${link}`,
    );
  }

  private async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
    fallbackLogMessage: string,
  ): Promise<void> {
    const sender = this.parseSender(
      this.config.get<string>('EMAIL_FROM', 'Family Shopping List <you@example.com>'),
    );

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': this.apiKey!,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: sender.name, email: sender.email },
        to: [{ email: to }],
        subject,
        htmlContent,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      this.logger.error(`Failed to send email to ${to}: ${detail}`);
      this.logger.log(fallbackLogMessage);
      throw new InternalServerErrorException('Could not send email');
    }
  }

  private parseSender(value: string): ParsedSender {
    const match = value.match(/^(.+?)\s*<([^>]+)>$/);

    if (match) {
      return { name: match[1].trim(), email: match[2].trim() };
    }

    return { name: 'Family Shopping List', email: value.trim() };
  }
}

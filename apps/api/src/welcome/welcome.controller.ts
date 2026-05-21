import { Controller, Get } from '@nestjs/common';

@Controller('api')
export class WelcomeController {
  @Get('get-welcome-message')
  getWelcomeMessage(): { message: string } {
    return { message: 'BE is welcoming you to the family shopping list' };
  }
}

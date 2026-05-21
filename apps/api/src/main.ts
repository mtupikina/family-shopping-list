import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.ALLOWED_ORIGIN || 'http://localhost:4200',
    methods: ['GET'],
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`API running on port ${port}`);
}

bootstrap();

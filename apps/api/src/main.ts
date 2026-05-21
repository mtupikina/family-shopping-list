import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const allowedOrigin = (process.env.ALLOWED_ORIGIN || 'http://localhost:4200').replace(/\/$/, '');
  app.enableCors({
    origin: allowedOrigin,
    methods: ['GET'],
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`API running on port ${port}`);
}

bootstrap();

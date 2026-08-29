import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // El frontend (Next.js) corre en el 3000, la API en el 3001.
  app.enableCors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:3000' });

  await app.listen(process.env.PORT ?? 3001);
}
await bootstrap();

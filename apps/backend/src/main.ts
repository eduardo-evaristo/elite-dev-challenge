import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());

  const rawOrigins = process.env.CORS_ORIGINS;
  if (!rawOrigins) {
    throw new Error(
      'CORS_ORIGINS env var is required (comma-separated origins)',
    );
  }
  const corsOrigins = rawOrigins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (corsOrigins.length === 0) {
    throw new Error('CORS_ORIGINS must contain at least one origin');
  }
  app.enableCors({ origin: corsOrigins, credentials: true });

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

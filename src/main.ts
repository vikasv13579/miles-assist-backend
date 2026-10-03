import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

import { Request, Response, NextFunction } from 'express';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter.js';

async function startApp() {
  console.log('--- STARTUP CHECK ---');
  console.log('DATABASE_URL is set:', !!process.env.DATABASE_URL);
  
  const app = await NestFactory.create(AppModule);
  // Fix for helmet typings in strict NodeNext module resolution
  const helmetMiddleware = (helmet as any).default ? (helmet as any).default() : (helmet as any)();
  app.use(helmetMiddleware);

  // Global HTTP Request Logger
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    });
    next();
  });

  app.enableCors({ origin: process.env.CORS_ORIGIN || '*' });
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  app.useGlobalFilters(new GlobalExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('Admin Dashboard API')
    .setDescription('API for Admin Dashboard')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT || 3001);
}
startApp();

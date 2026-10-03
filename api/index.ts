import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.factory.js';
import type { Request, Response } from 'express';

let appPromise: ReturnType<typeof NestFactory.create> | undefined;

export default async function handler(request: Request, response: Response) {
  appPromise ??= NestFactory.create(AppModule).then(async (app) => {
    configureApp(app);
    await app.init();
    return app;
  });

  let app: Awaited<ReturnType<typeof NestFactory.create>>;
  try {
    app = await appPromise;
  } catch (error) {
    appPromise = undefined;
    throw error;
  }

  app.getHttpAdapter().getInstance()(request, response);
}

import type { Request, Response } from 'express';
import { createApp } from '../src/app.factory.js';

let appPromise: ReturnType<typeof createApp> | undefined;

export default async function handler(request: Request, response: Response) {
  appPromise ??= createApp().then(async (app) => {
    await app.init();
    return app;
  });

  let app: Awaited<ReturnType<typeof createApp>>;
  try {
    app = await appPromise;
  } catch (error) {
    appPromise = undefined;
    throw error;
  }

  app.getHttpAdapter().getInstance()(request, response);
}

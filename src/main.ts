import { createApp } from './app.factory.js';

async function startApp() {
  const app = await createApp();
  await app.listen(process.env.PORT || 3001);
}

void startApp();

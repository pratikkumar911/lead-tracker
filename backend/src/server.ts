import 'dotenv/config';
import dns from 'node:dns';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { leadsRouter, errorHandler } from './routes';

const PORT = Number(process.env.PORT ?? 5000);

const DNS_SERVERS = (process.env.DNS_SERVERS ?? '')
  .split(',')
  .map((server) => server.trim())
  .filter(Boolean);
const CORS_ORIGINS = [
  process.env.CLIENT_URL
]
  .filter((origins): origins is string => Boolean(origins))
  .flatMap((origins) => origins.split(','))
  .map((origin) => origin.trim())
  .filter(Boolean);

if (DNS_SERVERS.length > 0) {
  dns.setServers(DNS_SERVERS);
}

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: CORS_ORIGINS,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  app.use('/leads', leadsRouter);
  app.use(errorHandler);

  return app;
}

const app = createApp();

async function connectDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is missing from the environment variables.');
    }

    await mongoose.connect(mongoUri);
    console.log('[db] connected to MongoDB');
  } catch (error) {
    console.error('[db] MongoDB connection failed:', error);
    throw error;
  }
}

if (require.main === module) {
  connectDatabase()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`[server] listening on http://localhost:${PORT}`);
      });
    })
    .catch((error) => {
      console.error('[server] failed to start', error);
      process.exit(1);
    });
}

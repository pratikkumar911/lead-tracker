import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { leadsRouter, errorHandler } from './routes';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: (process.env.CORS_ORIGIN ?? '*')
        .split(',')
        .map((s) => s.trim()),
    }),
  );
  app.use(express.json({ limit: '100kb' }));

  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  app.use('/api/leads', leadsRouter);
  app.use(errorHandler);

  return app;
}

// Only listen when this file is executed directly — tests import createApp.
if (require.main === module) {
  const PORT = Number(process.env.PORT ?? 5000);
  const MONGO_URI =
    process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/lead_tracker';

  mongoose
    .connect(MONGO_URI)
    .then(() => {
      console.log('[db] connected');
      createApp().listen(PORT, () => {
        console.log(`[server] http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error('[server] failed to start', err);
      process.exit(1);
    });
}
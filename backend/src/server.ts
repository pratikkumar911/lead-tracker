import 'dotenv/config';
import dns from 'node:dns';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import morgan from 'morgan';
import { leadsRouter, errorHandler } from './routes';

const app = express();
const PORT = Number(process.env.PORT ?? 5000);
const MONGO_URI = process.env.MONGODB_URI ?? (() => {
  throw new Error('MONGODB_URI is missing from the environment variables.');
})();

const DNS_SERVERS = (process.env.DNS_SERVERS ?? '')
  .split(',')
  .map((server) => server.trim())
  .filter(Boolean);

if (DNS_SERVERS.length > 0) {
  dns.setServers(DNS_SERVERS);
}

app.use(
  cors({
    origin: (process.env.CLIENT_URL ?? 'http://localhost:5173')
      .split(',')
      .map((value) => value.trim()),
    credentials: true,
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

async function connectDatabase() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('[db] connected to MongoDB');
  } catch (error) {
    console.error('[db] MongoDB connection failed:', error);
    throw error;
  }
}

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

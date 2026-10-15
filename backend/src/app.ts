import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import router from './routes';
import { errorHandler } from './middlewares/errorHandler';

const app: Application = express();

// CORS with landing domain allowlist
const rawAllowedOrigins = [
  process.env.FRONTEND_URL,
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : []),
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://sumaqbarber.pe',
  'https://www.sumaqbarber.pe',
];

const allowedOrigins = new Set(
  rawAllowedOrigins
    .map((origin) => origin?.trim())
    .filter((origin): origin is string => Boolean(origin && origin.length > 0))
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, mobile apps, same-origin/server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked: Origin '${origin}' is not allowed`));
    },
    credentials: true,
  })
);
app.use(express.json());

// Main Router (to be configured later)
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Sumaq Barber API is running' });
});

// We will mount routes here later
app.use('/api/v1', router);

// Error Handler Middleware (Must be the last middleware)
app.use(errorHandler);

export default app;

import { PORT } from './config/env';
import app from './app';
import prisma from './config/prisma';

const startServer = async () => {
  try {
    const server = app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });

    const shutdown = (signal: string) => {
      console.log(`${signal} received. Closing the server...`);

      server.close(async () => {
        await prisma.$disconnect();
        process.exit(0);
      });

      setTimeout(() => process.exit(1), 10_000).unref();
    };

    process.once('SIGTERM', () => shutdown('SIGTERM'));
    process.once('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('Failed to start server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

void startServer();

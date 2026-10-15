import dotenv from 'dotenv';
dotenv.config();

const rawJwtSecret = process.env.JWT_SECRET?.trim();

// Fail server boot if JWT_SECRET is missing or insecure default 'secret'
if (!rawJwtSecret || rawJwtSecret === 'secret') {
  console.error('❌ FATAL: JWT_SECRET environment variable is missing, empty, or set to the insecure default "secret". Server boot aborted.');
  process.exit(1);
}

export const JWT_SECRET = rawJwtSecret;
export const PORT = Number(process.env.PORT) || 4000;

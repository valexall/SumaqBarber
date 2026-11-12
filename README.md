# Sumaq Barber

Aplicación de reservas y operación para una barbería en Lima. El proyecto está dividido en:

- `frontend`: React + Vite.
- `backend`: Express + TypeScript + Prisma + PostgreSQL.

El antiguo microservicio de IA y el espejo virtual fueron retirados. La landing usa una sola imagen optimizada y no descarga secuencias de frames.

## Desarrollo local

1. Copia `backend/.env.example` a `backend/.env` y configura PostgreSQL y un `JWT_SECRET` largo y aleatorio.
2. Copia `frontend/.env.example` a `frontend/.env` sólo si la API no estará bajo `/api/v1`.
3. Instala las dependencias de cada paquete.
4. Genera Prisma y aplica migraciones:

```bash
cd backend
npx prisma generate
npx prisma migrate deploy
npm run dev
```

En otra terminal:

```bash
cd frontend
npm run dev
```

Vite redirige `/api` a `http://localhost:4000` durante el desarrollo.

## Base de datos existente

La primera migración versionada en este repositorio endurece una base que originalmente fue creada con `prisma db push`. Antes de aplicarla a una base con datos:

1. Crea un backup verificable.
2. Ensaya la migración en una copia de staging.
3. Comprueba que las citas históricas tengan servicios válidos; la migración usa esos servicios para completar duración, precio y hora final.
4. Marca el esquema histórico como aplicado con `npx prisma migrate resolve --applied 20261112150000_baseline`.
5. Ejecuta `npx prisma migrate deploy` en una ventana controlada para aplicar `20261112160000_harden_appointments`.

La migración conserva cancelaciones, añade precios/duraciones históricas, usa `timestamptz` y crea una restricción PostgreSQL que impide intervalos activos solapados para un mismo barbero.

## Seguridad

- La sesión web se guarda en una cookie `HttpOnly`, `SameSite=Lax` y `Secure` en producción.
- El registro público siempre crea clientes; los roles no se aceptan desde el navegador.
- Sólo `OWNER` y `ADMIN` pueden crear o desactivar barberos.
- Las reservas públicas no pueden seleccionar un `customerId` ni iniciar sesión en una cuenta existente.
- Los cuerpos se validan con Zod y las rutas sensibles tienen límites de solicitudes.

## Verificación

```bash
cd backend && npm run check
cd frontend && npm run lint && npm run build
```

Configura `VITE_API_URL=https://api.sumaqbarber.pe/api/v1` en Vercel cuando frontend y backend se desplieguen en orígenes distintos.

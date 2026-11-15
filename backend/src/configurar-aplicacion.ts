import type { INestApplication } from '@nestjs/common';
import helmet from 'helmet';
import type { Configuracion } from './compartido/infraestructura/configuracion/configuracion.js';

/** Prefijo de todas las rutas (docs/api/CONTRATO.md, sección 1). */
export const PREFIJO_API = '/api';

/**
 * Configuración HTTP que va más allá de los módulos: prefijo `/api`, cabeceras de seguridad
 * (helmet), CORS limitado al frontend y proxy de confianza. La usan `main.ts` y las pruebas,
 * así lo que se prueba es lo que corre.
 */
export function configurarAplicacion(
  app: INestApplication,
  configuracion: Configuracion,
): void {
  app.setGlobalPrefix(PREFIJO_API);
  app.use(helmet());
  app.enableCors({
    origin: configuracion.frontendUrls,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    maxAge: 600,
  });
  // Detrás de un proxy (Render, Vercel, nginx) la IP real viene en `X-Forwarded-For`.
  // Sin esto, el límite de pedidos de `/auth/*` vería a todos como la misma IP.
  const express = app.getHttpAdapter().getInstance() as {
    set(clave: string, valor: unknown): void;
  };
  express.set('trust proxy', configuracion.seguridad.confiarEnProxy);
}

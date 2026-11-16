import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import {
  cargarArchivoEnv,
  cargarConfiguracion,
} from './compartido/infraestructura/configuracion/configuracion.js';
import { configurarAplicacion, PREFIJO_API } from './configurar-aplicacion.js';

async function arrancar(): Promise<void> {
  const logger = new Logger('Arranque');
  cargarArchivoEnv();
  const configuracion = cargarConfiguracion(process.env);
  if (configuracion.seguridad.jwtSecretoGenerado) {
    logger.warn(
      'JWT_SECRET no está definido: se generó un secreto temporal. Las sesiones se pierden al reiniciar.',
    );
  }

  const app = await NestFactory.create(AppModule.registrar(configuracion));
  configurarAplicacion(app, configuracion);
  // Cierra la base (y la libera) al recibir SIGINT o SIGTERM.
  app.enableShutdownHooks();

  await app.listen(configuracion.puerto);
  logger.log(`API lista en http://localhost:${configuracion.puerto}${PREFIJO_API}`);
}

try {
  await arrancar();
} catch (error) {
  // Un fallo de configuración o de base de datos al arrancar se informa y termina el proceso.
  new Logger('Arranque').error(
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
}

import {
  Controller,
  Get,
  Inject,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { DB, type Db } from '../infraestructura/db/db.js';
import { Public } from '../infraestructura/seguridad/decoradores.js';

/** `GET /api/health`: la API responde y la base de datos contesta (docs/api/CONTRATO.md, sección 7). */
@Controller('health')
export class SaludController {
  constructor(@Inject(DB) private readonly db: Db) {}

  @Public()
  @Get()
  async consultar(
    @Res({ passthrough: true }) respuesta: Response,
  ): Promise<{ estado: 'ok' | 'error'; baseDeDatos: 'ok' | 'error' }> {
    try {
      await this.db.query('SELECT 1');
      return { estado: 'ok', baseDeDatos: 'ok' };
    } catch {
      respuesta.status(503);
      return { estado: 'error', baseDeDatos: 'error' };
    }
  }
}

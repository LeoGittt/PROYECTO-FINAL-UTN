import { STATUS_CODES } from 'node:http';
import {
  Catch,
  HttpException,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ErrorDominio,
  type CodigoError,
  type DetalleError,
} from '../../dominio/errores.js';
import { esErrorPostgres, SQLSTATE } from '../db/errores-db.js';

/** Cuerpo de error de docs/api/CONTRATO.md, sección 1. */
export interface RespuestaError {
  statusCode: number;
  error: string;
  message: string;
  details?: DetalleError[];
}

const ESTADO_POR_CODIGO: Record<CodigoError, number> = {
  validacion: 400,
  no_autenticado: 401,
  prohibido: 403,
  no_encontrado: 404,
  conflicto: 409,
  regla_negocio: 422,
};

const MENSAJE_POR_ESTADO: Record<number, string> = {
  400: 'La solicitud no es válida',
  401: 'Se requiere iniciar sesión',
  403: 'No tiene permisos para realizar esta acción',
  404: 'El recurso solicitado no existe',
  405: 'El método no está permitido para este recurso',
  409: 'La operación entra en conflicto con el estado actual',
  413: 'El cuerpo de la solicitud es demasiado grande',
  415: 'El tipo de contenido no está soportado',
  422: 'La solicitud no cumple las reglas del sistema',
  429: 'Demasiadas solicitudes. Intente nuevamente en unos minutos',
  500: 'Ocurrió un error interno. Intente nuevamente más tarde',
};

function respuesta(
  statusCode: number,
  message: string,
  details?: readonly DetalleError[],
): RespuestaError {
  const cuerpo: RespuestaError = {
    statusCode,
    error: STATUS_CODES[statusCode] ?? 'Error',
    message,
  };
  if (details && details.length > 0) cuerpo.details = [...details];
  return cuerpo;
}

function esErrorDeJson(excepcion: unknown): boolean {
  const tipo = (excepcion as { type?: unknown }).type;
  return (
    tipo === 'entity.parse.failed' ||
    (excepcion instanceof HttpException && /json/i.test(excepcion.message))
  );
}

function estadoDe(excepcion: unknown): number | undefined {
  if (excepcion instanceof HttpException) return excepcion.getStatus();
  // Errores de Express y de body-parser: traen `status` o `statusCode`.
  if (typeof excepcion === 'object' && excepcion !== null) {
    const candidato =
      (excepcion as { status?: unknown }).status ??
      (excepcion as { statusCode?: unknown }).statusCode;
    if (typeof candidato === 'number' && candidato >= 400 && candidato < 500) {
      return candidato;
    }
  }
  return undefined;
}

/**
 * Traduce cualquier excepción al cuerpo de error del contrato. Los mensajes son siempre
 * textos en español pensados para el usuario: nunca se filtran detalles internos, SQL ni
 * stack traces.
 */
export function construirRespuestaError(excepcion: unknown): RespuestaError {
  if (excepcion instanceof ErrorDominio) {
    return respuesta(
      ESTADO_POR_CODIGO[excepcion.codigo],
      excepcion.message,
      excepcion.detalles,
    );
  }

  const estado = estadoDe(excepcion);
  if (estado !== undefined) {
    // body-parser reporta un cuerpo mal formado como SyntaxError; Nest lo envuelve en un 400.
    if (estado === 400 && esErrorDeJson(excepcion)) {
      return respuesta(400, 'El cuerpo de la solicitud no es un JSON válido');
    }
    return respuesta(
      estado,
      MENSAJE_POR_ESTADO[estado] ?? MENSAJE_POR_ESTADO[400],
    );
  }

  // Red de seguridad: los repositorios traducen los errores esperados; esto cubre una
  // carrera entre dos solicitudes que el repositorio no pudo anticipar.
  if (esErrorPostgres(excepcion)) {
    // Cualquier texto de entrada con un byte NUL llega hasta la base: es un error del cliente.
    if (excepcion.code === SQLSTATE.CARACTER_NO_VALIDO) {
      return respuesta(400, 'El texto contiene caracteres no válidos');
    }
    if (excepcion.code === SQLSTATE.VIOLACION_UNICA) {
      return respuesta(409, 'Ya existe un registro con esos datos');
    }
    if (excepcion.code === SQLSTATE.VIOLACION_CLAVE_FORANEA) {
      return respuesta(409, 'La operación hace referencia a datos que no existen o están en uso');
    }
  }

  return respuesta(500, MENSAJE_POR_ESTADO[500]);
}

@Catch()
export class FiltroExcepciones implements ExceptionFilter {
  private readonly logger = new Logger('Excepciones');

  catch(excepcion: unknown, host: ArgumentsHost): void {
    const cuerpo = construirRespuestaError(excepcion);
    if (cuerpo.statusCode >= 500) {
      // El detalle completo queda en el log del servidor y no viaja en la respuesta.
      this.logger.error(
        excepcion instanceof Error
          ? (excepcion.stack ?? excepcion.message)
          : String(excepcion),
      );
    }
    const respuestaHttp = host.switchToHttp().getResponse<Response>();
    respuestaHttp.status(cuerpo.statusCode).json(cuerpo);
  }
}

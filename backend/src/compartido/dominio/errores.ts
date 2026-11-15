/**
 * Errores del dominio y de la aplicación. No dependen de NestJS ni de la base de datos:
 * el filtro global de excepciones (infraestructura) los traduce al formato de error HTTP
 * definido en docs/api/CONTRATO.md, sección 1.
 */

export type CodigoError =
  | 'validacion'
  | 'no_autenticado'
  | 'prohibido'
  | 'no_encontrado'
  | 'conflicto'
  | 'regla_negocio';

/** Un problema asociado a un campo concreto de la solicitud. */
export interface DetalleError {
  campo: string;
  mensaje: string;
}

export class ErrorDominio extends Error {
  constructor(
    readonly codigo: CodigoError,
    mensaje: string,
    readonly detalles: readonly DetalleError[] = [],
  ) {
    super(mensaje);
    this.name = new.target.name;
  }
}

/** 400: el formato de la solicitud es incorrecto. */
export class ErrorValidacion extends ErrorDominio {
  constructor(
    mensaje = 'Los datos enviados no son válidos',
    detalles: readonly DetalleError[] = [],
  ) {
    super('validacion', mensaje, detalles);
  }
}

/** 401: falta la sesión o las credenciales no son válidas. */
export class ErrorNoAutenticado extends ErrorDominio {
  constructor(mensaje = 'Se requiere iniciar sesión') {
    super('no_autenticado', mensaje);
  }
}

/** 403: la sesión es válida, pero no alcanza para esta operación. */
export class ErrorProhibido extends ErrorDominio {
  constructor(mensaje = 'No tiene permisos para realizar esta acción') {
    super('prohibido', mensaje);
  }
}

/** 404: el recurso no existe (o no es visible para quien lo pide). */
export class ErrorNoEncontrado extends ErrorDominio {
  constructor(mensaje = 'El recurso solicitado no existe') {
    super('no_encontrado', mensaje);
  }
}

/** 409: duplicado o transición de estado inválida. */
export class ErrorConflicto extends ErrorDominio {
  constructor(mensaje: string, detalles: readonly DetalleError[] = []) {
    super('conflicto', mensaje, detalles);
  }
}

/** 422: la solicitud está bien formada, pero viola una regla de negocio. */
export class ErrorReglaNegocio extends ErrorDominio {
  constructor(mensaje: string, detalles: readonly DetalleError[] = []) {
    super('regla_negocio', mensaje, detalles);
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type {
  EventosDominio,
  NombreEvento,
  PublicadorEventos,
} from '../../dominio/eventos.js';

/**
 * Implementación de `PublicadorEventos` sobre `@nestjs/event-emitter`. Los listeners se
 * declaran con `@OnEvent('<nombre>')` en la infraestructura de cada módulo.
 *
 * Se espera a los listeners (`emitAsync`) para que, al terminar la solicitud que publicó el
 * evento, los efectos ya estén aplicados (por ejemplo, los puntajes recalculados). Un listener
 * que falla se registra en el log y no afecta a quien publicó (RNF-04).
 */
@Injectable()
export class PublicadorEventosNest implements PublicadorEventos {
  private readonly logger = new Logger('Eventos');

  constructor(private readonly emisor: EventEmitter2) {}

  async publicar<N extends NombreEvento>(
    nombre: N,
    payload: EventosDominio[N],
  ): Promise<void> {
    try {
      await this.emisor.emitAsync(nombre, payload);
    } catch (error) {
      this.logger.error(
        `Falló un listener del evento "${nombre}": ${
          error instanceof Error ? (error.stack ?? error.message) : String(error)
        }`,
      );
    }
  }
}

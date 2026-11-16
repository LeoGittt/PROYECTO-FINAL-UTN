import {
  ESTADOS_POSTULACION,
  evaluarTransicion,
  type ActorPostulacion,
  type EstadoPostulacion,
} from './estado-postulacion.js';

/** Transiciones del contrato (docs/api/CONTRATO.md, sección 5.4), escritas una por una. */
const VALIDAS: Array<[EstadoPostulacion, EstadoPostulacion]> = [
  ['pendiente', 'en_revision'],
  ['pendiente', 'entrevista'],
  ['pendiente', 'rechazada'],
  ['pendiente', 'retirada'],
  ['en_revision', 'entrevista'],
  ['en_revision', 'aceptada'],
  ['en_revision', 'rechazada'],
  ['en_revision', 'retirada'],
  ['entrevista', 'aceptada'],
  ['entrevista', 'rechazada'],
  ['entrevista', 'retirada'],
];

const ACTORES: ActorPostulacion[] = ['estudiante', 'publicador'];

describe('evaluarTransicion', () => {
  it('permite cada transición del contrato cuando la pide quien corresponde', () => {
    for (const [desde, hacia] of VALIDAS) {
      const actor = hacia === 'retirada' ? 'estudiante' : 'publicador';
      expect(evaluarTransicion({ desde, hacia, actor }), `${desde} -> ${hacia}`).toEqual({
        ok: true,
      });
    }
  });

  it('rechaza con el motivo correcto las otras 61 combinaciones de estado inicial, final y actor', () => {
    let rechazadas = 0;
    for (const desde of ESTADOS_POSTULACION) {
      for (const hacia of ESTADOS_POSTULACION) {
        for (const actor of ACTORES) {
          const actorCorrecto = hacia === 'retirada' ? 'estudiante' : 'publicador';
          const esValida =
            actor === actorCorrecto &&
            VALIDAS.some(([d, h]) => d === desde && h === hacia);
          if (esValida) continue;
          rechazadas += 1;
          // El actor se revisa primero: quien no puede pedir ese estado recibe 403 aunque la
          // transición tampoco exista.
          const motivo =
            actor !== actorCorrecto ? 'actor_no_autorizado' : 'transicion_invalida';
          expect(
            evaluarTransicion({ desde, hacia, actor }),
            `${actor}: ${desde} -> ${hacia}`,
          ).toEqual({ ok: false, motivo });
        }
      }
    }
    // 36 combinaciones x 2 actores = 72, menos las 11 válidas.
    expect(rechazadas).toBe(72 - VALIDAS.length);
  });

  it('el estudiante solo puede retirar y el publicador no puede retirar', () => {
    expect(
      evaluarTransicion({ desde: 'en_revision', hacia: 'aceptada', actor: 'estudiante' }),
    ).toEqual({ ok: false, motivo: 'actor_no_autorizado' });
    expect(
      evaluarTransicion({ desde: 'pendiente', hacia: 'retirada', actor: 'publicador' }),
    ).toEqual({ ok: false, motivo: 'actor_no_autorizado' });
  });

  it('aceptada, rechazada y retirada son finales', () => {
    for (const desde of ['aceptada', 'rechazada', 'retirada'] as const) {
      expect(
        evaluarTransicion({ desde, hacia: 'retirada', actor: 'estudiante' }),
      ).toEqual({ ok: false, motivo: 'transicion_invalida' });
      expect(
        evaluarTransicion({ desde, hacia: 'entrevista', actor: 'publicador' }),
      ).toEqual({ ok: false, motivo: 'transicion_invalida' });
    }
  });

  it('no se puede volver atrás ni pasar al mismo estado', () => {
    expect(
      evaluarTransicion({ desde: 'entrevista', hacia: 'en_revision', actor: 'publicador' }),
    ).toEqual({ ok: false, motivo: 'transicion_invalida' });
    expect(
      evaluarTransicion({ desde: 'pendiente', hacia: 'pendiente', actor: 'publicador' }),
    ).toEqual({ ok: false, motivo: 'transicion_invalida' });
  });
});

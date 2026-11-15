import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PublicadorEventosNest } from './publicador-eventos-nest.js';

const payload = { idUsuario: 7, rol: 'estudiante', idEstudiante: 3 } as const;

describe('PublicadorEventosNest', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('entrega el payload a los listeners y espera a que terminen', async () => {
    const emisor = new EventEmitter2();
    const orden: string[] = [];
    emisor.on('perfil.actualizado', async (recibido) => {
      await new Promise((resolver) => setTimeout(resolver, 15));
      orden.push(`listener:${recibido.idUsuario}`);
    });
    const publicador = new PublicadorEventosNest(emisor);

    await publicador.publicar('perfil.actualizado', payload);
    orden.push('publicar-termino');

    expect(orden).toEqual(['listener:7', 'publicar-termino']);
  });

  it('un listener que falla se registra y no rompe a quien publica ni a los demás listeners', async () => {
    const errores = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const emisor = new EventEmitter2();
    const ejecutados: string[] = [];
    emisor.on('perfil.actualizado', async () => {
      throw new Error('falló el recálculo');
    });
    emisor.on('perfil.actualizado', () => {
      ejecutados.push('segundo');
    });
    const publicador = new PublicadorEventosNest(emisor);

    await expect(publicador.publicar('perfil.actualizado', payload)).resolves.toBeUndefined();

    expect(errores).toHaveBeenCalledOnce();
    expect(String(errores.mock.calls[0][0])).toContain('perfil.actualizado');
    expect(String(errores.mock.calls[0][0])).toContain('falló el recálculo');
    expect(ejecutados).toEqual(['segundo']);
  });

  it('sin listeners, publicar no hace nada y no falla', async () => {
    const publicador = new PublicadorEventosNest(new EventEmitter2());
    await expect(publicador.publicar('perfil.actualizado', payload)).resolves.toBeUndefined();
  });
});

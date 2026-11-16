import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { ErrorNoAutenticado, ErrorProhibido } from '../../dominio/errores.js';
import {
  rolAutorizado,
  type UsuarioAutenticado,
  type ValidadorSesion,
} from '../../dominio/seguridad.js';
import { CLAVE_PUBLICO, CLAVE_ROLES } from './decoradores.js';
import { extraerTokenBearer, GuardAcceso } from './guard-acceso.js';

describe('extraerTokenBearer', () => {
  it('toma el token de "Authorization: Bearer <token>" sin distinguir mayúsculas en el esquema', () => {
    expect(extraerTokenBearer('Bearer abc.def.ghi')).toBe('abc.def.ghi');
    expect(extraerTokenBearer('bearer abc')).toBe('abc');
  });

  it.each([undefined, '', 'Bearer', 'Basic abc', 'abc', 'Bearer a b'])(
    'devuelve null para %j',
    (cabecera) => {
      expect(extraerTokenBearer(cabecera)).toBeNull();
    },
  );
});

describe('rolAutorizado', () => {
  it('sin roles declarados alcanza con estar autenticado', () => {
    expect(rolAutorizado(undefined, 'estudiante')).toBe(true);
    expect(rolAutorizado([], 'estudiante')).toBe(true);
  });

  it('con roles declarados, el rol del usuario tiene que ser uno de ellos', () => {
    expect(rolAutorizado(['administrador'], 'administrador')).toBe(true);
    expect(rolAutorizado(['empresa', 'docente'], 'estudiante')).toBe(false);
  });
});

describe('GuardAcceso', () => {
  const usuario: UsuarioAutenticado = { idUsuario: 5, rol: 'empresa' };

  /** Arma un contexto cuyo handler y clase tienen la metadata indicada. */
  function armar(opciones: {
    publico?: boolean;
    roles?: string[];
    authorization?: string;
    validador?: ValidadorSesion;
  }) {
    const solicitud: { headers: Record<string, string>; usuario?: UsuarioAutenticado } = {
      headers: opciones.authorization ? { authorization: opciones.authorization } : {},
    };
    const metadata = new Map<string, unknown>();
    if (opciones.publico) metadata.set(CLAVE_PUBLICO, true);
    if (opciones.roles) metadata.set(CLAVE_ROLES, opciones.roles);
    const reflector = {
      getAllAndOverride: (clave: string) => metadata.get(clave),
    } as unknown as Reflector;
    const validador = opciones.validador ?? { validar: vi.fn().mockResolvedValue(usuario) };
    const contexto = {
      getHandler: () => () => undefined,
      getClass: () => class {},
      switchToHttp: () => ({ getRequest: () => solicitud }),
    } as unknown as ExecutionContext;
    return { guard: new GuardAcceso(reflector, validador), contexto, solicitud, validador };
  }

  it('deja pasar un endpoint público sin pedir ni validar el token', async () => {
    const { guard, contexto, validador } = armar({ publico: true });
    await expect(guard.canActivate(contexto)).resolves.toBe(true);
    expect(validador.validar).not.toHaveBeenCalled();
  });

  it('sin token responde 401', async () => {
    const { guard, contexto } = armar({});
    await expect(guard.canActivate(contexto)).rejects.toBeInstanceOf(ErrorNoAutenticado);
  });

  it('un token que el validador rechaza propaga el 401', async () => {
    const validador = { validar: vi.fn().mockRejectedValue(new ErrorNoAutenticado('vencido')) };
    const { guard, contexto } = armar({ authorization: 'Bearer malo', validador });
    await expect(guard.canActivate(contexto)).rejects.toThrow('vencido');
    expect(validador.validar).toHaveBeenCalledWith('malo');
  });

  it('con sesión válida deja pasar y deja el usuario en la solicitud', async () => {
    const { guard, contexto, solicitud } = armar({ authorization: 'Bearer bueno' });
    await expect(guard.canActivate(contexto)).resolves.toBe(true);
    expect(solicitud.usuario).toEqual(usuario);
  });

  it('con @Roles y un rol que no corresponde responde 403', async () => {
    const { guard, contexto } = armar({ authorization: 'Bearer bueno', roles: ['administrador'] });
    await expect(guard.canActivate(contexto)).rejects.toBeInstanceOf(ErrorProhibido);
  });

  it('con @Roles y un rol que corresponde deja pasar', async () => {
    const { guard, contexto } = armar({ authorization: 'Bearer bueno', roles: ['empresa', 'docente'] });
    await expect(guard.canActivate(contexto)).resolves.toBe(true);
  });
});

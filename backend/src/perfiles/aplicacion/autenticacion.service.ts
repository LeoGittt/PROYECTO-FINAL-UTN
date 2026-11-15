import { randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  ErrorNoAutenticado,
  ErrorNoEncontrado,
  ErrorProhibido,
} from '../../compartido/dominio/errores.js';
import type {
  Rol,
  UsuarioAutenticado,
  ValidadorSesion,
} from '../../compartido/dominio/seguridad.js';
import { exigirContrasenaValida } from '../dominio/contrasena.js';
import {
  HASHEADOR_CONTRASENAS,
  SERVICIO_TOKENS,
  USUARIO_REPOSITORY,
  type HasheadorContrasenas,
  type ServicioTokens,
  type UsuarioRepository,
} from '../dominio/puertos.js';
import type { SesionDto, UsuarioDto } from '../dominio/usuario.js';

export interface DatosCuenta {
  nombre: string;
  apellido: string;
  email: string;
  contrasena: string;
  rol: Rol;
}

/**
 * Casos de uso de identidad: registro, inicio de sesión, validación del token y manejo de
 * contraseñas. También es el `ValidadorSesion` que usa el guard global de acceso.
 */
@Injectable()
export class AutenticacionService implements ValidadorSesion {
  /** Hash de una contraseña al azar: se compara cuando el email no existe, para no delatarlo por el tiempo de respuesta. */
  private hashDeRelleno?: Promise<string>;

  constructor(
    @Inject(USUARIO_REPOSITORY) private readonly usuarios: UsuarioRepository,
    @Inject(HASHEADOR_CONTRASENAS) private readonly hasheador: HasheadorContrasenas,
    @Inject(SERVICIO_TOKENS) private readonly tokens: ServicioTokens,
  ) {}

  /** Alta de una cuenta con la política de contraseñas aplicada. 409 si el email ya existe. */
  async crearCuenta(datos: DatosCuenta): Promise<UsuarioDto> {
    exigirContrasenaValida(datos.contrasena);
    return this.usuarios.crear({
      nombre: datos.nombre,
      apellido: datos.apellido,
      email: datos.email,
      contrasenaHash: await this.hasheador.hashear(datos.contrasena),
      rol: datos.rol,
    });
  }

  /** Registro público: crea la cuenta e inicia sesión. */
  async registrar(datos: DatosCuenta): Promise<SesionDto> {
    const usuario = await this.crearCuenta(datos);
    return { token: await this.tokens.emitir(usuario), usuario };
  }

  /** 401 si las credenciales no coinciden; 403 si son correctas pero la cuenta está desactivada. */
  async iniciarSesion(email: string, contrasena: string): Promise<SesionDto> {
    const candidato = await this.usuarios.buscarPorEmail(email);
    const hash = candidato?.contrasenaHash ?? (await this.obtenerHashDeRelleno());
    const coincide = await this.hasheador.comparar(contrasena, hash);
    if (!candidato || !coincide) {
      throw new ErrorNoAutenticado('Email o contraseña incorrectos');
    }
    if (!candidato.activo) {
      throw new ErrorProhibido('La cuenta está desactivada. Comuníquese con un administrador');
    }
    // El hash no sale de acá.
    const { contrasenaHash: _hash, ...usuario } = candidato;
    return { token: await this.tokens.emitir(usuario), usuario };
  }

  /**
   * Valida un token: la firma, el vencimiento y que el usuario siga existiendo y activo. El rol
   * es el actual de la base, no el que quedó escrito en el token. 401 si algo falla.
   */
  async validar(token: string): Promise<UsuarioAutenticado> {
    const idUsuario = await this.tokens.verificar(token);
    const usuario = await this.usuarios.buscarPorId(idUsuario);
    if (!usuario || !usuario.activo) {
      throw new ErrorNoAutenticado('La sesión ya no es válida');
    }
    return { idUsuario: usuario.idUsuario, rol: usuario.rol };
  }

  /** Reemplaza la contraseña de un usuario (el administrador lo hace por otra persona). */
  async restablecerContrasena(
    idUsuario: number,
    contrasenaNueva: string,
  ): Promise<void> {
    exigirContrasenaValida(contrasenaNueva, 'contrasenaNueva');
    const hash = await this.hasheador.hashear(contrasenaNueva);
    if (!(await this.usuarios.actualizarContrasena(idUsuario, hash))) {
      throw new ErrorNoEncontrado('El usuario no existe');
    }
  }

  private obtenerHashDeRelleno(): Promise<string> {
    this.hashDeRelleno ??= this.hasheador.hashear(randomBytes(16).toString('hex'));
    return this.hashDeRelleno;
  }
}

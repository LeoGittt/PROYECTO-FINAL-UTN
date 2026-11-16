import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { SkipThrottle, ThrottlerGuard } from '@nestjs/throttler';
import type { UsuarioAutenticado } from '../../compartido/dominio/seguridad.js';
import {
  Public,
  UsuarioActual,
} from '../../compartido/infraestructura/seguridad/decoradores.js';
import { AutenticacionService } from '../aplicacion/autenticacion.service.js';
import { PerfilesService } from '../aplicacion/perfiles.service.js';
import type { PerfilDto } from '../dominio/perfil.js';
import type { SesionDto, UsuarioDto } from '../dominio/usuario.js';
import { LoginDto, RegistroDto } from './esquemas.js';

/**
 * Registro e inicio de sesión (docs/api/CONTRATO.md, sección 2). `ThrottlerGuard` limita los
 * pedidos por IP (`RATE_LIMIT_AUTH_*`); `GET /auth/yo` queda afuera porque el frontend lo
 * consulta en cada carga de página y exige un token válido.
 */
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(
    private readonly autenticacion: AutenticacionService,
    private readonly perfiles: PerfilesService,
  ) {}

  @Public()
  @Post('registro')
  registro(@Body() datos: RegistroDto): Promise<SesionDto> {
    return this.autenticacion.registrar(datos);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() datos: LoginDto): Promise<SesionDto> {
    return this.autenticacion.iniciarSesion(datos.email, datos.contrasena);
  }

  @Get('yo')
  @SkipThrottle()
  yo(
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<{ usuario: UsuarioDto; perfil: PerfilDto | null }> {
    return this.perfiles.obtenerSesionActual(usuario);
  }
}

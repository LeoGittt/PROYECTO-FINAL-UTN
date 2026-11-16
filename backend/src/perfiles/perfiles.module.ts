import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CatalogosModule } from '../administracion/catalogos/catalogos.module.js';
import { VALIDADOR_SESION } from '../compartido/dominio/seguridad.js';
import {
  CONFIGURACION,
  type Configuracion,
} from '../compartido/infraestructura/configuracion/configuracion.js';
import { DatabaseModule } from '../compartido/infraestructura/db/database.module.js';
import { AutenticacionService } from './aplicacion/autenticacion.service.js';
import { PerfilesService } from './aplicacion/perfiles.service.js';
import {
  HASHEADOR_CONTRASENAS,
  PERFIL_REPOSITORY,
  SERVICIO_TOKENS,
  USUARIO_REPOSITORY,
} from './dominio/puertos.js';
import { HasheadorBcrypt } from './infraestructura/hasheador-bcrypt.js';
import { PerfilRepositorySql } from './infraestructura/perfil.repository.sql.js';
import { ServicioTokensJwt } from './infraestructura/servicio-tokens-jwt.js';
import { UsuarioRepositorySql } from './infraestructura/usuario.repository.sql.js';
import { AuthController } from './presentacion/auth.controller.js';
import {
  EstudiantesController,
  PerfilController,
} from './presentacion/perfil.controller.js';

/**
 * M1: autenticación y perfiles. Depende de `DatabaseModule` y de los catálogos de M5, y
 * exporta `PerfilesService` (la API para los demás módulos) y el `ValidadorSesion` que usa
 * el guard global de acceso.
 */
@Module({
  imports: [
    DatabaseModule,
    CatalogosModule,
    JwtModule.registerAsync({
      inject: [CONFIGURACION],
      useFactory: (configuracion: Configuracion) => ({
        secret: configuracion.seguridad.jwtSecreto,
        signOptions: {
          algorithm: 'HS256',
          expiresIn: configuracion.seguridad.jwtExpiracionSegundos,
        },
      }),
    }),
  ],
  controllers: [AuthController, PerfilController, EstudiantesController],
  providers: [
    { provide: USUARIO_REPOSITORY, useClass: UsuarioRepositorySql },
    { provide: PERFIL_REPOSITORY, useClass: PerfilRepositorySql },
    { provide: HASHEADOR_CONTRASENAS, useClass: HasheadorBcrypt },
    { provide: SERVICIO_TOKENS, useClass: ServicioTokensJwt },
    AutenticacionService,
    PerfilesService,
    { provide: VALIDADOR_SESION, useExisting: AutenticacionService },
  ],
  exports: [PerfilesService, VALIDADOR_SESION],
})
export class PerfilesModule {}

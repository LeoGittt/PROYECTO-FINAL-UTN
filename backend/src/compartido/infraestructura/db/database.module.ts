import { Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { CONFIGURACION, type Configuracion } from '../configuracion/configuracion.js';
import { crearDbLista } from './crear-db.js';
import { DB, type Db } from './db.js';

/**
 * Provee `Db`. Es una sola instancia para toda la aplicación (Nest comparte el módulo), se
 * abre al arrancar —aplicando esquema y datos si la base está vacía— y se cierra al apagar.
 */
@Module({
  providers: [
    {
      provide: DB,
      inject: [CONFIGURACION],
      useFactory: (config: Configuracion) => crearDbLista(config.baseDeDatos),
    },
  ],
  exports: [DB],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(DB) private readonly db: Db) {}

  async onApplicationShutdown(): Promise<void> {
    await this.db.close();
  }
}

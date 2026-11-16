import { describe, expect, it } from 'vitest';
import { cargarConfiguracion } from './configuracion.js';

const SECRETO_LARGO = 'a'.repeat(40);

describe('cargarConfiguracion', () => {
  it('sin variables arranca en desarrollo con PGlite en disco y valores por defecto', () => {
    const config = cargarConfiguracion({});
    expect(config.entorno).toBe('development');
    expect(config.puerto).toBe(3001);
    expect(config.frontendUrls).toEqual(['http://localhost:3000']);
    expect(config.baseDeDatos.url).toBeNull();
    expect(config.baseDeDatos.directorioPglite).toMatch(/\.data[\\/]pglite$/);
    expect(config.baseDeDatos.autoInicializar).toBe(true);
    expect(config.seguridad.jwtExpiracionSegundos).toBe(12 * 3600);
    expect(config.seguridad.costoBcrypt).toBe(10);
  });

  it('genera un secreto temporal fuera de producción cuando falta JWT_SECRET', () => {
    const a = cargarConfiguracion({});
    const b = cargarConfiguracion({});
    expect(a.seguridad.jwtSecretoGenerado).toBe(true);
    expect(a.seguridad.jwtSecreto).toHaveLength(64);
    expect(a.seguridad.jwtSecreto).not.toBe(b.seguridad.jwtSecreto);
  });

  it('usa el JWT_SECRET configurado', () => {
    const config = cargarConfiguracion({ JWT_SECRET: 'mi-secreto' });
    expect(config.seguridad.jwtSecreto).toBe('mi-secreto');
    expect(config.seguridad.jwtSecretoGenerado).toBe(false);
  });

  it('en producción se niega a arrancar sin JWT_SECRET', () => {
    expect(() => cargarConfiguracion({ NODE_ENV: 'production' })).toThrow(
      /JWT_SECRET es obligatorio en producción/,
    );
  });

  it('en producción exige un JWT_SECRET de al menos 32 caracteres', () => {
    expect(() =>
      cargarConfiguracion({ NODE_ENV: 'production', JWT_SECRET: 'corto' }),
    ).toThrow(/al menos 32 caracteres/);
    expect(
      cargarConfiguracion({ NODE_ENV: 'production', JWT_SECRET: SECRETO_LARGO }).entorno,
    ).toBe('production');
  });

  it('DB_AUTO_INIT es falso por defecto en producción y verdadero fuera de ella', () => {
    const produccion = cargarConfiguracion({
      NODE_ENV: 'production',
      JWT_SECRET: SECRETO_LARGO,
    });
    expect(produccion.baseDeDatos.autoInicializar).toBe(false);
    expect(
      cargarConfiguracion({
        NODE_ENV: 'production',
        JWT_SECRET: SECRETO_LARGO,
        DB_AUTO_INIT: 'true',
      }).baseDeDatos.autoInicializar,
    ).toBe(true);
    expect(cargarConfiguracion({ DB_AUTO_INIT: 'false' }).baseDeDatos.autoInicializar).toBe(
      false,
    );
  });

  it('usa PostgreSQL cuando hay DATABASE_URL y trata el valor vacío como ausente', () => {
    expect(
      cargarConfiguracion({ DATABASE_URL: 'postgresql://u:p@host:5432/db' }).baseDeDatos.url,
    ).toBe('postgresql://u:p@host:5432/db');
    expect(cargarConfiguracion({ DATABASE_URL: '  ' }).baseDeDatos.url).toBeNull();
  });

  it('en pruebas y con memory:// la base de PGlite es en memoria', () => {
    expect(cargarConfiguracion({ NODE_ENV: 'test' }).baseDeDatos.directorioPglite).toBeNull();
    expect(
      cargarConfiguracion({ PGLITE_DATA_DIR: 'memory://' }).baseDeDatos.directorioPglite,
    ).toBeNull();
    expect(
      cargarConfiguracion({ PGLITE_DATA_DIR: '/tmp/otra' }).baseDeDatos.directorioPglite,
    ).toBe('/tmp/otra');
  });

  it('una ruta relativa de PGLITE_DATA_DIR se toma desde backend/, no desde donde se lance el comando', () => {
    expect(
      cargarConfiguracion({ PGLITE_DATA_DIR: 'datos/mi-base' }).baseDeDatos.directorioPglite,
    ).toMatch(/backend[\\/]datos[\\/]mi-base$/);
  });

  it('admite varios orígenes CORS separados por coma, sin barra final', () => {
    expect(
      cargarConfiguracion({ FRONTEND_URL: 'https://a.test/, https://b.test' }).frontendUrls,
    ).toEqual(['https://a.test', 'https://b.test']);
  });

  it('informa todos los errores juntos', () => {
    const intento = () =>
      cargarConfiguracion({ PORT: 'abc', NODE_ENV: 'otro', BCRYPT_COST: '2' });
    expect(intento).toThrow(/PORT debe ser un entero/);
    expect(intento).toThrow(/NODE_ENV debe ser/);
    expect(intento).toThrow(/BCRYPT_COST debe ser/);
  });

  it('convierte el vencimiento del JWT de horas a segundos', () => {
    expect(
      cargarConfiguracion({ JWT_EXPIRES_IN_HOURS: '2' }).seguridad.jwtExpiracionSegundos,
    ).toBe(7200);
  });

  it('configura el límite de pedidos de /auth', () => {
    const { limiteAuth } = cargarConfiguracion({
      RATE_LIMIT_AUTH_MAX: '5',
      RATE_LIMIT_AUTH_WINDOW_SECONDS: '30',
    }).seguridad;
    expect(limiteAuth).toEqual({ maximo: 5, ventanaMs: 30_000 });
  });

  it('sin variables de email los escribe en el log y los enlaces apuntan a la aplicación web', () => {
    expect(cargarConfiguracion({ FRONTEND_URL: 'https://utnmatch.app/' }).email).toEqual({
      transporte: 'log',
      smtp: null,
      remitente: 'UTN Match <no-responder@utnmatch.local>',
      urlAplicacion: 'https://utnmatch.app',
    });
  });

  it('con EMAIL_TRANSPORT=smtp toma el servidor SMTP de las variables', () => {
    const { email } = cargarConfiguracion({
      EMAIL_TRANSPORT: 'smtp',
      SMTP_HOST: 'smtp.ejemplo.com',
      SMTP_PORT: '465',
      SMTP_SECURE: 'true',
      SMTP_USER: 'usuario',
      SMTP_PASSWORD: 'clave',
      EMAIL_FROM: 'UTN Match <avisos@ejemplo.com>',
    });
    expect(email).toMatchObject({
      transporte: 'smtp',
      smtp: { host: 'smtp.ejemplo.com', puerto: 465, seguro: true, usuario: 'usuario', contrasena: 'clave' },
      remitente: 'UTN Match <avisos@ejemplo.com>',
    });
  });

  it('rechaza un transporte desconocido y SMTP sin servidor', () => {
    expect(() => cargarConfiguracion({ EMAIL_TRANSPORT: 'paloma' })).toThrow('EMAIL_TRANSPORT debe ser log o smtp');
    expect(() => cargarConfiguracion({ EMAIL_TRANSPORT: 'smtp' })).toThrow('SMTP_HOST es obligatorio con EMAIL_TRANSPORT=smtp');
  });
});

import { Inject, Injectable, Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import {
  CONFIGURACION,
  type Configuracion,
} from '../compartido/infraestructura/configuracion/configuracion.js';

export interface Email {
  para: string;
  asunto: string;
  texto: string;
}

/**
 * Envío de emails (RF-08). Con `EMAIL_TRANSPORT=log` (el valor por defecto) el email se escribe en
 * el log; con `smtp` se envía por el servidor configurado.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger('Email');
  private transportador?: Transporter;

  constructor(@Inject(CONFIGURACION) private readonly configuracion: Configuracion) {}

  async enviar(email: Email): Promise<void> {
    const { transporte, smtp, remitente } = this.configuracion.email;
    if (transporte === 'log' || !smtp) {
      this.logger.log(`Para: ${email.para} | Asunto: ${email.asunto}\n${email.texto}`);
      return;
    }
    this.transportador ??= createTransport({
      host: smtp.host,
      port: smtp.puerto,
      secure: smtp.seguro,
      auth: smtp.usuario ? { user: smtp.usuario, pass: smtp.contrasena } : undefined,
      // Un servidor que no contesta no debe dejar envíos colgados.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
    await this.transportador.sendMail({ from: remitente, to: email.para, subject: email.asunto, text: email.texto });
  }
}

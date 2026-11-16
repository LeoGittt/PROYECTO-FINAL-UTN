import { Logger } from '@nestjs/common';

// Las pruebas muestran solo advertencias y errores de Nest, no el log informativo de cada arranque.
Logger.overrideLogger(['error', 'warn']);

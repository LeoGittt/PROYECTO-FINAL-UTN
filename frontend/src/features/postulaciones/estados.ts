import type { EstadoPostulacion } from "@/lib/api/types";
import { ESTADO_POSTULACION_ETIQUETA } from "@/lib/labels";

/**
 * Máquina de estados de una postulación (contrato 5.4). Solo el estudiante dueño puede pasar a
 * `retirada` y solo el publicador puede pasar a los demás estados. `aceptada`, `rechazada` y
 * `retirada` son finales. El backend es quien decide (409 ante una transición inválida): esto
 * solo evita ofrecer botones que seguro van a fallar.
 */
const TRANSICIONES: Record<EstadoPostulacion, EstadoPostulacion[]> = {
  pendiente: ["en_revision", "entrevista", "rechazada", "retirada"],
  en_revision: ["entrevista", "aceptada", "rechazada", "retirada"],
  entrevista: ["aceptada", "rechazada", "retirada"],
  aceptada: [],
  rechazada: [],
  retirada: [],
};

export type ActorPostulacion = "estudiante" | "publicador";

export function transicionesPermitidas(estado: EstadoPostulacion, actor: ActorPostulacion): EstadoPostulacion[] {
  return TRANSICIONES[estado].filter((destino) => (actor === "estudiante" ? destino === "retirada" : destino !== "retirada"));
}

export interface PasoLinea {
  estado: EstadoPostulacion;
  etiqueta: string;
  situacion: "hecho" | "actual" | "siguiente";
}

/**
 * Pasos de la línea de tiempo: pendiente, en revisión, entrevista y el desenlace (aceptada, o
 * rechazada / retirada si terminó mal). Se calcula solo con el estado actual: un paso anterior figura
 * como hecho aunque el publicador lo haya salteado (el historial con fechas se muestra aparte).
 */
export function pasosDeLinea(estadoActual: EstadoPostulacion): PasoLinea[] {
  const desenlace = estadoActual === "rechazada" || estadoActual === "retirada" ? estadoActual : "aceptada";
  const secuencia: EstadoPostulacion[] = ["pendiente", "en_revision", "entrevista", desenlace];
  const actual = secuencia.indexOf(estadoActual);

  return secuencia.map((estado, i) => ({
    estado,
    etiqueta: ESTADO_POSTULACION_ETIQUETA[estado],
    situacion: i < actual ? "hecho" : i === actual ? "actual" : "siguiente",
  }));
}

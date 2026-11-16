import { describe, expect, it } from 'vitest';
import { calcularMetricas } from './evaluacion.js';

// Estudiante 1: puntajes 0.9 (p10), 0.8 (p11), 0.7 (p12), 0.3 (p13). Estudiante 2: 0.6 (p10), 0.2 (p11).
const PUNTAJES = [
  { idEstudiante: 1, idProyecto: 10, total: 0.9 },
  { idEstudiante: 1, idProyecto: 11, total: 0.8 },
  { idEstudiante: 1, idProyecto: 12, total: 0.7 },
  { idEstudiante: 1, idProyecto: 13, total: 0.3 },
  { idEstudiante: 2, idProyecto: 10, total: 0.6 },
  { idEstudiante: 2, idProyecto: 11, total: 0.2 },
];

describe('calcularMetricas (RF-10)', () => {
  it('precisión y recall globales solo sobre pares etiquetados', () => {
    const referencia = [
      { idEstudiante: 1, idProyecto: 10, esRelevante: true }, // recomendado y relevante
      { idEstudiante: 1, idProyecto: 11, esRelevante: false }, // recomendado, no relevante
      { idEstudiante: 1, idProyecto: 13, esRelevante: true }, // relevante no recomendado (0.3 < 0.5)
      { idEstudiante: 2, idProyecto: 10, esRelevante: true }, // recomendado y relevante
    ];
    const metricas = calcularMetricas(PUNTAJES, referencia, 0.5, 5);
    // Recomendados etiquetados: 3 (p10, p11 del 1 y p10 del 2), de los cuales 2 son relevantes.
    expect(metricas.precisionGlobal).toBe(0.6667);
    // Relevantes etiquetados: 3, de los cuales 2 quedaron recomendados.
    expect(metricas.recallGlobal).toBe(0.6667);
    expect(metricas.cantidadEstudiantes).toBe(2);
  });

  it('precisión en el top-k: promedio por estudiante entre los etiquetados de sus k mejores recomendados', () => {
    const referencia = [
      { idEstudiante: 1, idProyecto: 10, esRelevante: true },
      { idEstudiante: 1, idProyecto: 11, esRelevante: false },
      { idEstudiante: 1, idProyecto: 12, esRelevante: true }, // tercero: queda fuera del top-2
      { idEstudiante: 2, idProyecto: 10, esRelevante: true },
    ];
    // Top-2 del 1: p10 (relevante) y p11 (no) = 0,5. Top-2 del 2: p10 (relevante) = 1. Promedio 0,75.
    expect(calcularMetricas(PUNTAJES, referencia, 0.5, 2).precisionTopK).toBe(0.75);
    // Con k = 3 entra p12 para el 1: 2 de 3. Promedio (0,6667 + 1) / 2.
    expect(calcularMetricas(PUNTAJES, referencia, 0.5, 3).precisionTopK).toBe(0.8333);
  });

  it('un estudiante sin etiquetados en su top-k no cuenta para el promedio del top-k', () => {
    const referencia = [
      { idEstudiante: 1, idProyecto: 10, esRelevante: true },
      { idEstudiante: 2, idProyecto: 11, esRelevante: true }, // 0.2: no está entre sus recomendados
    ];
    expect(calcularMetricas(PUNTAJES, referencia, 0.5, 5).precisionTopK).toBe(1);
  });

  it('un par etiquetado sin puntaje (proyecto en borrador o estudiante inactivo) cuenta como no recomendado', () => {
    const referencia = [{ idEstudiante: 9, idProyecto: 99, esRelevante: true }];
    expect(calcularMetricas(PUNTAJES, referencia, 0.5, 5)).toEqual({
      cantidadEstudiantes: 1,
      precisionGlobal: 0,
      recallGlobal: 0,
      precisionTopK: 0,
    });
  });

  it('sin divisiones por cero: sin recomendados ni relevantes las métricas valen 0', () => {
    const referencia = [{ idEstudiante: 1, idProyecto: 13, esRelevante: false }];
    expect(calcularMetricas(PUNTAJES, referencia, 0.5, 5)).toEqual({
      cantidadEstudiantes: 1,
      precisionGlobal: 0,
      recallGlobal: 0,
      precisionTopK: 0,
    });
  });
});

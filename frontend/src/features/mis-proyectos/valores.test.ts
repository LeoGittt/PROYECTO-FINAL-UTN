import { describe, expect, it } from "vitest";
import type { ProyectoDto } from "@/lib/api/types";
import { payloadProyecto, validarProyecto, valoresDesdeProyecto, valoresIniciales, type ValoresProyecto } from "./valores";

function validos(extra: Partial<ValoresProyecto> = {}): ValoresProyecto {
  return {
    ...valoresIniciales(),
    titulo: "Sistema de turnos para un club",
    descripcion: "Aplicación web para reservar canchas y administrar socios del club.",
    duracionSemanas: "8",
    horasSemanales: "10",
    anioMinimo: "1",
    cupos: "2",
    modalidad: "remoto",
    tipoRetribucion: "certificado",
    ...extra,
  };
}

describe("valoresIniciales", () => {
  it("arranca con año mínimo 1 y un cupo, y sin modalidad ni retribución elegidas", () => {
    expect(valoresIniciales()).toMatchObject({
      anioMinimo: "1",
      cupos: "1",
      modalidad: "",
      tipoRetribucion: "",
      tecnologias: [],
      habilidades: [],
    });
  });
});

describe("validarProyecto", () => {
  it("un proyecto completo no tiene errores", () => {
    expect(validarProyecto(validos())).toEqual({});
  });

  it("pide los campos obligatorios, con un mensaje por campo", () => {
    const errores = validarProyecto(valoresIniciales());
    expect(errores).toMatchObject({
      titulo: "Ingresá el título del proyecto.",
      descripcion: "Describí el proyecto para que los estudiantes entiendan de qué se trata.",
      duracionSemanas: "Ingresá la duración en semanas.",
      horasSemanales: "Ingresá las horas semanales que requiere.",
      modalidad: "Elegí la modalidad.",
      tipoRetribucion: "Elegí el tipo de retribución.",
    });
    expect(errores.anioMinimo).toBeUndefined();
    expect(errores.cupos).toBeUndefined();
  });

  it("aplica los límites de la base: título 150, duración 1 a 52, horas 1 a 40, año 1 a 6, cupos 1 a 20, detalle 300", () => {
    const errores = validarProyecto(
      validos({
        titulo: "x".repeat(151),
        duracionSemanas: "53",
        horasSemanales: "41",
        anioMinimo: "7",
        cupos: "21",
        detalleRetribucion: "x".repeat(301),
      }),
    );
    expect(errores.titulo).toBe("El título no puede superar los 150 caracteres.");
    expect(errores.duracionSemanas).toBe("La duración debe ser un número entero de semanas entre 1 y 52.");
    expect(errores.horasSemanales).toBe("Las horas semanales deben ser un número entero entre 1 y 40.");
    expect(errores.anioMinimo).toBe("El año mínimo debe ser un número entero entre 1 y 6.");
    expect(errores.cupos).toBe("Los cupos deben ser un número entero entre 1 y 20.");
    expect(errores.detalleRetribucion).toBe("El detalle no puede superar los 300 caracteres.");
  });

  it("rechaza decimales, ceros y números negativos", () => {
    const errores = validarProyecto(validos({ duracionSemanas: "2.5", horasSemanales: "0", cupos: "-1" }));
    expect(errores.duracionSemanas).toBeDefined();
    expect(errores.horasSemanales).toBeDefined();
    expect(errores.cupos).toBeDefined();
  });

  it("exige un título y una descripción con contenido real, no solo espacios", () => {
    const errores = validarProyecto(validos({ titulo: "ab", descripcion: "corta" }));
    expect(errores.titulo).toBe("El título debe tener al menos 5 caracteres.");
    expect(errores.descripcion).toBe("La descripción debe tener al menos 20 caracteres.");
    expect(validarProyecto(validos({ titulo: "      " })).titulo).toBe("Ingresá el título del proyecto.");
  });

  it("limita los textos largos opcionales a 2000 caracteres", () => {
    const errores = validarProyecto(validos({ objetivos: "x".repeat(2001), perfilBuscado: "x".repeat(2001) }));
    expect(errores.objetivos).toBe("Los objetivos no pueden superar los 2000 caracteres.");
    expect(errores.perfilBuscado).toBe("El perfil buscado no puede superar los 2000 caracteres.");
  });
});

describe("payloadProyecto (cuerpo exacto del contrato)", () => {
  it("convierte los textos en números, recorta espacios y manda null en los opcionales vacíos", () => {
    expect(payloadProyecto(validos({ titulo: "  Sistema de turnos  " }), false)).toEqual({
      titulo: "Sistema de turnos",
      descripcion: "Aplicación web para reservar canchas y administrar socios del club.",
      objetivos: null,
      perfilBuscado: null,
      duracionSemanas: 8,
      horasSemanales: 10,
      anioMinimo: 1,
      cupos: 2,
      modalidad: "remoto",
      tipoRetribucion: "certificado",
      detalleRetribucion: null,
      tecnologias: [],
      habilidades: [],
      publicar: false,
    });
  });

  it("incluye tecnologías con su obligatoriedad, habilidades y publicar: true al publicar", () => {
    const payload = payloadProyecto(
      validos({
        objetivos: " Entregar un MVP ",
        detalleRetribucion: "USD 300 por mes",
        tecnologias: [
          { idTecnologia: 3, obligatoria: true },
          { idTecnologia: 5, obligatoria: false },
        ],
        habilidades: [1, 2],
      }),
      true,
    );
    expect(payload).toMatchObject({
      objetivos: "Entregar un MVP",
      detalleRetribucion: "USD 300 por mes",
      tecnologias: [
        { idTecnologia: 3, obligatoria: true },
        { idTecnologia: 5, obligatoria: false },
      ],
      habilidades: [1, 2],
      publicar: true,
    });
  });

  it("en la edición no manda `publicar`", () => {
    expect(payloadProyecto(validos())).not.toHaveProperty("publicar");
  });
});

describe("valoresDesdeProyecto", () => {
  const proyecto: ProyectoDto = {
    idProyecto: 4,
    titulo: "Panel de métricas",
    descripcion: "Tablero para el área comercial.",
    objetivos: null,
    perfilBuscado: "Estudiantes de segundo año",
    duracionSemanas: 12,
    horasSemanales: 15,
    anioMinimo: 2,
    cupos: 3,
    modalidad: "hibrido",
    tipoRetribucion: "remunerado",
    detalleRetribucion: "USD 200",
    estado: "borrador",
    fechaPublicacion: null,
    fechaCierre: null,
    publicador: { tipo: "empresa", id: 1, nombre: "Acme SA", idUsuario: 9 },
    tecnologias: [{ idTecnologia: 3, nombre: "React", categoria: "frontend", obligatoria: true }],
    habilidades: [{ idHabilidad: 1, nombre: "Trabajo en equipo" }],
  };

  it("lleva el proyecto del servidor a valores de formulario (textos para los números, vacío para los null)", () => {
    expect(valoresDesdeProyecto(proyecto)).toEqual({
      titulo: "Panel de métricas",
      descripcion: "Tablero para el área comercial.",
      objetivos: "",
      perfilBuscado: "Estudiantes de segundo año",
      duracionSemanas: "12",
      horasSemanales: "15",
      anioMinimo: "2",
      cupos: "3",
      modalidad: "hibrido",
      tipoRetribucion: "remunerado",
      detalleRetribucion: "USD 200",
      tecnologias: [{ idTecnologia: 3, obligatoria: true }],
      habilidades: [1],
    });
  });

  it("ida y vuelta: lo que se carga se vuelve a enviar igual", () => {
    const payload = payloadProyecto(valoresDesdeProyecto(proyecto));
    expect(payload).toMatchObject({
      titulo: "Panel de métricas",
      duracionSemanas: 12,
      tecnologias: [{ idTecnologia: 3, obligatoria: true }],
      habilidades: [1],
    });
  });
});

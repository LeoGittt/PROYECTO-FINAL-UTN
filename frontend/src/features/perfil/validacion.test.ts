import { describe, expect, it } from "vitest";
import { CARRERAS } from "@/test/fixtures";
import { validarDocente, validarEmpresa, validarEstudiante, validarUrlOpcional } from "./validacion";
import { ESTUDIANTE_VACIO, type ValoresEstudiante } from "./valores";

const TUP = CARRERAS[0]; // 2 años
const valido: ValoresEstudiante = {
  ...ESTUDIANTE_VACIO,
  idCarrera: String(TUP.idCarrera),
  anioCursada: "2",
  horasSemanales: "10",
};

describe("validarUrlOpcional", () => {
  it("acepta vacío (es opcional) y URLs http o https", () => {
    expect(validarUrlOpcional("")).toBeUndefined();
    expect(validarUrlOpcional("   ")).toBeUndefined();
    expect(validarUrlOpcional("https://github.com/ana")).toBeUndefined();
    expect(validarUrlOpcional("http://localhost:3000/cv.pdf")).toBeUndefined();
  });

  it.each(["github.com/ana", "ftp://sitio.com/cv", "javascript:alert(1)", "no es una url"])(
    "rechaza %j",
    (valor) => {
      expect(validarUrlOpcional(valor)).toBe("Ingresá una URL válida que empiece con http:// o https://.");
    },
  );

  it("limita el largo a 300 caracteres", () => {
    expect(validarUrlOpcional(`https://sitio.com/${"a".repeat(300)}`)).toBe("La URL no puede superar los 300 caracteres.");
  });
});

describe("validarEstudiante", () => {
  it("acepta lo mínimo obligatorio: carrera, año y horas", () => {
    expect(validarEstudiante(valido, CARRERAS)).toEqual({});
  });

  it("pide los tres obligatorios cuando el formulario está vacío", () => {
    expect(validarEstudiante(ESTUDIANTE_VACIO, CARRERAS)).toEqual({
      idCarrera: "Elegí tu carrera.",
      anioCursada: "Elegí tu año de cursada.",
      horasSemanales: "Ingresá cuántas horas por semana tenés disponibles.",
    });
  });

  it("rechaza un año de cursada mayor que la duración de la carrera, diciendo cuánto dura", () => {
    const errores = validarEstudiante({ ...valido, anioCursada: "3" }, CARRERAS);
    expect(errores.anioCursada).toBe("El año de cursada no puede superar la duración de la carrera (2 años).");
  });

  it("acepta ese mismo año en una carrera más larga", () => {
    const ingenieria = { ...valido, idCarrera: "2", anioCursada: "3" };
    expect(validarEstudiante(ingenieria, CARRERAS)).toEqual({});
  });

  it("usa el singular para una carrera de un año", () => {
    const corta = [{ idCarrera: 9, nombre: "Curso", duracionAnios: 1 }];
    const errores = validarEstudiante({ ...valido, idCarrera: "9", anioCursada: "2" }, corta);
    expect(errores.anioCursada).toBe("El año de cursada no puede superar la duración de la carrera (1 año).");
  });

  it.each(["0", "7", "1.5", "abc"])("rechaza el año %j por fuera de 1 a 6", (anio) => {
    expect(validarEstudiante({ ...valido, anioCursada: anio }, CARRERAS).anioCursada).toBe(
      "El año de cursada debe estar entre 1 y 6.",
    );
  });

  it.each(["0", "61", "2.5", "abc", "-3"])("rechaza %j horas semanales (entero de 1 a 60)", (horas) => {
    expect(validarEstudiante({ ...valido, horasSemanales: horas }, CARRERAS).horasSemanales).toBe(
      "Las horas semanales deben ser un número entero entre 1 y 60.",
    );
  });

  it.each(["1", "60"])("acepta %s hora(s) semanal(es), el borde del rango", (horas) => {
    expect(validarEstudiante({ ...valido, horasSemanales: horas }, CARRERAS)).toEqual({});
  });

  it("limita los textos largos a 2000 caracteres y valida cada enlace", () => {
    const errores = validarEstudiante(
      {
        ...valido,
        descripcion: "d".repeat(2001),
        proyectosPrevios: "p".repeat(2001),
        githubUrl: "github.com/ana",
        portfolioUrl: "x",
        cvUrl: "ftp://cv",
      },
      CARRERAS,
    );
    expect(errores.descripcion).toBe("La descripción no puede superar los 2000 caracteres.");
    expect(errores.proyectosPrevios).toBe("Los proyectos previos no pueden superar los 2000 caracteres.");
    expect(errores.githubUrl).toBeDefined();
    expect(errores.portfolioUrl).toBeDefined();
    expect(errores.cvUrl).toBeDefined();
  });
});

describe("validarEmpresa", () => {
  const completa = { nombreEmpresa: "Acme SA", sector: "IT", descripcion: "", contacto: "rrhh@acme.com", sitioWeb: "" };

  it("acepta los tres obligatorios", () => {
    expect(validarEmpresa(completa)).toEqual({});
  });

  it("pide nombre, sector y contacto", () => {
    expect(validarEmpresa({ ...completa, nombreEmpresa: " ", sector: "", contacto: "" })).toEqual({
      nombreEmpresa: "Ingresá el nombre de la empresa.",
      sector: "Ingresá el sector o rubro de la empresa.",
      contacto: "Ingresá un dato de contacto (email o teléfono).",
    });
  });

  it("valida el sitio web y los largos máximos", () => {
    const errores = validarEmpresa({
      nombreEmpresa: "n".repeat(151),
      sector: "s".repeat(101),
      contacto: "c".repeat(151),
      descripcion: "d".repeat(2001),
      sitioWeb: "www.acme.com",
    });
    expect(Object.keys(errores).sort()).toEqual(["contacto", "descripcion", "nombreEmpresa", "sector", "sitioWeb"]);
  });
});

describe("validarDocente", () => {
  it("solo exige la cátedra", () => {
    expect(validarDocente({ catedra: "Programación III", areaInvestigacion: "", descripcion: "" })).toEqual({});
    expect(validarDocente({ catedra: "  ", areaInvestigacion: "", descripcion: "" })).toEqual({
      catedra: "Ingresá el nombre de tu cátedra.",
    });
  });

  it("limita el área de investigación y la descripción", () => {
    const errores = validarDocente({ catedra: "X", areaInvestigacion: "a".repeat(151), descripcion: "d".repeat(2001) });
    expect(errores.areaInvestigacion).toBe("El área no puede superar los 150 caracteres.");
    expect(errores.descripcion).toBe("La descripción no puede superar los 2000 caracteres.");
  });
});

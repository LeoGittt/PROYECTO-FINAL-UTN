import { describe, expect, it } from "vitest";
import {
  contrasenaValida,
  esRolRegistrable,
  reglasContrasena,
  validarEmail,
  validarLogin,
  validarRegistro,
} from "./validacion";

describe("validarEmail", () => {
  it("pide el email cuando está vacío o son solo espacios", () => {
    expect(validarEmail("")).toBe("Ingresá tu email.");
    expect(validarEmail("   ")).toBe("Ingresá tu email.");
  });

  it.each(["ana", "ana@", "ana@dominio", "@dominio.com", "ana perez@dominio.com", "ana@@dominio.com"])(
    "rechaza %j con un mensaje que muestra el formato esperado",
    (valor) => {
      expect(validarEmail(valor)).toBe("Ingresá un email válido, por ejemplo nombre@dominio.com.");
    },
  );

  it("acepta emails válidos, con espacios alrededor", () => {
    expect(validarEmail("ana@utn.edu.ar")).toBeUndefined();
    expect(validarEmail("  ana.perez+utn@dominio.com  ")).toBeUndefined();
  });

  it("limita el largo a 160 caracteres", () => {
    expect(validarEmail(`${"a".repeat(150)}@dominio.com`)).toBe("El email no puede superar los 160 caracteres.");
  });
});

describe("reglas de contraseña", () => {
  it("evalúa cada regla por separado", () => {
    expect(reglasContrasena("abc")).toEqual({ largo: false, letra: true, numero: false });
    expect(reglasContrasena("12345678")).toEqual({ largo: true, letra: false, numero: true });
    expect(reglasContrasena("abcdefgh")).toEqual({ largo: true, letra: true, numero: false });
    expect(reglasContrasena("clave1234")).toEqual({ largo: true, letra: true, numero: true });
  });

  it("cuenta letras con tilde y eñe", () => {
    expect(contrasenaValida("contraseña1")).toBe(true);
    expect(contrasenaValida("ñandú123")).toBe(true);
  });

  it("exige las tres reglas juntas", () => {
    expect(contrasenaValida("abc1234")).toBe(false); // 7 caracteres
    expect(contrasenaValida("12345678")).toBe(false); // sin letra
    expect(contrasenaValida("abcdefgh")).toBe(false); // sin número
    expect(contrasenaValida("abcd1234")).toBe(true);
  });
});

describe("validarLogin", () => {
  it("devuelve un error por campo vacío", () => {
    expect(validarLogin({ email: "", contrasena: "" })).toEqual({
      email: "Ingresá tu email.",
      contrasena: "Ingresá tu contraseña.",
    });
  });

  it("no valida la fuerza de la contraseña al ingresar (solo que exista)", () => {
    expect(validarLogin({ email: "ana@utn.edu.ar", contrasena: "x" })).toEqual({});
  });
});

describe("validarRegistro", () => {
  const valido = { nombre: "Ana", apellido: "Pérez", email: "ana@utn.edu.ar", contrasena: "clave1234" };

  it("acepta datos válidos", () => {
    expect(validarRegistro(valido)).toEqual({});
  });

  it("informa todos los campos obligatorios a la vez", () => {
    expect(validarRegistro({ nombre: " ", apellido: "", email: "", contrasena: "" })).toEqual({
      nombre: "Ingresá tu nombre.",
      apellido: "Ingresá tu apellido.",
      email: "Ingresá tu email.",
      contrasena: "Elegí una contraseña.",
    });
  });

  it("explica la regla completa de la contraseña", () => {
    expect(validarRegistro({ ...valido, contrasena: "corta1" }).contrasena).toBe(
      "La contraseña debe tener al menos 8 caracteres, con una letra y un número.",
    );
  });

  it("limita nombre y apellido a 80 caracteres", () => {
    const errores = validarRegistro({ ...valido, nombre: "n".repeat(81), apellido: "a".repeat(81) });
    expect(errores.nombre).toBe("El nombre no puede superar los 80 caracteres.");
    expect(errores.apellido).toBe("El apellido no puede superar los 80 caracteres.");
  });
});

describe("esRolRegistrable", () => {
  it("acepta estudiante, empresa y docente, pero nunca administrador", () => {
    expect(esRolRegistrable("estudiante")).toBe(true);
    expect(esRolRegistrable("empresa")).toBe(true);
    expect(esRolRegistrable("docente")).toBe(true);
    expect(esRolRegistrable("administrador")).toBe(false);
    expect(esRolRegistrable(null)).toBe(false);
    expect(esRolRegistrable(undefined)).toBe(false);
  });
});

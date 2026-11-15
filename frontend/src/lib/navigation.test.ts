import { describe, expect, it } from "vitest";
import type { Rol } from "@/lib/api/types";
import { elegirActivo, estaActivo, navegacionParaRol } from "./navigation";

const hrefs = (rol: Rol) => navegacionParaRol(rol).flatMap((g) => g.items.map((i) => i.href));

describe("navegacionParaRol", () => {
  it("el estudiante ve recomendaciones, búsqueda, postulaciones e invitaciones, pero no publicar ni administrar", () => {
    const rutas = hrefs("estudiante");
    expect(rutas).toEqual(
      expect.arrayContaining(["/panel", "/recomendaciones", "/proyectos", "/postulaciones", "/invitaciones", "/perfil"]),
    );
    expect(rutas).not.toContain("/mis-proyectos/nuevo");
    expect(rutas.some((r) => r.startsWith("/admin"))).toBe(false);
  });

  it.each(["empresa", "docente"] as const)("%s puede publicar y gestionar sus proyectos, pero no ve lo del estudiante", (rol) => {
    const rutas = hrefs(rol);
    expect(rutas).toEqual(expect.arrayContaining(["/mis-proyectos", "/mis-proyectos/nuevo", "/perfil"]));
    expect(rutas).not.toContain("/recomendaciones");
    expect(rutas).not.toContain("/postulaciones");
    expect(rutas.some((r) => r.startsWith("/admin"))).toBe(false);
  });

  it("el administrador ve solo administración (sin perfil, porque no tiene)", () => {
    const rutas = hrefs("administrador");
    expect(rutas).toEqual(
      expect.arrayContaining(["/admin/dashboard", "/admin/usuarios", "/admin/proyectos", "/admin/catalogos", "/admin/motor"]),
    );
    expect(rutas).not.toContain("/perfil");
    expect(rutas).not.toContain("/mis-proyectos");
  });

  it("no repite destinos dentro de un mismo rol", () => {
    for (const rol of ["estudiante", "empresa", "docente", "administrador"] as const) {
      expect(new Set(hrefs(rol)).size).toBe(hrefs(rol).length);
    }
  });
});

describe("elegirActivo", () => {
  const grupos = navegacionParaRol("empresa");

  it("coincide con la ruta exacta y con sus subrutas", () => {
    expect(estaActivo("/mis-proyectos", "/mis-proyectos")).toBe(true);
    expect(estaActivo("/mis-proyectos", "/mis-proyectos/4/postulantes")).toBe(true);
    expect(estaActivo("/mis-proyectos", "/mis-proyectos-viejos")).toBe(false);
  });

  it("entre dos ítems que coinciden gana el más específico", () => {
    expect(elegirActivo(grupos, "/mis-proyectos")).toBe("/mis-proyectos");
    expect(elegirActivo(grupos, "/mis-proyectos/nuevo")).toBe("/mis-proyectos/nuevo");
    expect(elegirActivo(grupos, "/mis-proyectos/12")).toBe("/mis-proyectos");
  });

  it("devuelve null si ninguna entrada corresponde", () => {
    expect(elegirActivo(grupos, "/otra-cosa")).toBeNull();
  });
});

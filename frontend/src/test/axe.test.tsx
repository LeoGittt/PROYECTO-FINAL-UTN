import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { violacionesA11y } from "./axe";

describe("violacionesA11y", () => {
  it("detecta un campo sin etiqueta y una imagen sin texto alternativo", async () => {
    render(
      <main>
        <input type="text" />
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- el error es a propósito */}
        <img src="/logo.png" />
      </main>,
    );
    const violaciones = await violacionesA11y();
    expect(violaciones.some((v) => v.startsWith("label:"))).toBe(true);
    expect(violaciones.some((v) => v.startsWith("image-alt:"))).toBe(true);
  });

  it("no marca nada en un formulario bien etiquetado", async () => {
    render(
      <main>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" />
      </main>,
    );
    expect(await violacionesA11y()).toEqual([]);
  });
});

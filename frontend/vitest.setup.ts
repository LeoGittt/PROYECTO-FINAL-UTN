import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { clearToken } from "@/lib/api/token";

afterEach(() => {
  cleanup();
  // clearToken() limpia también la copia en memoria, que sobreviviría entre tests.
  clearToken();
  try {
    window.localStorage.clear();
  } catch {
    // jsdom siempre ofrece localStorage; el try/catch solo evita ruido en entornos raros.
  }
});

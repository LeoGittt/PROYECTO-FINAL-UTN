/**
 * Constantes del tema que también necesita el layout del servidor. Viven aparte de
 * tema.ts porque ese archivo usa hooks de React, que no pueden importarse desde un
 * componente de servidor.
 */

export const TEMA_STORAGE_KEY = "utnmatch.tema";

/**
 * Script en línea para el <head>: aplica el tema guardado antes de pintar y evita el
 * destello del tema equivocado. Mantenerlo mínimo y sin dependencias.
 */
export const SCRIPT_TEMA = `(function(){try{var t=window.localStorage.getItem("${TEMA_STORAGE_KEY}");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t);}}catch(e){}})();`;

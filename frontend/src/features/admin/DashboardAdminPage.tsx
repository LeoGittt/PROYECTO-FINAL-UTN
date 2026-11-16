"use client";

import type { ReactNode } from "react";
import { AsyncView } from "@/components/ui/AsyncView";
import { Card, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { RegionCargando, SkeletonCard } from "@/components/ui/Skeleton";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/Table";
import { api } from "@/lib/api/endpoints";
import type { Dashboard, EstadoPostulacion, EstadoProyecto, ResumenReportes } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { formatearMes, formatearNumero, formatearPorcentaje } from "@/lib/format";
import { useApiQuery } from "@/lib/hooks/useApiQuery";
import { ESTADO_POSTULACION_ETIQUETA, ESTADO_PROYECTO_ETIQUETA } from "@/lib/labels";

// Los gráficos son HTML y CSS: cada número está escrito como texto (en una lista o en una tabla) y la
// barra de color solo lo refuerza, así que se lee igual con lector de pantalla, sin color y en los dos temas.

/** Porcentajes que ya vienen de 0 a 100 desde las vistas SQL (con un decimal). */
const pct = (valor: number | null) => (valor === null ? "—" : `${formatearNumero(valor)} %`);

function Barra({ proporcion, color = "bg-primary" }: { proporcion: number; color?: string }) {
  const ancho = Number.isFinite(proporcion) ? Math.min(1, Math.max(0, proporcion)) * 100 : 0;
  return (
    <span aria-hidden="true" className="block h-2.5 w-full min-w-16 overflow-hidden rounded-full bg-sunken">
      <span className={cn("block h-full rounded-full", color)} style={{ width: `${ancho}%` }} />
    </span>
  );
}

interface FilaBarra {
  etiqueta: string;
  valor: number;
  texto: string;
  detalle?: string;
}

/** Barras horizontales con su etiqueta y su número escritos. Sin `maximo`, la barra más larga es el mayor valor. */
function Barras({ etiqueta, filas, maximo }: { etiqueta: string; filas: FilaBarra[]; maximo?: number }) {
  const tope = maximo ?? Math.max(1, ...filas.map((f) => f.valor));
  return (
    <ul aria-label={etiqueta} className="flex flex-col gap-3">
      {filas.map((f) => (
        <li key={f.etiqueta} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-semibold text-ink">{f.etiqueta}</span>
            <span className="text-right tabular-nums text-ink">
              {f.texto}
              {f.detalle && <span className="text-muted"> · {f.detalle}</span>}
            </span>
          </div>
          <Barra proporcion={f.valor / tope} />
        </li>
      ))}
    </ul>
  );
}

/** Celda de tabla con el valor escrito y una barra al lado. */
function CeldaBarra({ texto, proporcion, color }: { texto: string; proporcion: number; color?: string }) {
  return (
    <Td>
      <span className="flex items-center gap-3">
        <span className="w-20 shrink-0 tabular-nums">{texto}</span>
        <Barra proporcion={proporcion} color={color} />
      </span>
    </Td>
  );
}

function Bloque({ titulo, descripcion, children, className }: { titulo: string; descripcion?: string; children: ReactNode; className?: string }) {
  return (
    <Card como="section" variante="plana" aria-label={titulo} className={cn("flex flex-col gap-4", className)}>
      <div>
        <CardTitle como="h3" className="text-lg">{titulo}</CardTitle>
        {descripcion && <p className="mt-1 text-sm text-muted">{descripcion}</p>}
      </div>
      {children}
    </Card>
  );
}

const SinDatos = ({ children }: { children: string }) => <p className="text-sm text-muted">{children}</p>;

const cargando = (etiqueta: string) => (
  <RegionCargando etiqueta={etiqueta}>
    <div className="grid gap-4 md:grid-cols-2">
      <SkeletonCard />
      <SkeletonCard />
    </div>
  </RegionCargando>
);

/** `/admin/dashboard`: el resumen de RF-07 (`GET /reportes/resumen`) y las métricas de RF-11 (`GET /reportes/dashboard`). */
export function DashboardAdminPage() {
  const resumen = useApiQuery("reportes:resumen", (signal) => api.reportes.resumen({ signal }));
  const dashboard = useApiQuery("reportes:dashboard", (signal) => api.reportes.dashboard({ signal }));

  return (
    <>
      <PageHeader
        etiqueta="Administración"
        titulo="Dashboard de métricas"
        descripcion="Qué tecnologías pide el mercado, cuántos estudiantes consiguen experiencia y qué tan bien recomienda el motor."
      />
      <div className="flex flex-col gap-10">
        <section aria-labelledby="titulo-resumen">
          <h2 id="titulo-resumen" className="mb-4 text-2xl font-bold">
            Resumen de la plataforma
          </h2>
          <AsyncView consulta={resumen} cargando={cargando("Cargando el resumen")} tituloError="No pudimos cargar el resumen">
            {(datos) => <Resumen datos={datos} />}
          </AsyncView>
        </section>

        <section aria-labelledby="titulo-metricas">
          <h2 id="titulo-metricas" className="mb-4 text-2xl font-bold">
            Métricas de uso
          </h2>
          <AsyncView consulta={dashboard} cargando={cargando("Cargando las métricas")} tituloError="No pudimos cargar las métricas">
            {(datos) => <Metricas datos={datos} />}
          </AsyncView>
        </section>
      </div>
    </>
  );
}

function Resumen({ datos }: { datos: ResumenReportes }) {
  const estadosProyecto = Object.keys(ESTADO_PROYECTO_ETIQUETA) as EstadoProyecto[];
  const estadosPostulacion = Object.keys(ESTADO_POSTULACION_ETIQUETA) as EstadoPostulacion[];
  return (
    <div className="flex flex-col gap-4">
      <dl className="grid gap-4 sm:grid-cols-3">
        {([
          ["Estudiantes activos", datos.estudiantesActivos],
          ["Empresas activas", datos.empresasActivas],
          ["Docentes activos", datos.docentesActivos],
        ] as const).map(([etiqueta, valor]) => (
          <Card key={etiqueta} variante="elevada">
            <dt className="text-sm font-semibold text-muted">{etiqueta}</dt>
            <dd className="mt-1 font-display text-4xl font-bold tabular-nums text-ink">{formatearNumero(valor)}</dd>
          </Card>
        ))}
      </dl>
      <div className="grid gap-4 md:grid-cols-2">
        <Bloque titulo="Proyectos por estado">
          <Barras
            etiqueta="Proyectos por estado"
            filas={estadosProyecto.map((estado) => {
              const n = datos.proyectosPorEstado[estado] ?? 0;
              return { etiqueta: ESTADO_PROYECTO_ETIQUETA[estado], valor: n, texto: formatearNumero(n) };
            })}
          />
        </Bloque>
        <Bloque titulo="Postulaciones por estado">
          <Barras
            etiqueta="Postulaciones por estado"
            filas={estadosPostulacion.map((estado) => {
              const n = datos.postulacionesPorEstado[estado] ?? 0;
              return { etiqueta: ESTADO_POSTULACION_ETIQUETA[estado], valor: n, texto: formatearNumero(n) };
            })}
          />
        </Bloque>
      </div>
    </div>
  );
}

/** Todos los meses ("2026-06", "2026-07", …) entre el primero y el último de la lista. */
function mesesSeguidos(meses: string[]): string[] {
  if (meses.length === 0) return [];
  const ordenados = [...meses].sort();
  let [anio, mes] = ordenados[0].split("-").map(Number);
  const ultimo = ordenados[ordenados.length - 1];
  const resultado: string[] = [];
  for (;;) {
    const actual = `${anio}-${String(mes).padStart(2, "0")}`;
    resultado.push(actual);
    if (actual >= ultimo) return resultado;
    mes += 1;
    if (mes > 12) {
      mes = 1;
      anio += 1;
    }
  }
}

function Metricas({ datos }: { datos: Dashboard }) {
  const ranking = [...datos.tecnologiasDemandadas.ranking].sort((a, b) => b.cantidadProyectos - a.cantidadProyectos);
  const evolucion = datos.tecnologiasDemandadas.evolucion;
  // Columnas: los últimos 12 meses, seguidos ("2026-09"), aunque alguno no tenga proyectos;
  // filas: las 5 tecnologías más pedidas.
  const meses = mesesSeguidos(evolucion.map((e) => e.mes.slice(0, 7))).slice(-12);
  const tecnologias = ranking.slice(0, 5).map((r) => r.tecnologia);
  const proyectosEn = (tecnologia: string, mes: string) =>
    evolucion
      .filter((e) => e.tecnologia === tecnologia && e.mes.startsWith(mes))
      .reduce((suma, e) => suma + e.cantidadProyectos, 0);
  const maximoMes = Math.max(1, ...evolucion.map((e) => e.cantidadProyectos));

  const totalPostulaciones = datos.embudo.reduce((s, m) => s + m.postulaciones, 0);
  const totalEntrevistas = datos.embudo.reduce((s, m) => s + m.entrevistas, 0);
  const totalCerrados = datos.embudo.reduce((s, m) => s + m.proyectosCerrados, 0);
  const conversion = (parte: number, total: number) => (total === 0 ? null : Math.round((1000 * parte) / total) / 10);

  const { promedioDias, estudiantes } = datos.tiempoPrimerProyecto;
  const carreras = [...datos.matchPorCarreraAnio].sort(
    (a, b) => a.carrera.localeCompare(b.carrera, "es") || a.anioCursada - b.anioCursada,
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Bloque titulo="Tecnologías más demandadas" descripcion="Cuántos proyectos publicados piden cada una.">
        {ranking.length === 0 ? (
          <SinDatos>Todavía no hay proyectos publicados con tecnologías.</SinDatos>
        ) : (
          <Barras
            etiqueta="Tecnologías más demandadas"
            filas={ranking.slice(0, 10).map((r) => ({
              etiqueta: r.tecnologia,
              valor: r.cantidadProyectos,
              texto: `${r.cantidadProyectos} ${r.cantidadProyectos === 1 ? "proyecto" : "proyectos"}`,
              detalle: `${r.cantidadObligatoria} como obligatoria`,
            }))}
          />
        )}
      </Bloque>

      <div className="flex flex-col gap-4">
        <Bloque titulo="Tiempo hasta el primer proyecto" descripcion="Desde el registro hasta la primera postulación aceptada.">
          {promedioDias === null ? (
            <SinDatos>Todavía ningún estudiante tuvo una postulación aceptada.</SinDatos>
          ) : (
            <p>
              <span className="font-display text-5xl font-bold tabular-nums text-ink">{formatearNumero(promedioDias)} días</span>
              <span className="mt-1 block text-sm text-muted">
                En promedio, sobre {estudiantes} {estudiantes === 1 ? "estudiante" : "estudiantes"}.
              </span>
            </p>
          )}
        </Bloque>

        <Bloque titulo="Embudo de postulación" descripcion="Postulaciones que llegaron a entrevista y terminaron en un proyecto.">
          {totalPostulaciones === 0 ? (
            <SinDatos>Todavía no hay postulaciones.</SinDatos>
          ) : (
            <Barras
              etiqueta="Embudo de postulación"
              maximo={totalPostulaciones}
              filas={[
                { etiqueta: "Postulaciones", valor: totalPostulaciones, texto: formatearNumero(totalPostulaciones) },
                {
                  etiqueta: "Llegaron a entrevista",
                  valor: totalEntrevistas,
                  texto: formatearNumero(totalEntrevistas),
                  detalle: `${pct(conversion(totalEntrevistas, totalPostulaciones))} de las postulaciones`,
                },
                {
                  etiqueta: "Proyectos cerrados",
                  valor: totalCerrados,
                  texto: formatearNumero(totalCerrados),
                  detalle: `${pct(conversion(totalCerrados, totalEntrevistas))} de las entrevistas`,
                },
              ]}
            />
          )}
        </Bloque>
      </div>

      {meses.length > 0 && tecnologias.length > 0 && (
        <Bloque
          titulo="Evolución mensual de la demanda"
          descripcion="Proyectos publicados cada mes que piden cada una de las cinco tecnologías más demandadas."
          className="lg:col-span-2"
        >
          <Table caption="Proyectos publicados por mes que piden cada tecnología">
            <THead>
              <Tr className="hover:bg-transparent">
                <Th>Tecnología</Th>
                {meses.map((mes) => (
                  <Th key={mes} className="text-center">
                    {formatearMes(mes)}
                  </Th>
                ))}
              </Tr>
            </THead>
            <TBody>
              {tecnologias.map((tecnologia) => (
                <Tr key={tecnologia}>
                  <th scope="row" className="px-4 py-3 text-left font-semibold text-ink">
                    {tecnologia}
                  </th>
                  {meses.map((mes) => {
                    const n = proyectosEn(tecnologia, mes);
                    return (
                      <Td key={mes} className="text-center">
                        <span aria-hidden="true" className="mx-auto flex h-12 w-7 items-end overflow-hidden rounded-md bg-sunken">
                          <span className="block w-full rounded-md bg-primary" style={{ height: `${(n / maximoMes) * 100}%` }} />
                        </span>
                        <span className="mt-1 block tabular-nums">{n}</span>
                      </Td>
                    );
                  })}
                </Tr>
              ))}
            </TBody>
          </Table>
        </Bloque>
      )}

      <Bloque
        titulo="Estudiantes con match por carrera y año"
        descripcion="Con recomendación: tienen al menos un proyecto por encima del umbral. Con proyecto: tienen una postulación aceptada."
        className="lg:col-span-2"
      >
        {carreras.length === 0 ? (
          <SinDatos>Todavía no hay estudiantes con perfil.</SinDatos>
        ) : (
          <Table caption="Estudiantes con match por carrera y año">
            <THead>
              <Tr className="hover:bg-transparent">
                <Th>Carrera</Th>
                <Th>Año</Th>
                <Th className="text-right">Estudiantes</Th>
                <Th>Con recomendación</Th>
                <Th>Con proyecto</Th>
              </Tr>
            </THead>
            <TBody>
              {carreras.map((c) => (
                <Tr key={`${c.carrera}-${c.anioCursada}`}>
                  <th scope="row" className="px-4 py-3 text-left font-semibold text-ink">
                    {c.carrera}
                  </th>
                  <Td>{c.anioCursada}.º año</Td>
                  <Td className="text-right tabular-nums">{c.totalEstudiantes}</Td>
                  <CeldaBarra texto={`${pct(c.pctConRecomendacion)} (${c.conRecomendacion})`} proporcion={c.pctConRecomendacion / 100} />
                  <CeldaBarra texto={`${pct(c.pctConProyecto)} (${c.conProyecto})`} proporcion={c.pctConProyecto / 100} color="bg-success" />
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Bloque>

      {datos.embudo.length > 0 && (
        <Bloque titulo="Embudo por mes" descripcion="Según el mes en que se hizo la postulación." className="lg:col-span-2">
          <Table caption="Embudo por mes">
            <THead>
              <Tr className="hover:bg-transparent">
                <Th>Mes</Th>
                <Th className="text-right">Postulaciones</Th>
                <Th className="text-right">Entrevistas</Th>
                <Th className="text-right">Proyectos cerrados</Th>
                <Th className="text-right">Postulación a entrevista</Th>
                <Th className="text-right">Entrevista a cierre</Th>
              </Tr>
            </THead>
            <TBody>
              {[...datos.embudo]
                .sort((a, b) => a.mes.localeCompare(b.mes))
                .map((m) => (
                  <Tr key={m.mes}>
                    <th scope="row" className="px-4 py-3 text-left font-semibold text-ink">
                      {formatearMes(m.mes)}
                    </th>
                    <Td className="text-right tabular-nums">{m.postulaciones}</Td>
                    <Td className="text-right tabular-nums">{m.entrevistas}</Td>
                    <Td className="text-right tabular-nums">{m.proyectosCerrados}</Td>
                    <Td className="text-right tabular-nums">{pct(m.pctPostulacionAEntrevista)}</Td>
                    <Td className="text-right tabular-nums">{pct(m.pctEntrevistaACierre)}</Td>
                  </Tr>
                ))}
            </TBody>
          </Table>
        </Bloque>
      )}

      <Bloque
        titulo="Evaluación del motor"
        descripcion="La última evaluación de cada configuración, calculada sobre el conjunto de referencia."
        className="lg:col-span-2"
      >
        {datos.evaluacionMotor.length === 0 ? (
          <SinDatos>Todavía no se evaluó ninguna configuración.</SinDatos>
        ) : (
          <Table caption="Última evaluación de cada configuración">
            <THead>
              <Tr className="hover:bg-transparent">
                <Th>Configuración</Th>
                <Th>Precisión</Th>
                <Th>Recall</Th>
                <Th>Precisión en el top-k</Th>
              </Tr>
            </THead>
            <TBody>
              {datos.evaluacionMotor.map((e) => (
                <Tr key={e.configuracion}>
                  <th scope="row" className="px-4 py-3 text-left font-semibold text-ink">
                    {e.configuracion}
                    <span className="block text-xs font-normal text-muted">k = {e.k}</span>
                  </th>
                  <CeldaBarra texto={formatearPorcentaje(e.precisionGlobal)} proporcion={e.precisionGlobal} />
                  <CeldaBarra texto={formatearPorcentaje(e.recallGlobal)} proporcion={e.recallGlobal} />
                  <CeldaBarra texto={formatearPorcentaje(e.precisionTopK)} proporcion={e.precisionTopK} />
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Bloque>
    </div>
  );
}

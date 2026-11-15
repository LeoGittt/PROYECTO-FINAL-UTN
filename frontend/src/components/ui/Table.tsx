import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface TableProps {
  /** Título de la tabla: se usa como `caption` (oculto) y como nombre de la región con scroll. */
  caption: string;
  children: ReactNode;
  className?: string;
}

/** Tabla semántica. La región es enfocable para poder desplazarla con teclado en pantallas chicas. */
export function Table({ caption, children, className }: TableProps) {
  return (
    <div
      role="region"
      aria-label={caption}
      tabIndex={0}
      className={cn("overflow-x-auto rounded-xl border border-line bg-surface", className)}
    >
      <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export function THead(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className="bg-sunken text-muted" {...props} />;
}

export function TBody(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className="divide-y divide-line" {...props} />;
}

export function Tr({ className, ...resto }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("hover:bg-sunken/60", className)} {...resto} />;
}

export function Th({ className, scope = "col", ...resto }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th scope={scope} className={cn("px-4 py-3 text-xs font-semibold uppercase tracking-wide", className)} {...resto} />;
}

export function Td({ className, ...resto }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-3 align-middle text-ink", className)} {...resto} />;
}

export interface ColumnaTabla<T> {
  clave: string;
  titulo: string;
  celda: (fila: T) => ReactNode;
  alinear?: "izquierda" | "derecha" | "centro";
  className?: string;
}

interface DataTableProps<T> {
  caption: string;
  columnas: ColumnaTabla<T>[];
  filas: T[];
  idDeFila: (fila: T) => string | number;
  className?: string;
}

const ALINEACION = { izquierda: "text-left", derecha: "text-right", centro: "text-center" } as const;

/** Tabla de datos a partir de columnas declarativas. */
export function DataTable<T>({ caption, columnas, filas, idDeFila, className }: DataTableProps<T>) {
  return (
    <Table caption={caption} className={className}>
      <THead>
        <Tr className="hover:bg-transparent">
          {columnas.map((c) => (
            <Th key={c.clave} className={cn(ALINEACION[c.alinear ?? "izquierda"], c.className)}>
              {c.titulo}
            </Th>
          ))}
        </Tr>
      </THead>
      <TBody>
        {filas.map((fila) => (
          <Tr key={idDeFila(fila)}>
            {columnas.map((c) => (
              <Td key={c.clave} className={cn(ALINEACION[c.alinear ?? "izquierda"], c.className)}>
                {c.celda(fila)}
              </Td>
            ))}
          </Tr>
        ))}
      </TBody>
    </Table>
  );
}

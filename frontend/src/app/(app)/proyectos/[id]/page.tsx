import type { Metadata } from "next";
import { ProyectoDetalle } from "@/features/proyectos/ProyectoDetalle";

export const metadata: Metadata = { title: "Proyecto" };

export default async function ProyectoRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProyectoDetalle idProyecto={Number(id)} />;
}

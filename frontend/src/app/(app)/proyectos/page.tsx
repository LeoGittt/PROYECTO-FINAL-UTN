import type { Metadata } from "next";
import { ProyectosPage } from "@/features/proyectos/ProyectosPage";

export const metadata: Metadata = { title: "Buscar proyectos" };

export default function ProyectosRoute() {
  return <ProyectosPage />;
}

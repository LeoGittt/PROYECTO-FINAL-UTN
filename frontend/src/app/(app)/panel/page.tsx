import type { Metadata } from "next";
import { PanelInicio } from "@/features/panel/PanelInicio";

export const metadata: Metadata = { title: "Panel" };

export default function PanelPage() {
  return <PanelInicio />;
}

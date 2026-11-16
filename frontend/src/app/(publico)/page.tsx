import { ComoFunciona } from "@/components/landing/ComoFunciona";
import { Compatibilidad } from "@/components/landing/Compatibilidad";
import { CtaFinal } from "@/components/landing/CtaFinal";
import { Hero } from "@/components/landing/Hero";
import { LiveStats } from "@/components/landing/LiveStats";
import { ParaQuien } from "@/components/landing/ParaQuien";

export default function PortadaPage() {
  return (
    <>
      <Hero />
      <LiveStats />
      <ComoFunciona />
      <Compatibilidad />
      <ParaQuien />
      <CtaFinal />
    </>
  );
}

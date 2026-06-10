import { notFound } from "next/navigation";
import { LandingNavbar } from "@/components/landing/navbar";
import { LandingHero } from "@/components/landing/hero";
import { LandingLogos } from "@/components/landing/logos";
import { LandingDiferencial } from "@/components/landing/diferencial";
import { LandingModulos } from "@/components/landing/modulos";
import { LandingProduto } from "@/components/landing/produto";
import { LandingNumeros } from "@/components/landing/numeros";
import { LandingComoFunciona } from "@/components/landing/como-funciona";
import { LandingParaQuem } from "@/components/landing/para-quem";
import { LandingDepoimentos } from "@/components/landing/depoimentos";
import { LandingPrecos } from "@/components/landing/precos";
import { LandingFaq } from "@/components/landing/faq";
import { LandingCtaFinal } from "@/components/landing/cta-final";
import { LandingFooter } from "@/components/landing/footer";

const map: Record<string, React.ComponentType> = {
  hero: LandingHero,
  logos: LandingLogos,
  diferencial: LandingDiferencial,
  modulos: LandingModulos,
  produto: LandingProduto,
  numeros: LandingNumeros,
  "como-funciona": LandingComoFunciona,
  "para-quem": LandingParaQuem,
  depoimentos: LandingDepoimentos,
  precos: LandingPrecos,
  faq: LandingFaq,
  cta: LandingCtaFinal,
  footer: LandingFooter,
  nav: LandingNavbar,
};

export default async function PreviewSecaoPage({
  params,
}: {
  params: Promise<{ secao: string }>;
}) {
  const { secao } = await params;
  const Comp = map[secao];
  if (!Comp) return notFound();
  return (
    <div className="min-h-screen bg-background">
      <Comp />
    </div>
  );
}

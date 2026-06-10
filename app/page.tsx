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

export default function HomePage() {
  return (
    <div className="bg-background text-foreground min-h-screen overflow-x-hidden">
      <LandingNavbar />
      <main>
        <LandingHero />
        <LandingLogos />
        <LandingDiferencial />
        <LandingModulos />
        <LandingProduto />
        <LandingNumeros />
        <LandingComoFunciona />
        <LandingParaQuem />
        <LandingDepoimentos />
        <LandingPrecos />
        <LandingFaq />
        <LandingCtaFinal />
      </main>
      <LandingFooter />
    </div>
  );
}

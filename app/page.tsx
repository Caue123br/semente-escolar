import { LandingNavbar } from "@/components/landing/navbar";
import { LandingHero } from "@/components/landing/hero";
import { LandingDiferencial } from "@/components/landing/diferencial";
import { LandingModulos } from "@/components/landing/modulos";
import { LandingProduto } from "@/components/landing/produto";
import { LandingParaQuem } from "@/components/landing/para-quem";
import { LandingFaq } from "@/components/landing/faq";
import { LandingCtaFinal } from "@/components/landing/cta-final";
import { LandingFooter } from "@/components/landing/footer";

export default function HomePage() {
  return (
    <div className="bg-background text-foreground min-h-screen overflow-x-hidden">
      <LandingNavbar />
      <main>
        <LandingHero />
        <LandingDiferencial />
        <LandingModulos />
        <LandingProduto />
        <LandingParaQuem />
        <LandingFaq />
        <LandingCtaFinal />
      </main>
      <LandingFooter />
    </div>
  );
}

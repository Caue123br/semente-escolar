import { notFound } from "next/navigation";
import { LandingNavbar } from "@/components/landing/navbar";
import { LandingHero } from "@/components/landing/hero";
import { LandingDiferencial } from "@/components/landing/diferencial";
import { LandingModulos } from "@/components/landing/modulos";
import { LandingProduto } from "@/components/landing/produto";
import { LandingParaQuem } from "@/components/landing/para-quem";
import { LandingFaq } from "@/components/landing/faq";
import { LandingCtaFinal } from "@/components/landing/cta-final";
import { LandingFooter } from "@/components/landing/footer";

const map: Record<string, React.ComponentType> = {
  hero: LandingHero,
  diferencial: LandingDiferencial,
  modulos: LandingModulos,
  produto: LandingProduto,
  "para-quem": LandingParaQuem,
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

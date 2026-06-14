import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://semente-escolar.vercel.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/cockpit",
          "/alunos",
          "/financeiro",
          "/pedagogico",
          "/crm",
          "/rh",
          "/whatsapp",
          "/configuracoes",
          "/relatorios",
          "/estoque",
          "/vendas",
          "/nota-fiscal",
          "/kanban",
          "/calendario",
          "/cardapio",
          "/transporte",
          "/biblioteca",
          "/bercario",
          "/reservas",
          "/patrimonio",
          "/mural",
          "/portal-pais",
          "/frequencia",
          "/lgpd",
          "/preview/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}

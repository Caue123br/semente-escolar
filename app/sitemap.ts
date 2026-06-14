import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://semente-escolar.vercel.app";
  const now = new Date();

  const publicRoutes: Array<{
    path: string;
    priority: number;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  }> = [
    { path: "/", priority: 1.0, changeFrequency: "weekly" },
    { path: "/sobre", priority: 0.7, changeFrequency: "monthly" },
    { path: "/cases", priority: 0.7, changeFrequency: "monthly" },
    { path: "/calculadora", priority: 0.6, changeFrequency: "monthly" },
    { path: "/comparativo", priority: 0.6, changeFrequency: "monthly" },
    { path: "/ajuda", priority: 0.5, changeFrequency: "monthly" },
    { path: "/demo", priority: 0.8, changeFrequency: "weekly" },
    { path: "/login", priority: 0.4, changeFrequency: "yearly" },
  ];

  return publicRoutes.map((r) => ({
    url: `${baseUrl}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}

import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PerfilProvider } from "@/lib/perfil-context";
import { ThemeProvider } from "@/lib/theme-context";
import { ToastProvider } from "@/lib/toast";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://semente-escolar.vercel.app";
const siteTitle = "Semente — Sistema operacional da sua escola infantil";
const siteDescription =
  "Gestão administrativa, financeira e acompanhamento pedagógico num só lugar. Mais de 200 escolas confiam na Semente.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: "%s · Semente",
  },
  description: siteDescription,
  applicationName: "Semente",
  authors: [{ name: "Semente" }],
  generator: "Next.js",
  keywords: [
    "gestão escolar",
    "sistema escola infantil",
    "ERP escolar",
    "cobrança escolar",
    "pedagógico digital",
    "matrícula escolar",
    "SaaS educação",
  ],
  category: "education",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: siteUrl,
    siteName: "Semente",
    title: siteTitle,
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#10b981" },
    { media: "(prefers-color-scheme: dark)", color: "#047857" },
  ],
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="h-full antialiased">
        <ThemeProvider>
          <PerfilProvider>
            <ToastProvider>{children}</ToastProvider>
          </PerfilProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

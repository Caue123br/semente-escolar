import type { Metadata } from "next";
import "./globals.css";
import { PerfilProvider } from "@/lib/perfil-context";
import { ThemeProvider } from "@/lib/theme-context";
import { ToastProvider } from "@/lib/toast";

export const metadata: Metadata = {
  title: "Semente — Sistema operacional da sua escola infantil",
  description:
    "Gestão administrativa, financeira e acompanhamento pedagógico num só lugar. Mais de 200 escolas confiam na Semente.",
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

"use client";

import * as React from "react";

export type Tema = "light" | "dark" | "system";

interface ThemeContextValue {
  tema: Tema;
  setTema: (t: Tema) => void;
  temaResolvido: "light" | "dark";
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);
const STORAGE_KEY = "semente:tema";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(tema: "light" | "dark") {
  const root = document.documentElement;
  if (tema === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [tema, setTemaState] = React.useState<Tema>("light");
  const [temaResolvido, setTemaResolvido] = React.useState<"light" | "dark">("light");

  // Carrega tema persistido na primeira render
  React.useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as Tema | null) ?? "light";
    setTemaState(stored);
  }, []);

  // Aplica tema quando muda
  React.useEffect(() => {
    const resolvido = tema === "system" ? getSystemTheme() : tema;
    setTemaResolvido(resolvido);
    applyTheme(resolvido);
    if (tema !== "light") localStorage.setItem(STORAGE_KEY, tema);
    else localStorage.removeItem(STORAGE_KEY);
  }, [tema]);

  // Listener pra mudanças do sistema
  React.useEffect(() => {
    if (tema !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const r = getSystemTheme();
      setTemaResolvido(r);
      applyTheme(r);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [tema]);

  return (
    <ThemeContext.Provider value={{ tema, setTema: setTemaState, temaResolvido }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTema() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTema deve ser usado dentro de ThemeProvider");
  return ctx;
}

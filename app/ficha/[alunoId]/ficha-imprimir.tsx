"use client";

import { Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";

export function FichaImprimir() {
  return (
    <div className="bg-white border-b shadow-sm sticky top-0 z-10 print:hidden">
      <div className="max-w-[210mm] mx-auto py-3 px-4 flex items-center justify-between">
        <Link
          href="/alunos"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-medium shadow"
        >
          <Printer className="h-4 w-4" />
          Imprimir ficha completa (2 páginas)
        </button>
      </div>
    </div>
  );
}

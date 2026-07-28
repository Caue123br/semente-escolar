"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  formatarCPF,
  validarCPF,
  formatarTelefone,
  formatarCEP,
  buscarCEP,
} from "@/lib/cpf";

interface BaseProps {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
}

/** CPF com máscara 000.000.000-00 e validação inline (borda + "CPF inválido"). */
export function InputCPF({ id, value, onChange, className, placeholder }: BaseProps) {
  const digits = value.replace(/\D/g, "");
  const invalido = digits.length === 11 && !validarCPF(value);
  return (
    <div>
      <Input
        id={id}
        inputMode="numeric"
        maxLength={14}
        placeholder={placeholder ?? "000.000.000-00"}
        value={value}
        onChange={(e) => onChange(formatarCPF(e.target.value))}
        className={cn(className, invalido && "border-rose-500 focus-visible:ring-rose-500")}
      />
      {invalido && <p className="mt-1 text-xs text-rose-600">CPF inválido</p>}
    </div>
  );
}

/** Telefone com máscara (12) 91234-5678. */
export function InputTelefone({ id, value, onChange, className, placeholder }: BaseProps) {
  return (
    <Input
      id={id}
      inputMode="numeric"
      maxLength={16}
      placeholder={placeholder ?? "(12) 91234-5678"}
      value={value}
      onChange={(e) => onChange(formatarTelefone(e.target.value))}
      className={className}
    />
  );
}

/** CEP com máscara 00000-000 e autopreenchimento (ViaCEP) quando completa 8 dígitos. */
export function InputCEP({
  id,
  value,
  onChange,
  className,
  placeholder,
  onEndereco,
}: BaseProps & {
  onEndereco?: (dados: { logradouro: string; bairro: string; cidade: string; uf: string }) => void;
}) {
  const [buscando, setBuscando] = React.useState(false);
  const ultimoBuscado = React.useRef<string>("");

  const handle = async (raw: string) => {
    const formatado = formatarCEP(raw);
    onChange(formatado);
    const digits = formatado.replace(/\D/g, "");
    if (digits.length === 8 && onEndereco && ultimoBuscado.current !== digits) {
      ultimoBuscado.current = digits;
      setBuscando(true);
      const r = await buscarCEP(digits).catch(() => null);
      setBuscando(false);
      if (r) {
        onEndereco({ logradouro: r.logradouro, bairro: r.bairro, cidade: r.localidade, uf: r.uf });
      }
    }
  };

  return (
    <div className="relative">
      <Input
        id={id}
        inputMode="numeric"
        maxLength={9}
        placeholder={placeholder ?? "00000-000"}
        value={value}
        onChange={(e) => handle(e.target.value)}
        className={className}
      />
      {buscando && (
        <Loader2 className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}

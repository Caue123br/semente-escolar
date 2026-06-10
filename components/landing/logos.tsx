"use client";

export function LandingLogos() {
  const escolas = [
    "Escola Semente Feliz",
    "Mundo Encantado",
    "Pequeno Mestre",
    "Saber & Sentir",
    "Estrela Azul",
    "Crescer Brincando",
    "Recanto Verde",
  ];

  return (
    <section className="border-y bg-muted/30 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-6">
          Mais de 200 escolas já confiam na Semente
        </p>
        <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-4 opacity-70">
          {escolas.map((nome) => (
            <span
              key={nome}
              className="text-base md:text-lg font-bold tracking-tight text-muted-foreground/90 hover:text-foreground transition-colors"
              style={{ fontFamily: "Georgia, serif" }}
            >
              {nome}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

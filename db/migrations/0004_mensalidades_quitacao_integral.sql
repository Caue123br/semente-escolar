-- O modelo atual registra uma única quitação por mensalidade. Enquanto não
-- houver uma tabela própria de parcelas/recebimentos, uma mensalidade só pode
-- ficar como Paga quando o valor integral, a data e a forma estiverem gravados.
-- NOT VALID preserva eventuais registros legados para conferência, mas o
-- PostgreSQL já impõe a regra em toda inclusão ou alteração futura.
ALTER TABLE app.mensalidades
  ADD CONSTRAINT mensalidades_quitacao_integral CHECK (
    status <> 'Paga'
    OR (
      valor_pago IS NOT NULL
      AND valor_pago = valor
      AND data_pagamento IS NOT NULL
      AND NULLIF(btrim(forma_pagamento), '') IS NOT NULL
    )
  ) NOT VALID;

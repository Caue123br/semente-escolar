# PostgreSQL próprio na VPS

O Semente não depende de Supabase, Turso ou banco compartilhado. A topologia de produção prevista é:

```text
Vercel DNS -> HTTPS/Nginx na VPS -> Next.js/systemd em 127.0.0.1:3002
                                      |
                                      +-> PostgreSQL 16 em 127.0.0.1:5433
                                      +-> /srv/semente/shared/uploads
```

Liverpool/Mitadón continuam em seus próprios processos, portas, diretórios e credenciais. Para reforçar o isolamento, o Semente usa um cluster PostgreSQL nomeado, banco, roles e diretório próprios.

## Identidade dos recursos

- Cluster: `16/semente`
- Banco: `semente_prod`
- Owner sem login: `semente_owner`
- Role de migrations: `semente_migrator`
- Grupo de privilégios da aplicação, sem login: `semente_app`
- Login restrito usado pelo Next: `semente_runtime`
- Porta local: `5433`
- Uploads: `/srv/semente/shared/uploads`

O PostgreSQL deve usar `listen_addresses = '127.0.0.1'`. Não abra a porta 5433 no UFW, no painel da hospedagem ou no Nginx.

## Variáveis

Copie `.env.local.example` e substitua todos os valores marcados como `TROQUE`. `DATABASE_URL` pertence à role restrita da aplicação; `DATABASE_MIGRATION_URL` pertence à role de migrations e só deve existir durante deploy/manutenção.

Nunca use variáveis `NEXT_PUBLIC_*` para credenciais do banco.

## Ordem de ativação

1. Instale PostgreSQL 16 e crie o cluster isolado.
2. Crie as três roles e o banco sem registrar senhas no repositório.
3. Aplique `pnpm db:migrate` com a URL da role de migrations.
4. Crie o primeiro diretor sem senha padrão:

   ```bash
   export SCHOOL_ID='default'
   export SCHOOL_NAME='Nome da escola'
   export ADMIN_NAME='Nome do diretor'
   export ADMIN_EMAIL='diretor@escola.com.br'
   read -s ADMIN_PASSWORD && export ADMIN_PASSWORD
   pnpm db:bootstrap-admin
   unset ADMIN_PASSWORD
   ```

5. Faça o build, inicie uma instância do Next pelo serviço `semente.service` e publique somente o Nginx em HTTPS.
6. Valide login, CRUD, upload privado, logout, `/api/health` e restauração de backup.
7. Só então altere o registro DNS na Vercel.

As migrations são versionadas em `db/migrations`. O executor guarda checksum e interrompe a execução se uma migration já aplicada tiver sido alterada.

## Backup e retorno

- Faça `pg_dump -Fc` diário e cópia criptografada fora da VPS.
- Inclua uploads, migrations, Nginx e configuração do serviço no backup.
- Teste restauração periodicamente; a existência do arquivo não prova que ele restaura.
- Antes do corte, mantenha o deployment anterior intacto como rollback.
- Nunca apague banco ou arquivos antigos até validar o novo sistema e uma restauração completa.

Os scripts antigos do Supabase ficam apenas em `db/legacy-supabase` como referência histórica e não devem ser executados no PostgreSQL de produção.

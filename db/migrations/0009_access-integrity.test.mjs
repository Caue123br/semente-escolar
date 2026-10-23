import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const { Client } = require("pg");
const bindir = process.env.PGBIN;
const disponivel = process.env.RUN_PG_TESTS === "1" && bindir && existsSync(path.join(bindir, "initdb")) && process.getuid?.() !== 0;

test("0009 preserva vínculos válidos e dados, resolve somente legados exatos únicos na mesma escola e impede FK entre escolas", { skip: !disponivel }, async () => {
  const pasta = mkdtempSync("/private/tmp/modelo-access-pg-");
  const dados = path.join(pasta, "dados");
  const env = { ...process.env, LANG: "C", LC_ALL: "C" };
  const executar = (comando, args) => {
    const resultado = spawnSync(path.join(bindir, comando), args, { env, encoding: "utf8" });
    assert.equal(resultado.status, 0, `${comando}: ${resultado.stderr}\n${resultado.stdout}`);
  };
  let iniciado = false, cliente;
  try {
    executar("initdb", ["-D", dados, "-A", "trust", "--no-locale", "-E", "UTF8"]);
    executar("pg_ctl", ["-D", dados, "-l", path.join(pasta, "postgres.log"), "-w", "start", "-o", `-k ${pasta} -c listen_addresses='' -p 55434`]);
    iniciado = true;
    cliente = new Client({ host: pasta, port: 55434, database: "postgres", user: os.userInfo().username });
    await cliente.connect();
    await cliente.query(readFileSync(new URL("0001_initial_schema.sql", import.meta.url), "utf8"));
    await cliente.query(readFileSync(new URL("0005_professor_turma_fk.sql", import.meta.url), "utf8"));
    await cliente.query(`
      INSERT INTO app.escolas(id,nome) VALUES ('a','Escola A'),('b','Escola B');
      INSERT INTO iam.usuarios(escola_id,id,email,nome,senha_hash,perfil,ativo) VALUES
        ('a','acentuada','acentuada@teste.invalid','  JÓSE   Silva  ','hash-sintetico','professor',true),
        ('a','preservada','preservada@teste.invalid','Outra Pessoa','hash-sintetico','professor',true),
        ('a','homonima-1','h1@teste.invalid','Ana Lima','hash-sintetico','professor',true),
        ('a','homonima-2','h2@teste.invalid','Ána  Lima','hash-sintetico','professor',true),
        ('a','inativa','inativa@teste.invalid','Bia Lima','hash-sintetico','professor',false),
        ('a','legada-inativa','legada-inativa@teste.invalid','Eva Duarte','hash-sintetico','professor',false),
        ('a','homonima-ativa','homonima-ativa@teste.invalid','Eva Duarte','hash-sintetico','professor',true),
        ('b','outra-escola','outra@teste.invalid','Carla Lima','hash-sintetico','professor',true);
      INSERT INTO app.turmas(escola_id,id,nome,serie,turno,professor_id,professor_usuario_id,professor_nome) VALUES
        ('a','legado-nome','Legada','Maternal','Manhã','fixture-antiga',null,'Jose Silva'),
        ('a','legado-id','ID antigo','Maternal','Manhã','preservada',null,'Jose Silva'),
        ('a','legado-id-inativo','ID inativo','Maternal','Manhã','legada-inativa',null,'Eva Duarte'),
        ('a','legado-id-inativo-outro-nome','ID inativo com outro rótulo','Maternal','Manhã','legada-inativa',null,'Jose Silva'),
        ('a','explicita-inativa','Canonical inativo','Maternal','Manhã','legada-inativa','legada-inativa','Eva Duarte'),
        ('a','explicita','Existente','Maternal','Manhã','acentuada','preservada','Jose Silva'),
        ('a','ambigua','Ambígua','Maternal','Manhã',null,null,'Ana Lima'),
        ('a','inativa','Inativa','Maternal','Manhã',null,null,'Bia Lima'),
        ('a','outra-escola','Outra','Maternal','Manhã',null,null,'Carla Lima'),
        ('a','aproximada','Aproximada','Maternal','Manhã',null,null,'Profa. Jose Silva'),
        ('b','sala-exclusiva-b','Sala B','Maternal','Manhã',null,null,null);
      INSERT INTO app.alunos(escola_id,id,nome,data_nascimento,turma_id,status,responsaveis_json) VALUES
        ('a','aluno-seguro','Éva Souza','2025-10-01','legado-nome','Ativo','[{"nome":"Maria Souza"}]'),
        ('a','aluno-sem-responsavel','Leo Souza','2025-10-01','legado-nome','Ativo','[{"nome":"Maria Souza"}]'),
        ('a','aluno-ambiguo-1','Theo Lima','2025-10-01','legado-nome','Ativo','[{"nome":"Ana Lima"}]'),
        ('a','aluno-ambiguo-2','Theo Lima','2025-10-01','ambigua','Ativo','[{"nome":"Ana Lima"}]'),
        ('b','aluno-outra-escola','Nina Souza','2025-10-01','sala-exclusiva-b','Ativo','[{"nome":"Maria Souza"}]');
      INSERT INTO app.bercario_bebes(escola_id,id,nome,responsavel,professora) VALUES
        ('a','seguro','  Eva   Souza ','Mária Souza','Rótulo antigo'),
        ('a','sem-responsavel','Leo Souza',null,'Jose Silva'),
        ('a','ambiguo','Theo Lima','Ana Lima','Jose Silva'),
        ('a','outra-escola','Nina Souza','Maria Souza','Jose Silva'),
        ('a','so-rotulo','Sem aluno','Maria Souza','Jose Silva');
      INSERT INTO app.bercario_registros(escola_id,id,bebe_id,data,hora,tipo,detalhes) VALUES
        ('a','registro-preservado','seguro','2026-10-23','10:00','Sono','Histórico intacto');
    `);
    const migration = new URL("0009_vinculos_acesso_explicitos.sql", import.meta.url);
    if (existsSync(migration)) await cliente.query(readFileSync(migration, "utf8"));
    const coluna = await cliente.query("SELECT column_name FROM information_schema.columns WHERE table_schema='app' AND table_name='bercario_bebes' AND column_name='turma_id'");
    assert.equal(coluna.rowCount, 1, "bebês precisam de turma explícita para autorizar a rotina");
    assert.equal((await cliente.query("SELECT professor_usuario_id FROM app.turmas WHERE escola_id='a' AND id='legado-id-inativo'")).rows[0].professor_usuario_id, null,
      "ID legado inativo fica pendente e não transfere acesso ao homônimo ativo");
    assert.equal((await cliente.query("SELECT professor_usuario_id FROM app.turmas WHERE escola_id='a' AND id='legado-id-inativo-outro-nome'")).rows[0].professor_usuario_id, null,
      "ID real inativo também fecha fallback para outro rótulo nominal ativo");
    const turmas = await cliente.query("SELECT id,professor_usuario_id FROM app.turmas WHERE escola_id='a' ORDER BY id");
    assert.deepEqual(Object.fromEntries(turmas.rows.map((r) => [r.id, r.professor_usuario_id])), {
      "legado-nome": "acentuada", "legado-id": "preservada", explicita: "preservada", ambigua: null,
      "legado-id-inativo": null, "legado-id-inativo-outro-nome": null, "explicita-inativa": "legada-inativa",
      inativa: null, "outra-escola": null, aproximada: null,
    });
    const bebes = await cliente.query("SELECT id,turma_id FROM app.bercario_bebes WHERE escola_id='a' ORDER BY id");
    assert.deepEqual(Object.fromEntries(bebes.rows.map((r) => [r.id, r.turma_id])), {
      seguro: "legado-nome", "sem-responsavel": null, ambiguo: null, "outra-escola": null, "so-rotulo": null,
    });
    assert.equal((await cliente.query("SELECT detalhes FROM app.bercario_registros WHERE id='registro-preservado'")).rows[0].detalhes, "Histórico intacto");
    assert.equal((await cliente.query("SELECT count(*)::int AS total FROM iam.usuarios")).rows[0].total, 8);
    await assert.rejects(cliente.query("UPDATE app.bercario_bebes SET turma_id='sala-exclusiva-b' WHERE escola_id='a' AND id='seguro'"), { code: "23503" });
    await cliente.query("UPDATE app.bercario_bebes SET turma_id=null WHERE escola_id='a' AND id='seguro'");
    await cliente.query("INSERT INTO app.turmas(escola_id,id,nome,serie,turno,professor_nome) VALUES ('a','manual-futura','Manual nova','Maternal','Manhã','Jose Silva')");
    assert.equal((await cliente.query("SELECT professor_usuario_id FROM app.turmas WHERE id='manual-futura'")).rows[0].professor_usuario_id, null);
  } finally {
    await cliente?.end();
    if (iniciado) executar("pg_ctl", ["-D", dados, "-w", "stop", "-m", "fast"]);
    rmSync(pasta, { recursive: true, force: true });
  }
});

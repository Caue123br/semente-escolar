import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, readdir, chmod, rm, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), "semente-backup-test-"));
  const uploads = path.join(root, "uploads");
  const backups = path.join(root, "backups");
  const bin = path.join(root, "bin");
  await mkdir(path.join(uploads, "escola/alunos/aluno"), { recursive: true });
  await mkdir(bin);
  await writeFile(path.join(uploads, "escola/alunos/aluno/foto.jpg"), "imagem-ficticia-preservada");
  const scripts = {
    install: '#!/bin/sh\nfor arg do last="$arg"; done\nmkdir -p "$last"\n',
    flock: "#!/bin/sh\nexit 0\n",
    sudo: "#!/bin/sh\nprintf 'dump-ficticio\\n'\n",
    pg_restore: "#!/bin/sh\nexit 0\n",
    sha256sum: '#!/bin/sh\nexec shasum -a 256 "$@"\n',
  };
  for (const [name, body] of Object.entries(scripts)) {
    await writeFile(path.join(bin, name), body);
    await chmod(path.join(bin, name), 0o700);
  }
  const original = await readFile(new URL("./semente-db-backup", import.meta.url), "utf8");
  const replacements = [
    ["/srv/semente/shared/backups", backups],
    ["/srv/semente/shared/uploads", uploads],
    ["/run/lock/semente-db-backup.lock", path.join(root, "backup.lock")],
    ["/etc/postgresql/16/semente", path.join(root, "config-postgres")],
    ["/etc/semente", path.join(root, "config-app")],
    ["/etc/systemd/system/semente.service", path.join(root, "semente.service")],
    ["/srv/semente/current/db/migrations", path.join(root, "migrations")],
  ];
  for (const [, replacement] of replacements.slice(3)) await mkdir(replacement, { recursive: true });
  let script = original;
  for (const [from, to] of replacements) script = script.replaceAll(from, to);
  const scriptPath = path.join(root, "backup.sh");
  await writeFile(scriptPath, script);
  return { root, uploads, backups, run: () => spawnSync("bash", [scriptPath], { encoding: "utf8", env: { ...process.env, PATH: `${bin}:${process.env.PATH}` } }) };
}

test("o backup inclui e restaura as fotos junto dos artefatos de banco", async (t) => {
  const { root, backups, run } = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  const files = await readdir(backups);
  const archive = files.find((name) => /^uploads-.*\.tar\.gz$/.test(name));
  assert.ok(archive, "o backup precisa conter o arquivo de fotos");
  const restore = path.join(root, "restore");
  await mkdir(restore);
  assert.equal(spawnSync("tar", ["-xzf", path.join(backups, archive), "-C", restore]).status, 0);
  assert.equal(await readFile(path.join(restore, "escola/alunos/aluno/foto.jpg"), "utf8"), "imagem-ficticia-preservada");
  const checksum = files.find((name) => name.startsWith("checksums-"));
  assert.match(await readFile(path.join(backups, checksum), "utf8"), new RegExp(archive.replaceAll(".", "\\.")));
});


test("origem de fotos ausente falha e preserva backups antigos", async (t) => {
  const { root, uploads, backups, run } = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(backups);
  const oldBackup = path.join(backups, "database-20000101T000000Z.dump");
  await writeFile(oldBackup, "backup-antigo-completo");
  await utimes(oldBackup, new Date("2000-01-01"), new Date("2000-01-01"));
  await rm(uploads, { recursive: true });
  const result = run();
  assert.notEqual(result.status, 0, "origem ausente deve interromper o backup");
  assert.equal(await readFile(oldBackup, "utf8"), "backup-antigo-completo");
  assert.equal((await readdir(backups)).some((name) => name.startsWith("checksums-")), false);
});

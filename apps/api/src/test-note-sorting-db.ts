import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { pool } from "./db.js";
import { reconcileNoteSortingInTransaction } from "./note-sorting.js";

// All fixture objects and changes live in a fresh schema inside one rolled-back transaction.
const client = await pool.connect();
try {
  await client.query("BEGIN");
  const schema = `sorting_test_${randomUUID().replaceAll("-", "")}`;
  await client.query(`CREATE SCHEMA ${schema}`);
  await client.query(`SET LOCAL search_path TO ${schema},pg_catalog`);
  await client.query(`
    CREATE TABLE school_courses(id uuid PRIMARY KEY, vault_id uuid NOT NULL, name text NOT NULL, archived_at timestamptz);
    CREATE TABLE sources(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),vault_id uuid NOT NULL,kind text,original_text text,content_hash text);
    CREATE TABLE notes(id uuid PRIMARY KEY,vault_id uuid NOT NULL,source_id uuid,body text NOT NULL,revision int NOT NULL DEFAULT 1,
      classification_locked boolean NOT NULL DEFAULT false,classified_revision int,automatic_organization jsonb,organization_revision int NOT NULL DEFAULT 1,created_at timestamptz DEFAULT now(),trashed_at timestamptz);
    CREATE TABLE personal_file_imports(note_id uuid,vault_id uuid,relative_path text);
    CREATE TABLE jobs(id uuid PRIMARY KEY,vault_id uuid,kind text,status text,stage text,input jsonb,input_hash text);
    CREATE TABLE job_events(job_id uuid,sequence int,kind text,data jsonb);
  `);
  const vault = randomUUID(), otherVault = randomUUID(), file = randomUUID(), capture = randomUUID(), locked = randomUUID(), empty = randomUUID(), trashed = randomUUID(), failed = randomUUID(), foreign = randomUUID();
  await client.query("INSERT INTO school_courses VALUES ($1,$2,'Matematikk 2P',NULL)", [randomUUID(), vault]);
  const source = (await client.query<{ id: string }>("INSERT INTO sources(vault_id,kind,original_text,content_hash) VALUES ($1,'file','slides','abc') RETURNING id", [vault])).rows[0].id;
  await client.query("INSERT INTO notes(id,vault_id,source_id,body) VALUES ($1,$2,$3,'Imported from teams: Teams/Matematikk 2P 26_27/Shared/deck.pptx\n\nProsent')", [file, vault, source]);
  await client.query("INSERT INTO personal_file_imports VALUES ($1,$2,'Teams/Matematikk 2P 26_27/Shared/deck.pptx')", [file, vault]);
  await client.query("INSERT INTO notes(id,vault_id,body) VALUES ($1,$2,E'Matematikk 2P\nProsent')", [capture, vault]);
  await client.query("INSERT INTO notes(id,vault_id,body,classification_locked) VALUES ($1,$2,'locked choice',true)", [locked, vault]);
  await client.query("INSERT INTO notes(id,vault_id,body) VALUES ($1,$2,'')", [empty, vault]);
  await client.query("INSERT INTO notes(id,vault_id,body,trashed_at) VALUES ($1,$2,'deleted',now())", [trashed, vault]);
  await client.query("INSERT INTO notes(id,vault_id,body) VALUES ($1,$2,'failed before')", [failed, vault]);
  await client.query("INSERT INTO jobs VALUES ($1,$2,'note_process','failed','failed',$3::jsonb,'existing')", [randomUUID(), vault, JSON.stringify({ noteId: failed, revision: 1 })]);
  await client.query("INSERT INTO notes(id,vault_id,body) VALUES ($1,$2,'foreign vault')", [foreign, otherVault]);
  const first = await reconcileNoteSortingInTransaction(client, vault);
  assert.equal(first.queued, 2);
  assert.equal(first.grouped, 2);
  assert.equal((await client.query("SELECT 1 FROM notes WHERE id=$1 AND source_id IS NOT NULL", [capture])).rowCount, 1);
  assert.equal((await client.query("SELECT 1 FROM notes WHERE id=ANY($1::uuid[]) AND automatic_organization IS NOT NULL", [[locked, trashed, foreign]])).rowCount, 0);
  assert.equal((await client.query("SELECT 1 FROM jobs WHERE input->>'noteId'=$1", [empty])).rowCount, 0);
  assert.equal((await client.query("SELECT 1 FROM jobs WHERE input->>'noteId'=$1", [failed])).rowCount, 1);
  assert.deepEqual(await reconcileNoteSortingInTransaction(client, vault), { examined: 0, grouped: 0, queued: 0 });
  await client.query("UPDATE notes SET revision=2,body='An ambiguous edit' WHERE id=$1", [capture]);
  const edited = await reconcileNoteSortingInTransaction(client, vault);
  assert.equal(edited.queued, 1);
  assert.equal((await client.query("SELECT automatic_organization->>'subject' AS subject FROM notes WHERE id=$1", [capture])).rows[0].subject, null);
  assert.equal((await client.query("SELECT 1 FROM jobs WHERE input->>'noteId'=$1", [capture])).rowCount, 2);
  assert.equal((await reconcileNoteSortingInTransaction(client, vault)).queued, 0);
  await client.query("UPDATE notes SET classified_revision=revision WHERE id=$1", [file]);
  await client.query("UPDATE school_courses SET name='Økonomistyring' WHERE vault_id=$1", [vault]);
  assert.equal((await reconcileNoteSortingInTransaction(client, vault)).queued, 0);
  console.log(JSON.stringify({ checks: 12, passed: true, transaction: "rolled_back", productionRecordsChanged: false }));
} finally {
  await client.query("ROLLBACK");
  client.release();
  await pool.end();
}

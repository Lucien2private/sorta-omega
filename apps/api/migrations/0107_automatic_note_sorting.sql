ALTER TABLE notes ADD COLUMN IF NOT EXISTS automatic_organization jsonb;

CREATE INDEX IF NOT EXISTS idx_note_process_revision
  ON jobs(vault_id, (input->>'noteId'), (input->>'revision'))
  WHERE kind = 'note_process';

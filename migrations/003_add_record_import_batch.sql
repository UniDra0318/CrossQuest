ALTER TABLE training_records ADD COLUMN IF NOT EXISTS import_batch_id VARCHAR(36) REFERENCES import_batches(id);
CREATE INDEX IF NOT EXISTS ix_training_records_import_batch_id ON training_records(import_batch_id);

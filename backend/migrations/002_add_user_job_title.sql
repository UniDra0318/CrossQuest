-- CrossQuest Migration 002: Add job_title to users and last_edited_by_user_id to anomaly_rules
-- Conforms to Chapter III FR-01/FR-02 and Section 3.7 Anomaly Rule Governance (OI-08, U-16)

ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title VARCHAR(200);
ALTER TABLE anomaly_rules ADD COLUMN IF NOT EXISTS last_edited_by_user_id VARCHAR(36);

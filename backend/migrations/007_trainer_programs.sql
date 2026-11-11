-- Admin-managed trainer program (course) scope. Idempotent.
CREATE TABLE IF NOT EXISTS trainer_programs (
    id          VARCHAR(36) PRIMARY KEY,
    user_id     VARCHAR(36) NOT NULL REFERENCES users(id),
    course_id   VARCHAR(36) NOT NULL REFERENCES courses(id),
    assigned_by VARCHAR(36),
    created_at  TIMESTAMP DEFAULT now(),
    UNIQUE (user_id, course_id)
);
CREATE INDEX IF NOT EXISTS ix_trainer_programs_user ON trainer_programs(user_id);
ALTER TABLE trainer_programs OWNER TO crossquest_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON trainer_programs TO crossquest_app;

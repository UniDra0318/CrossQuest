-- CrossQuest PostgreSQL Migration 001: Table-Wide Row-Level Security & Cryptographic HMAC Context
-- Conforms to Chapter III Section 3.6.6 (SEC-08, SEC-24, OI-14, Table 19)

-- 1. Enable Cryptographic Extension for HMAC verification
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Internal Security Schema for Request Signing Secret
-- Inaccessible to unprivileged application role (crossquest_app)
CREATE SCHEMA IF NOT EXISTS internal_security;

CREATE TABLE IF NOT EXISTS internal_security.context_secret (
    id INT PRIMARY KEY DEFAULT 1,
    secret_key TEXT NOT NULL
);

INSERT INTO internal_security.context_secret (id, secret_key)
VALUES (1, 'crossquest_internal_context_signing_secret_key_change_in_prod')
ON CONFLICT (id) DO UPDATE SET secret_key = EXCLUDED.secret_key;

-- 3. Cryptographic Request Context Verification Function
-- Returns requested context setting ONLY if HMAC signature is valid and context is not expired
CREATE OR REPLACE FUNCTION app_ctx_get(setting_key TEXT)
RETURNS TEXT AS $$
DECLARE
    val TEXT;
    uid TEXT;
    role TEXT;
    tid TEXT;
    exp_str TEXT;
    sig TEXT;
    secret TEXT;
    canonical TEXT;
    computed_sig TEXT;
BEGIN
    -- Extract transaction-local session settings safely using NULLIF
    val := NULLIF(current_setting('crossquest.' || setting_key, true), '');
    uid := NULLIF(current_setting('crossquest.current_user_id', true), '');
    role := NULLIF(current_setting('crossquest.current_role', true), '');
    tid := NULLIF(current_setting('crossquest.current_trainee_id', true), '');
    exp_str := NULLIF(current_setting('crossquest.context_expiry', true), '');
    sig := NULLIF(current_setting('crossquest.context_signature', true), '');

    -- Fail-closed: missing authentication parameters evaluate to NULL
    IF uid IS NULL OR role IS NULL OR exp_str IS NULL OR sig IS NULL THEN
        RETURN NULL;
    END IF;

    -- Check context expiration (epoch in seconds)
    IF exp_str::BIGINT < EXTRACT(EPOCH FROM NOW())::BIGINT THEN
        RETURN NULL;
    END IF;

    -- Fetch shared secret from internal table
    SELECT secret_key INTO secret FROM internal_security.context_secret WHERE id = 1;
    IF secret IS NULL THEN
        RETURN NULL;
    END IF;

    -- Recompute HMAC-SHA256 signature over: user_id|role|trainee_id|expiry
    canonical := uid || '|' || role || '|' || COALESCE(tid, '') || '|' || exp_str;
    computed_sig := encode(hmac(canonical::bytea, secret::bytea, 'sha256'), 'hex');

    -- Verify signature match
    IF lower(computed_sig) != lower(sig) THEN
        RETURN NULL;
    END IF;

    RETURN val;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, internal_security, pg_temp;

-- 4. Scope Lookup Helper Functions (SECURITY DEFINER, Fixed search_path)
CREATE OR REPLACE FUNCTION app_has_company(target_company_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    uid TEXT;
    now_ts TIMESTAMP WITHOUT TIME ZONE;
BEGIN
    uid := app_ctx_get('current_user_id');
    IF uid IS NULL THEN
        RETURN FALSE;
    END IF;
    now_ts := NOW() AT TIME ZONE 'UTC';
    RETURN EXISTS (
        SELECT 1 FROM account_manager_assignments
        WHERE user_id = uid
          AND company_id = target_company_id
          AND valid_from <= now_ts
          AND (valid_to IS NULL OR valid_to > now_ts)
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION app_has_session(target_session_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    uid TEXT;
    now_ts TIMESTAMP WITHOUT TIME ZONE;
BEGIN
    uid := app_ctx_get('current_user_id');
    IF uid IS NULL THEN
        RETURN FALSE;
    END IF;
    now_ts := NOW() AT TIME ZONE 'UTC';
    RETURN EXISTS (
        SELECT 1 FROM trainer_assignments
        WHERE user_id = uid
          AND session_id = target_session_id
          AND valid_from <= now_ts
          AND (valid_to IS NULL OR valid_to > now_ts)
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- 5. Row-Level Security Policies for Training Records (Table 19)
ALTER TABLE training_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_records FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tr_select ON training_records;
CREATE POLICY tr_select ON training_records FOR SELECT TO PUBLIC
USING (
    app_ctx_get('current_role') = 'ADMIN'
    OR (deleted_at IS NULL AND (
        app_ctx_get('current_role') = 'FINANCE'
        OR (app_ctx_get('current_role') = 'ACCOUNT_MANAGER' AND app_has_company(company_at_completion_id))
        OR (app_ctx_get('current_role') = 'TRAINER' AND session_id IS NOT NULL AND app_has_session(session_id))
        OR (app_ctx_get('current_role') = 'TRAINEE' AND trainee_id = app_ctx_get('current_trainee_id'))
    ))
);

DROP POLICY IF EXISTS tr_insert ON training_records;
CREATE POLICY tr_insert ON training_records FOR INSERT TO PUBLIC
WITH CHECK (
    app_ctx_get('current_role') IN ('ADMIN', 'FINANCE')
    OR (app_ctx_get('current_role') = 'ACCOUNT_MANAGER' AND app_has_company(company_at_completion_id))
);

DROP POLICY IF EXISTS tr_update ON training_records;
CREATE POLICY tr_update ON training_records FOR UPDATE TO PUBLIC
USING (
    app_ctx_get('current_role') = 'ADMIN'
    OR (app_ctx_get('current_role') = 'FINANCE' AND deleted_at IS NULL)
)
WITH CHECK (
    app_ctx_get('current_role') = 'ADMIN'
    OR (app_ctx_get('current_role') = 'FINANCE' AND deleted_at IS NULL)
);

-- 6. RLS Policies for Certificates & Notifications
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cert_select ON certificates;
CREATE POLICY cert_select ON certificates FOR SELECT TO PUBLIC
USING (
    app_ctx_get('current_role') IN ('ADMIN', 'FINANCE')
    OR (app_ctx_get('current_role') = 'TRAINEE' AND trainee_id = app_ctx_get('current_trainee_id'))
    OR (app_ctx_get('current_role') = 'ACCOUNT_MANAGER' AND EXISTS (
        SELECT 1 FROM trainees t
        WHERE t.id = certificates.trainee_id
          AND t.current_company_id IS NOT NULL
          AND app_has_company(t.current_company_id)
    ))
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notif_select ON notifications;
CREATE POLICY notif_select ON notifications FOR SELECT TO PUBLIC
USING (
    app_ctx_get('current_role') = 'ADMIN'
    OR recipient_user_id = app_ctx_get('current_user_id')
);

-- 7. RLS Policies for Trainees & Affiliations
ALTER TABLE trainees ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainees FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trainee_select ON trainees;
CREATE POLICY trainee_select ON trainees FOR SELECT TO PUBLIC
USING (
    app_ctx_get('current_role') IN ('ADMIN', 'FINANCE')
    OR (app_ctx_get('current_role') = 'TRAINEE' AND user_id = app_ctx_get('current_user_id'))
    OR (app_ctx_get('current_role') = 'ACCOUNT_MANAGER' AND current_company_id IS NOT NULL AND app_has_company(current_company_id))
);

DROP POLICY IF EXISTS trainee_update ON trainees;
CREATE POLICY trainee_update ON trainees FOR UPDATE TO PUBLIC
USING (
    app_ctx_get('current_role') IN ('ADMIN', 'FINANCE')
    OR (app_ctx_get('current_role') = 'TRAINEE' AND user_id = app_ctx_get('current_user_id'))
);

-- 8. RLS Policies for Quizzes, Questions, and Attempts
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quiz_select ON quizzes;
CREATE POLICY quiz_select ON quizzes FOR SELECT TO PUBLIC
USING (
    app_ctx_get('current_role') = 'ADMIN'
    OR (session_id IS NOT NULL AND (
        (app_ctx_get('current_role') = 'TRAINER' AND app_has_session(session_id))
        OR (app_ctx_get('current_role') = 'TRAINEE' AND EXISTS (
            SELECT 1 FROM training_records tr
            WHERE tr.session_id = quizzes.session_id
              AND tr.trainee_id = app_ctx_get('current_trainee_id')
        ))
    ))
);

ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS attempt_select ON quiz_attempts;
CREATE POLICY attempt_select ON quiz_attempts FOR SELECT TO PUBLIC
USING (
    app_ctx_get('current_role') = 'ADMIN'
    OR (app_ctx_get('current_role') = 'TRAINEE' AND trainee_id = app_ctx_get('current_trainee_id'))
    OR (app_ctx_get('current_role') = 'TRAINER' AND EXISTS (
        SELECT 1 FROM quizzes q
        WHERE q.id = quiz_attempts.quiz_id
          AND q.session_id IS NOT NULL
          AND app_has_session(q.session_id)
    ))
);

-- 9. Append-Only Access Log Policy (TC-RLS-08)
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS log_select ON access_logs;
CREATE POLICY log_select ON access_logs FOR SELECT TO PUBLIC
USING (
    app_ctx_get('current_role') = 'ADMIN'
);

DROP POLICY IF EXISTS log_insert ON access_logs;
CREATE POLICY log_insert ON access_logs FOR INSERT TO PUBLIC
WITH CHECK (true);

-- Disallow UPDATE and DELETE on access logs completely
DROP POLICY IF EXISTS log_update ON access_logs;
CREATE POLICY log_update ON access_logs FOR UPDATE TO PUBLIC USING (false);

DROP POLICY IF EXISTS log_delete ON access_logs;
CREATE POLICY log_delete ON access_logs FOR DELETE TO PUBLIC USING (false);

-- 10. Role Privileges & Deletion Revocation (DD-06, FR-08, TC-RLS-12)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'crossquest_app') THEN
        CREATE ROLE crossquest_app WITH LOGIN PASSWORD 'app_secure_password';
    END IF;
END $$;

GRANT USAGE ON SCHEMA public TO crossquest_app;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO crossquest_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO crossquest_app;

-- Revoke hard DELETE from application role on training records (Soft deletion only)
REVOKE DELETE ON training_records FROM crossquest_app;

-- Revoke UPDATE and DELETE from application role on audit log (Append-only)
REVOKE UPDATE, DELETE ON access_logs FROM crossquest_app;

-- Block application role from reading internal cryptographic signing secret directly
REVOKE ALL ON SCHEMA internal_security FROM crossquest_app;


-- 11. Row-Level Security for User CP-ABE Private Keys (SEC-24, Phase 5)
ALTER TABLE user_abe_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_abe_keys FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS uak_select ON user_abe_keys;
CREATE POLICY uak_select ON user_abe_keys FOR SELECT TO PUBLIC
USING (
    app_ctx_get('current_role') = 'ADMIN'
    OR user_id = app_ctx_get('current_user_id')
);

-- Disallow runtime modification or deletion of key material through direct SQL
DROP POLICY IF EXISTS uak_update ON user_abe_keys;
CREATE POLICY uak_update ON user_abe_keys FOR UPDATE TO PUBLIC
USING (app_ctx_get('current_role') = 'ADMIN')
WITH CHECK (app_ctx_get('current_role') = 'ADMIN');

-- 12. Restricted Key Access Function (SEC-24)
-- Wrapped private keys are accessible strictly via cryptographically-verified caller context
CREATE OR REPLACE FUNCTION internal_security.get_user_wrapped_key(target_user_id TEXT)
RETURNS TABLE (
    key_id TEXT,
    user_id TEXT,
    wrapped_dek TEXT,
    nonce TEXT,
    key_ciphertext TEXT,
    kms_key_arn TEXT,
    status TEXT
) AS $$
DECLARE
    caller_id TEXT;
    caller_role TEXT;
BEGIN
    caller_id := app_ctx_get('current_user_id');
    caller_role := app_ctx_get('current_role');

    -- Fail-closed if context is unauthenticated or expired
    IF caller_id IS NULL OR caller_role IS NULL THEN
        RETURN;
    END IF;

    -- Only Administrator or the verified user himself can read the wrapped key
    IF caller_role != 'ADMIN' AND caller_id != target_user_id THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT uak.id::TEXT, uak.user_id::TEXT, uak.wrapped_dek::TEXT, uak.nonce::TEXT, uak.key_ciphertext::TEXT, uak.kms_key_arn::TEXT, uak.status::TEXT
    FROM user_abe_keys uak
    WHERE uak.user_id = target_user_id
      AND uak.status = 'active';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, internal_security, pg_temp;

-- 13. Table Ownership & Privileges Separation (Phase 5)
-- Dedicated table owner role ensures runtime app role cannot bypass RLS
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'crossquest_admin') THEN
        CREATE ROLE crossquest_admin WITH LOGIN PASSWORD 'admin_secure_password';
    END IF;
END $$;

ALTER TABLE training_records OWNER TO crossquest_admin;
ALTER TABLE certificates OWNER TO crossquest_admin;
ALTER TABLE trainees OWNER TO crossquest_admin;
ALTER TABLE user_abe_keys OWNER TO crossquest_admin;
ALTER TABLE quizzes OWNER TO crossquest_admin;
ALTER TABLE quiz_attempts OWNER TO crossquest_admin;
ALTER TABLE access_logs OWNER TO crossquest_admin;


-- 14. Comprehensive RLS for All Client & Trainee Data Tables (Phase 5, SEC-08, Table 19)

-- 14.1 Client Companies
ALTER TABLE client_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_companies FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS comp_select ON client_companies;
CREATE POLICY comp_select ON client_companies FOR SELECT TO PUBLIC
USING (
    app_ctx_get('current_role') IN ('ADMIN', 'FINANCE')
    OR (app_ctx_get('current_role') = 'ACCOUNT_MANAGER' AND app_has_company(id))
    OR (app_ctx_get('current_role') = 'TRAINEE' AND EXISTS (
        SELECT 1 FROM trainees t
        WHERE t.current_company_id = client_companies.id
          AND t.user_id = app_ctx_get('current_user_id')
    ))
    OR (app_ctx_get('current_role') = 'TRAINER')
);

DROP POLICY IF EXISTS comp_admin_modify ON client_companies;
CREATE POLICY comp_admin_modify ON client_companies FOR ALL TO PUBLIC
USING (app_ctx_get('current_role') = 'ADMIN')
WITH CHECK (app_ctx_get('current_role') = 'ADMIN');

-- 14.2 Trainee Affiliations
ALTER TABLE trainee_affiliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainee_affiliations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS aff_select ON trainee_affiliations;
CREATE POLICY aff_select ON trainee_affiliations FOR SELECT TO PUBLIC
USING (
    app_ctx_get('current_role') IN ('ADMIN', 'FINANCE')
    OR (app_ctx_get('current_role') = 'TRAINEE' AND trainee_id = app_ctx_get('current_trainee_id'))
    OR (app_ctx_get('current_role') = 'ACCOUNT_MANAGER' AND app_has_company(company_id))
);

DROP POLICY IF EXISTS aff_modify ON trainee_affiliations;
CREATE POLICY aff_modify ON trainee_affiliations FOR ALL TO PUBLIC
USING (app_ctx_get('current_role') IN ('ADMIN', 'FINANCE', 'ACCOUNT_MANAGER'))
WITH CHECK (app_ctx_get('current_role') IN ('ADMIN', 'FINANCE', 'ACCOUNT_MANAGER'));

-- 14.3 Account Manager Assignments
ALTER TABLE account_manager_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_manager_assignments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ama_select ON account_manager_assignments;
CREATE POLICY ama_select ON account_manager_assignments FOR SELECT TO PUBLIC
USING (
    app_ctx_get('current_role') IN ('ADMIN', 'FINANCE')
    OR user_id = app_ctx_get('current_user_id')
);

DROP POLICY IF EXISTS ama_admin_modify ON account_manager_assignments;
CREATE POLICY ama_admin_modify ON account_manager_assignments FOR ALL TO PUBLIC
USING (app_ctx_get('current_role') = 'ADMIN')
WITH CHECK (app_ctx_get('current_role') = 'ADMIN');

-- 14.4 Trainer Assignments
ALTER TABLE trainer_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_assignments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tra_select ON trainer_assignments;
CREATE POLICY tra_select ON trainer_assignments FOR SELECT TO PUBLIC
USING (
    app_ctx_get('current_role') IN ('ADMIN', 'FINANCE')
    OR user_id = app_ctx_get('current_user_id')
);

DROP POLICY IF EXISTS tra_admin_modify ON trainer_assignments;
CREATE POLICY tra_admin_modify ON trainer_assignments FOR ALL TO PUBLIC
USING (app_ctx_get('current_role') = 'ADMIN')
WITH CHECK (app_ctx_get('current_role') = 'ADMIN');

-- 14.5 Gamified Teams and Team Members
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS team_select ON teams;
CREATE POLICY team_select ON teams FOR SELECT TO PUBLIC
USING (
    app_ctx_get('current_role') IN ('ADMIN', 'FINANCE')
    OR (app_ctx_get('current_role') = 'TRAINER' AND app_has_session(session_id))
    OR (app_ctx_get('current_role') = 'TRAINEE' AND EXISTS (
        SELECT 1 FROM training_records tr
        WHERE tr.session_id = teams.session_id
          AND tr.trainee_id = app_ctx_get('current_trainee_id')
    ))
);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tm_select ON team_members;
CREATE POLICY tm_select ON team_members FOR SELECT TO PUBLIC
USING (
    app_ctx_get('current_role') IN ('ADMIN', 'FINANCE')
    OR (app_ctx_get('current_role') = 'TRAINEE' AND trainee_id = app_ctx_get('current_trainee_id'))
    OR (app_ctx_get('current_role') = 'TRAINER' AND EXISTS (
        SELECT 1 FROM teams tm
        WHERE tm.id = team_members.team_id
          AND app_has_session(tm.session_id)
    ))
);

-- 14.6 Gamification Progress
ALTER TABLE gamification_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamification_progress FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gam_select ON gamification_progress;
CREATE POLICY gam_select ON gamification_progress FOR SELECT TO PUBLIC
USING (
    app_ctx_get('current_role') IN ('ADMIN', 'FINANCE')
    OR (app_ctx_get('current_role') = 'TRAINEE' AND trainee_id = app_ctx_get('current_trainee_id'))
    OR (app_ctx_get('current_role') = 'TRAINER')
    OR (app_ctx_get('current_role') = 'ACCOUNT_MANAGER' AND EXISTS (
        SELECT 1 FROM trainees tr
        WHERE tr.id = gamification_progress.trainee_id
          AND tr.current_company_id IS NOT NULL
          AND app_has_company(tr.current_company_id)
    ))
);

-- Assign crossquest_admin ownership across all extended tables
ALTER TABLE client_companies OWNER TO crossquest_admin;
ALTER TABLE trainee_affiliations OWNER TO crossquest_admin;
ALTER TABLE account_manager_assignments OWNER TO crossquest_admin;
ALTER TABLE trainer_assignments OWNER TO crossquest_admin;
ALTER TABLE teams OWNER TO crossquest_admin;
ALTER TABLE team_members OWNER TO crossquest_admin;
ALTER TABLE gamification_progress OWNER TO crossquest_admin;

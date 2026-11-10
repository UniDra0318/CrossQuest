-- UNTESTED: apply manually to a COPY of the database first (psql as crossquest_admin); never auto-load
-- Note: users, user_sessions, password_reset_tokens are read at login/refresh/reset before any user context exists;
-- they are protected with GRANTs only.

-- 1. Training Record Versions
ALTER TABLE training_record_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_record_versions FORCE ROW LEVEL SECURITY;

CREATE POLICY trv_select ON training_record_versions FOR SELECT TO PUBLIC
USING (app_ctx_get('crossquest.current_role') IN ('admin', 'finance'));

CREATE POLICY trv_insert ON training_record_versions FOR INSERT TO PUBLIC
WITH CHECK (app_ctx_get('crossquest.current_role') IN ('admin', 'finance', 'account_manager'));

CREATE POLICY trv_mod ON training_record_versions FOR UPDATE TO PUBLIC
USING (app_ctx_get('crossquest.current_role') IN ('admin', 'finance'));

CREATE POLICY trv_delete ON training_record_versions FOR DELETE TO PUBLIC
USING (app_ctx_get('crossquest.current_role') IN ('admin', 'finance'));

-- 2. Import Batches, Staging Rows, Discrepancies
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_batches FORCE ROW LEVEL SECURITY;
CREATE POLICY ib_all ON import_batches FOR ALL TO PUBLIC
USING (app_ctx_get('crossquest.current_role') IN ('admin', 'finance'))
WITH CHECK (app_ctx_get('crossquest.current_role') IN ('admin', 'finance'));

ALTER TABLE import_staging_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_staging_rows FORCE ROW LEVEL SECURITY;
CREATE POLICY isr_all ON import_staging_rows FOR ALL TO PUBLIC
USING (app_ctx_get('crossquest.current_role') IN ('admin', 'finance'))
WITH CHECK (app_ctx_get('crossquest.current_role') IN ('admin', 'finance'));

ALTER TABLE import_discrepancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_discrepancies FORCE ROW LEVEL SECURITY;
CREATE POLICY id_all ON import_discrepancies FOR ALL TO PUBLIC
USING (app_ctx_get('crossquest.current_role') IN ('admin', 'finance'))
WITH CHECK (app_ctx_get('crossquest.current_role') IN ('admin', 'finance'));

-- 3. Anomaly Alerts, Alert Events, Anomaly Rules
ALTER TABLE anomaly_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomaly_alerts FORCE ROW LEVEL SECURITY;
CREATE POLICY aa_all ON anomaly_alerts FOR ALL TO PUBLIC
USING (app_ctx_get('crossquest.current_role') = 'admin')
WITH CHECK (app_ctx_get('crossquest.current_role') = 'admin');

ALTER TABLE anomaly_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomaly_rules FORCE ROW LEVEL SECURITY;
CREATE POLICY ar_all ON anomaly_rules FOR ALL TO PUBLIC
USING (app_ctx_get('crossquest.current_role') = 'admin')
WITH CHECK (app_ctx_get('crossquest.current_role') = 'admin');

ALTER TABLE alert_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_events FORCE ROW LEVEL SECURITY;
CREATE POLICY ae_select ON alert_events FOR SELECT TO PUBLIC
USING (app_ctx_get('crossquest.current_role') = 'admin');
CREATE POLICY ae_insert ON alert_events FOR INSERT TO PUBLIC
WITH CHECK (app_ctx_get('crossquest.current_role') IS NOT NULL);
CREATE POLICY ae_mod ON alert_events FOR UPDATE TO PUBLIC
USING (app_ctx_get('crossquest.current_role') = 'admin');
CREATE POLICY ae_del ON alert_events FOR DELETE TO PUBLIC
USING (app_ctx_get('crossquest.current_role') = 'admin');

-- 4. ABE Attributes, User Key Attributes, Re-encryption Jobs
ALTER TABLE abe_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE abe_attributes FORCE ROW LEVEL SECURITY;
CREATE POLICY abe_all ON abe_attributes FOR ALL TO PUBLIC
USING (app_ctx_get('crossquest.current_role') = 'admin')
WITH CHECK (app_ctx_get('crossquest.current_role') = 'admin');

ALTER TABLE user_key_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_key_attributes FORCE ROW LEVEL SECURITY;
CREATE POLICY uka_all ON user_key_attributes FOR ALL TO PUBLIC
USING (app_ctx_get('crossquest.current_role') = 'admin')
WITH CHECK (app_ctx_get('crossquest.current_role') = 'admin');

ALTER TABLE reencryption_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reencryption_jobs FORCE ROW LEVEL SECURITY;
CREATE POLICY rj_all ON reencryption_jobs FOR ALL TO PUBLIC
USING (app_ctx_get('crossquest.current_role') = 'admin')
WITH CHECK (app_ctx_get('crossquest.current_role') = 'admin');

-- 5. Quiz Answer Keys
ALTER TABLE quiz_answer_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answer_keys FORCE ROW LEVEL SECURITY;
CREATE POLICY qak_all ON quiz_answer_keys FOR ALL TO PUBLIC
USING (app_ctx_get('crossquest.current_role') IN ('admin', 'trainer'))
WITH CHECK (app_ctx_get('crossquest.current_role') IN ('admin', 'trainer'));

-- 6. Quiz Questions
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions FORCE ROW LEVEL SECURITY;
CREATE POLICY qq_select ON quiz_questions FOR SELECT TO PUBLIC
USING (app_ctx_get('crossquest.current_role') IS NOT NULL);
CREATE POLICY qq_mod ON quiz_questions FOR ALL TO PUBLIC
USING (app_ctx_get('crossquest.current_role') IN ('admin', 'trainer'))
WITH CHECK (app_ctx_get('crossquest.current_role') IN ('admin', 'trainer'));

-- 7. Courses and Certification Types
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses FORCE ROW LEVEL SECURITY;
CREATE POLICY crs_select ON courses FOR SELECT TO PUBLIC
USING (app_ctx_get('crossquest.current_role') IS NOT NULL);
CREATE POLICY crs_mod ON courses FOR ALL TO PUBLIC
USING (app_ctx_get('crossquest.current_role') = 'admin')
WITH CHECK (app_ctx_get('crossquest.current_role') = 'admin');

ALTER TABLE certification_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE certification_types FORCE ROW LEVEL SECURITY;
CREATE POLICY ct_select ON certification_types FOR SELECT TO PUBLIC
USING (app_ctx_get('crossquest.current_role') IS NOT NULL);
CREATE POLICY ct_mod ON certification_types FOR ALL TO PUBLIC
USING (app_ctx_get('crossquest.current_role') = 'admin')
WITH CHECK (app_ctx_get('crossquest.current_role') = 'admin');

-- 8. Training Sessions
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions FORCE ROW LEVEL SECURITY;

CREATE POLICY ts_select ON training_sessions FOR SELECT TO PUBLIC
USING (
    app_ctx_get('crossquest.current_role') IN ('admin', 'finance')
    OR (app_ctx_get('crossquest.current_role') = 'account_manager')
    OR (app_ctx_get('crossquest.current_role') = 'trainer' AND app_has_session(id))
);

CREATE POLICY ts_insert ON training_sessions FOR INSERT TO PUBLIC
WITH CHECK (
    app_ctx_get('crossquest.current_role') IN ('admin', 'account_manager')
);

CREATE POLICY ts_update ON training_sessions FOR UPDATE TO PUBLIC
USING (
    app_ctx_get('crossquest.current_role') IN ('admin', 'account_manager')
    OR (app_ctx_get('crossquest.current_role') = 'trainer' AND app_has_session(id))
)
WITH CHECK (
    app_ctx_get('crossquest.current_role') IN ('admin', 'account_manager')
    OR (app_ctx_get('crossquest.current_role') = 'trainer' AND app_has_session(id))
);

CREATE POLICY ts_delete ON training_sessions FOR DELETE TO PUBLIC
USING (app_ctx_get('crossquest.current_role') = 'admin');

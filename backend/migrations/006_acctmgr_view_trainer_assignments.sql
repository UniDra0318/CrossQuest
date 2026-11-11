-- Let Account Managers read trainer assignments so session cards show the trainer name.
-- Replaces the existing policy of the same name (policy count stays the same).
DROP POLICY IF EXISTS tra_select ON trainer_assignments;
CREATE POLICY tra_select ON trainer_assignments FOR SELECT TO PUBLIC
USING (
    app_ctx_get('current_role') IN ('ADMIN', 'FINANCE', 'ACCOUNT_MANAGER')
    OR user_id = app_ctx_get('current_user_id')
);

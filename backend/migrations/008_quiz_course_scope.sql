-- Quizzes belong to a course. Idempotent.
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS course_id VARCHAR(36) REFERENCES courses(id);
CREATE INDEX IF NOT EXISTS ix_quizzes_course ON quizzes(course_id);

-- 1. Sessions with an empty course link: match by course name.
UPDATE training_sessions s SET course_id = c.id
FROM courses c WHERE s.course_id IS NULL AND c.name = s.course_name;

-- 2. Existing quizzes take their session's course, then become course-wide.
UPDATE quizzes q SET course_id = s.course_id
FROM training_sessions s WHERE q.session_id = s.id AND q.course_id IS NULL AND s.course_id IS NOT NULL;
UPDATE quizzes SET session_id = NULL WHERE course_id IS NOT NULL;

-- 3. Trainers read attempts of quizzes in their courses (was: session-only).
DROP POLICY IF EXISTS attempt_select ON quiz_attempts;
CREATE POLICY attempt_select ON quiz_attempts FOR SELECT TO PUBLIC
USING (
    app_ctx_get('current_role') = 'ADMIN'
    OR (app_ctx_get('current_role') = 'TRAINEE' AND trainee_id = app_ctx_get('current_trainee_id'))
    OR (app_ctx_get('current_role') = 'TRAINER' AND EXISTS (
        SELECT 1 FROM quizzes q
        WHERE q.id = quiz_attempts.quiz_id
          AND (
            (q.session_id IS NOT NULL AND app_has_session(q.session_id))
            OR q.created_by_user_id = app_ctx_get('current_user_id')
            OR q.course_id IN (SELECT tp.course_id FROM trainer_programs tp WHERE tp.user_id = app_ctx_get('current_user_id'))
            OR q.course_id IN (
                SELECT s.course_id FROM trainer_assignments ta JOIN training_sessions s ON s.id = ta.session_id
                WHERE ta.user_id = app_ctx_get('current_user_id')
                  AND (ta.valid_to IS NULL OR ta.valid_to > (NOW() AT TIME ZONE 'UTC'))
            )
          )
    ))
);

-- Round 11: Pilot scope flag on courses (Part 1b) and Quiz question types (Part 3a)

-- Part 1b: Pilot flag on courses
ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_pilot BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE courses SET is_pilot = TRUE WHERE name IN (
    'PMP Review (Saturdays)', 'PMP Review (Weekdays)',
    'Supervisory Upskilling Program for Excellent', 'Project Management Essentials',
    'Certified Associate in Project Management (CAPM)', 'Negotiating for Results',
    'Business Strategy Simulation', 'ISO 31000 CRM', 'Strategic Management Tools',
    'Customized Program', 'Innovation through Design Thinking'
);

-- Part 3a: Multi-type quiz question columns (Phase 1)
-- Existing RLS policies on quiz_questions (qq_select, qq_mod) and quiz_answer_keys (qak_all)
-- are row-level and continue to cover the new columns.
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS question_type VARCHAR(30) NOT NULL DEFAULT 'multiple_choice';
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS payload JSON;
ALTER TABLE quiz_answer_keys ADD COLUMN IF NOT EXISTS answer_payload JSON;

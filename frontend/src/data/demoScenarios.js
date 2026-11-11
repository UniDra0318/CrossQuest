export const DEMO_SCENARIOS = [
  {
    id: 'SCN-01',
    title: 'One quiz left: finish, sign-off, certificate',
    summary: 'Trainee finishes the last quiz; Trainer signs off; certificate is issued.',
    steps: [
      { persona: 'scn_mia', do: 'Open Quizzes, finish the last quiz. Progress reaches 100%.' },
      { persona: 'trainer', do: 'Open the session, review attendance, sign off.' },
      { persona: 'account_manager', do: 'Confirm the record shows Completed (read-only).' },
      { persona: 'admin', do: 'Reissue the certificate with a reason.' },
    ],
  },
  {
    id: 'SCN-02',
    title: '100% quizzes but absent (OI-02)',
    summary: 'Quizzes do not equal completion when attendance is not Present.',
    steps: [
      { persona: 'scn_noel', do: 'Confirm 3/3 quizzes completed while attendance is Absent.' },
      { persona: 'trainer', do: 'Sign off SCN-02; record becomes Not completed.' },
      { persona: 'admin', do: 'Correct the record with a mandatory reason; earlier version is kept.' },
    ],
  },
  {
    id: 'SCN-03',
    title: 'Future-dated session sign-off block',
    summary: 'Sign-off is blocked before the session start date.',
    steps: [
      { persona: 'trainer', do: 'Open SCN-03; confirm sign-off is disabled with future-date reason.' },
    ],
  },
  {
    id: 'SCN-04',
    title: 'Score correction by an Administrator',
    summary: 'Admin corrects a score with a reason; AM and Finance get 403 on score.',
    steps: [
      { persona: 'account_manager', do: 'Confirm AM cannot edit score or Completed record.' },
      { persona: 'finance', do: 'Confirm Finance cannot edit score field.' },
      { persona: 'admin', do: 'Correct Carla’s score with a mandatory reason (version 2).' },
      { persona: 'scn_carla', do: 'Confirm corrected score is visible in Trainee Transcript.' },
    ],
  },
  {
    id: 'SCN-05',
    title: 'Account Manager limits',
    summary: 'AM can set attendance and In progress, never Completed or post-sign-off edits.',
    steps: [
      { persona: 'account_manager', do: 'Verify 403 when setting Completed and read-only lock after sign-off.' },
    ],
  },
  {
    id: 'SCN-06',
    title: 'Wrong trainer sign-off block (U-12)',
    summary: 'Unassigned Trainer gets 403 on session sign-off.',
    steps: [
      { persona: 'trainer', do: 'Compare assigned Jordan vs unassigned Billy on SCN-01 (403 for Billy).' },
    ],
  },
  {
    id: 'SCN-07',
    title: 'Cross-company trainee affiliations',
    summary: 'Historical employer affiliations scope which AMs see which records.',
    steps: [
      { persona: 'trainee', do: 'Inspect Andrea’s 3-company affiliation history (VHL, ROP, AOS).' },
      { persona: 'admin', do: 'Record an affiliation change and verify AM visibility.' },
    ],
  },
  {
    id: 'SCN-08',
    title: 'Credential expiry & 90/60/30/0-day reminders',
    summary: 'Expiring PMP (25d) and expired CAPM with self-reported renewal.',
    steps: [
      { persona: 'scn_ines', do: 'View Expiring soon PMP & Expired CAPM; submit self-reported renewal.' },
      { persona: 'account_manager', do: 'Check expiry notification within assigned client scope.' },
    ],
  },
  {
    id: 'SCN-09',
    title: 'Peer alert review (OI-30)',
    summary: 'Admin cannot review an alert about themselves; second Admin reviews it.',
    steps: [
      { persona: 'admin', do: 'Joey attempts to review alert about himself (blocked by OI-30).' },
      { persona: 'admin_general', do: 'Len reviews and resolves the alert with a note.' },
    ],
  },
  {
    id: 'SCN-10',
    title: 'Account lifecycle & TOTP MFA',
    summary: 'Pending single-use activation link, disable/re-enable, and Admin/Finance MFA.',
    steps: [
      { persona: 'admin', do: 'Inspect Gabe’s pending activation and toggle account active state.' },
      { persona: 'finance', do: 'Verify TOTP MFA enforcement (dev bypass locally).' },
    ],
  },
  {
    id: 'SCN-11',
    title: 'Import reconciliation (FR-22)',
    summary: 'Finance prepares reconciliation report; Admin resolves quarantined rows.',
    steps: [
      { persona: 'finance', do: 'Open Imports and review quarantined batch SCN-11.' },
      { persona: 'admin', do: 'Resolve quarantined rows with a logged reason.' },
    ],
  },
  {
    id: 'SCN-12',
    title: 'Individual self-paying client',
    summary: 'Individual client assigned to Sharon De Vera with one active AM.',
    steps: [
      { persona: 'scn_ivy', do: 'View individual client profile and enrollment.' },
      { persona: 'am_sharon', do: 'Confirm Sharon sees Ivy’s record in scope.' },
    ],
  },
];

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Grade from '../trainer/pages/Grade';
import * as TrainerContext from '../trainer/TrainerContext';
import * as ThemeContext from '../contexts/ThemeContext';

describe('Trainer Sign-Off Validation', () => {
  beforeEach(() => {
    vi.spyOn(ThemeContext, 'useTheme').mockReturnValue({ isDark: false });
  });

  const mockSession = {
    id: 'SESS-2026-01',
    course_name: 'Agile PME & Project Management',
    company_name: 'Amihan Solutions',
    is_future_dated: false,
    trainer_signed_off: false,
    records: [
      {
        record_id: 'rec-001',
        trainee_id: 'trainee-001',
        trainee_name: 'Juan Dela Cruz',
        trainee_code: 'TRN-101',
        status: null,
        score: null
      },
      {
        record_id: 'rec-002',
        trainee_id: 'trainee-002',
        trainee_name: 'Maria Santos',
        trainee_code: 'TRN-102',
        status: null,
        score: null
      }
    ]
  };

  it('keeps sign-off button disabled when not all participants have been decided', () => {
    vi.spyOn(TrainerContext, 'useTrainer').mockReturnValue({
      sessions: [mockSession],
      selectedSessionId: 'SESS-2026-01',
      setSelectedSessionId: vi.fn(),
      roster: [],
      selectedTraineeId: null,
      setSelectedTraineeId: vi.fn(),
      submitEvaluation: vi.fn(),
      RUBRIC: ['Meets attendance requirement', 'Demonstrates baseline competency'],
      PASS_MARK: 75,
      tierFor: () => 'Passing Baseline',
      loading: false
    });

    render(<Grade />);

    // Find the button
    const signOffButton = screen.getByRole('button', {
      name: /Sign-Off Pending Evaluation/i
    });

    expect(signOffButton).toBeDisabled();
    expect(signOffButton).toHaveTextContent('0/2 Marked');
  });

  it('enables the sign-off button when all participants are explicitly marked Completed or Not completed', async () => {
    vi.spyOn(TrainerContext, 'useTrainer').mockReturnValue({
      sessions: [mockSession],
      selectedSessionId: 'SESS-2026-01',
      setSelectedSessionId: vi.fn(),
      roster: [],
      selectedTraineeId: null,
      setSelectedTraineeId: vi.fn(),
      submitEvaluation: vi.fn(),
      RUBRIC: ['Meets attendance requirement', 'Demonstrates baseline competency'],
      PASS_MARK: 75,
      tierFor: () => 'Passing Baseline',
      loading: false
    });

    render(<Grade />);

    // Click Completed for all participants
    const completedButtons = screen.getAllByRole('button', { name: /✔ Completed/i });
    expect(completedButtons.length).toBe(2);
    completedButtons.forEach(btn => fireEvent.click(btn));

    // The sign-off button should now be enabled and say "Execute Session Sign-Off"
    const signOffButton = screen.getByRole('button', {
      name: /Execute Session Sign-Off/i
    });

    expect(signOffButton).not.toBeDisabled();
  });
});

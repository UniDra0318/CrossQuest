import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SystemSettings from '../admin/pages/SystemSettings';
import { ThemeProvider } from '../contexts/ThemeContext';
import * as api from '../services/api';

const MOCK_RULES = [
  { rule_code: 'S1_AFTER_HOURS', parameters: { start_hour: 9, end_hour: 18, tz: 'Asia/Manila', days: ['MON', 'TUE', 'WED', 'THU', 'FRI'] }, version_no: 1, client_reviewed: true },
  { rule_code: 'R2_FAILED_LOGINS_ACCOUNT', parameters: { threshold: 5, window_minutes: 10 }, version_no: 1, client_reviewed: true },
  { rule_code: 'R3_REPORT_BURSTS', parameters: { threshold: 5, window_minutes: 60 }, version_no: 1, client_reviewed: true }
];

describe('SystemSettings Anomaly Thresholds Tuning', () => {
  it('renders Crossworks Approved badge when baseline rules are reviewed', () => {
    render(
      <ThemeProvider>
        <SystemSettings liveRules={MOCK_RULES} />
      </ThemeProvider>
    );

    expect(screen.getByText(/✓ Crossworks Approved/i)).toBeInTheDocument();
    expect(screen.getByText(/09:00 – 18:00 \(Asia\/Manila\)/i)).toBeInTheDocument();
  });

  it('opens tuning modal with empty reason and blocks submission when reason is blank (A2, A7)', async () => {
    render(
      <ThemeProvider>
        <SystemSettings liveRules={MOCK_RULES} token="test-token" />
      </ThemeProvider>
    );

    const tuneBtn = screen.getByRole('button', { name: /Tune Thresholds/i });
    fireEvent.click(tuneBtn);

    // Modal should be open
    expect(screen.getByText(/Tune Anomaly Detection Thresholds/i)).toBeInTheDocument();

    // Reason textarea must be empty initially (A2)
    const reasonInput = screen.getByPlaceholderText(/Enter specific business justification/i);
    expect(reasonInput.value).toBe('');

    // Attempt to submit without reason
    const saveBtn = screen.getByRole('button', { name: /Save Parameters/i });
    fireEvent.click(saveBtn);

    // Must show inline error (A7) and NOT save
    expect(await screen.findByText(/Mandatory audit reason is required/i)).toBeInTheDocument();
  });

  it('keeps old values and displays inline error on API failure (A1)', async () => {
    vi.spyOn(api, 'batchUpdateAnomalyRules').mockRejectedValueOnce(new Error('Server database connection refused (500)'));

    render(
      <ThemeProvider>
        <SystemSettings liveRules={MOCK_RULES} token="test-token" />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /Tune Thresholds/i }));

    const reasonInput = screen.getByPlaceholderText(/Enter specific business justification/i);
    fireEvent.change(reasonInput, { target: { value: 'Valid operational audit justification' } });

    const saveBtn = screen.getByRole('button', { name: /Save Parameters/i });
    fireEvent.click(saveBtn);

    // Expect inline error banner displayed (A1, A7)
    expect(await screen.findByText(/Server database connection refused \(500\)/i)).toBeInTheDocument();

    // Close modal
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

    // Values on main card must remain untouched old values (09:00 - 18:00)
    expect(screen.getByText(/09:00 – 18:00 \(Asia\/Manila\)/i)).toBeInTheDocument();

    vi.restoreAllMocks();
  });
});


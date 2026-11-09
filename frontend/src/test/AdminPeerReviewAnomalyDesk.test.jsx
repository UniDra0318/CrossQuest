import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AdminPeerReviewAnomalyDesk from '../components/AdminPeerReviewAnomalyDesk';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';

describe('AdminPeerReviewAnomalyDesk baseline & tab functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation((url) => {
      if (String(url).includes('/anomalies/rules')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([])
        });
      }
      if (String(url).includes('/anomalies/alerts')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([])
        });
      }
      if (String(url).includes('/audit/logs')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([])
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({})
      });
    });
  });

  it('renders all 10 baseline anomaly detection rules without empty state', () => {
    render(
      <AuthProvider>
        <ThemeProvider>
          <AdminPeerReviewAnomalyDesk />
        </ThemeProvider>
      </AuthProvider>
    );

    // Switch to rules tab
    const rulesTabBtn = screen.getByText(/Anomaly Rules/i);
    expect(rulesTabBtn).toBeInTheDocument();
    fireEvent.click(rulesTabBtn);

    // Confirm active rules badge displays 10
    expect(screen.getByText(/10 ACTIVE RULES/i)).toBeInTheDocument();

    // Confirm sample baseline rule codes are rendered
    expect(screen.getByText('R1_OUT_OF_SCOPE')).toBeInTheDocument();
    expect(screen.getByText('R2_FAILED_LOGINS_ACCOUNT')).toBeInTheDocument();
    expect(screen.getByText('R3_HIGH_RECORD_ACCESS')).toBeInTheDocument();
    expect(screen.getByText('R4_RECORD_DELETION')).toBeInTheDocument();
    expect(screen.getByText('S1_AFTER_HOURS')).toBeInTheDocument();
  });

  it('opens threshold tuning modal when Tune Threshold button is clicked', () => {
    render(
      <AuthProvider>
        <ThemeProvider>
          <AdminPeerReviewAnomalyDesk />
        </ThemeProvider>
      </AuthProvider>
    );

    // Switch to rules tab
    fireEvent.click(screen.getByText(/Anomaly Rules/i));

    const tuneBtns = screen.getAllByRole('button', { name: /Tune Threshold/i });
    expect(tuneBtns.length).toBeGreaterThan(0);
    fireEvent.click(tuneBtns[0]);

    // Modal should be open
    expect(screen.getByText(/THRESHOLD TUNING • OI-08/i)).toBeInTheDocument();
    expect(screen.getByText(/Live Generated Output Parameters:/i)).toBeInTheDocument();
  });

  it('renders Master Audit Trail tab with baseline cryptographic audit logs', () => {
    render(
      <AuthProvider>
        <ThemeProvider>
          <AdminPeerReviewAnomalyDesk />
        </ThemeProvider>
      </AuthProvider>
    );

    // Switch to audit trail tab
    fireEvent.click(screen.getByText(/Audit Trail/i));

    expect(screen.getByText('CRYPTOGRAPHIC_KEY_ROTATION')).toBeInTheDocument();
    expect(screen.getAllByText('RULE_MODIFIED').length).toBeGreaterThan(0);
    expect(screen.getByText('RECORD_ACCESS_DENIED')).toBeInTheDocument();
  });
});

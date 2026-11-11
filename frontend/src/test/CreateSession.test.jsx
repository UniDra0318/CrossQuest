import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Sessions from '../staff/pages/Sessions';

// Mock contexts
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    currentUser: {
      id: 'usr-am-01',
      name: 'Sharon De Vera',
      role: 'account_manager',
      assigned_companies: ['VHL_2', 'ROP_3']
    },
    token: 'fake-token'
  })
}));

vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({ isDark: false })
}));

vi.mock('../staff/StaffContext', () => ({
  useStaff: () => ({
    isDark: false,
    staffProfile: {
      id: 'usr-am-01',
      name: 'Sharon De Vera',
      role: 'account_manager',
      assigned_companies: ['VHL_2', 'ROP_3']
    }
  })
}));

// Mock staff API calls
vi.mock('../api/staff', () => ({
  getTrainingSessions: vi.fn().mockResolvedValue([
    {
      id: 'sess-001',
      session_code: 'SES-2026-101',
      course_name: 'Agile PME & Project Management Challenge',
      venue: 'Crossworks HQ Manila',
      start_date: '2026-11-15',
      end_date: '2026-11-16',
      client_code: 'VHL_2',
      trainer_name: 'Jordan Ramos',
      trainers: ['Jordan Ramos'],
      status: 'CONFIRMED',
      participant_count: 12,
      decided_count: 0
    }
  ]),
  createTrainingSession: vi.fn().mockResolvedValue({
    id: 'sess-002',
    session_code: 'SES-2026-102',
    course_name: 'Supervisory Mastery',
    venue: 'Makati Training Hub',
    start_date: '2026-12-01',
    end_date: '2026-12-02',
    client_code: 'VHL_2',
    trainer_name: 'Jordan Ramos',
    trainers: ['Jordan Ramos'],
    status: 'SCHEDULED',
    participant_count: 0
  }),
  updateParticipantAttendance: vi.fn().mockResolvedValue({ success: true }),
  getStaffRecords: vi.fn().mockResolvedValue([])
}));

describe('Create Session Flow for Account Managers (B12)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders sessions page and displays New Training Session button', async () => {
    render(<Sessions />);

    expect(await screen.findByRole('button', { name: /New Training Session/i })).toBeInTheDocument();
  });

  it('opens new session modal and blocks submission with missing venue', async () => {
    render(<Sessions />);

    const newBtn = await screen.findByRole('button', { name: /New Training Session/i });
    fireEvent.click(newBtn);

    expect(screen.getByText(/Schedule New Training Session/i)).toBeInTheDocument();

    const venueInput = screen.getByPlaceholderText(/e\.g\. Online \(Zoom\)/i);
    fireEvent.change(venueInput, { target: { value: '   ' } });

    // Submit form
    const form = venueInput.closest('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/Venue is required/i)).toBeInTheDocument();
    });
  });

  it('displays error banner with retry option when loading sessions fails', async () => {
    const staffApi = await import('../api/staff');
    staffApi.getTrainingSessions.mockRejectedValueOnce(new Error('Network gateway timeout (504)'));

    render(<Sessions />);

    expect(await screen.findByText(/Server Connection Error:/i)).toBeInTheDocument();
    expect(screen.getByText(/Network gateway timeout \(504\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
  });

  it('displays trainer lookup failure feedback when fetching trainers fails', async () => {
    const apiModule = await import('../services/api');
    vi.spyOn(apiModule, 'fetchTrainers').mockRejectedValueOnce(new Error('Trainer service unavailable (503)'));

    render(<Sessions />);

    const newBtn = await screen.findByRole('button', { name: /New Training Session/i });
    fireEvent.click(newBtn);

    expect(await screen.findByText(/Trainer lookup unavailable: Trainer service unavailable \(503\)/i)).toBeInTheDocument();
    expect(screen.getByText(/-- Trainer lookup failed \(Trainer service unavailable \(503\)\) --/i)).toBeInTheDocument();
  });

  it('shows error in modal and keeps modal open when createTrainingSession fails on server', async () => {
    const apiModule = await import('../services/api');
    vi.spyOn(apiModule, 'fetchTrainers').mockResolvedValueOnce([
      { id: 't-1', name: 'Jordan Ramos', title: 'Certified Lead Trainer' }
    ]);
    const staffApi = await import('../api/staff');
    staffApi.createTrainingSession.mockRejectedValueOnce(new Error('Database duplicate session code constraint violation (409)'));

    render(<Sessions />);

    const newBtn = await screen.findByRole('button', { name: /New Training Session/i });
    fireEvent.click(newBtn);

    const venueInput = screen.getByPlaceholderText(/e\.g\. Online \(Zoom\)/i);
    fireEvent.change(venueInput, { target: { value: 'Crossworks Manila HQ' } });

    // Select trainer after async lookup resolves
    const trainerOption = await screen.findByRole('option', { name: /Jordan Ramos/i });
    fireEvent.change(trainerOption.closest('select'), { target: { value: 'Jordan Ramos' } });

    // Submit session creation form
    const form = venueInput.closest('form');
    fireEvent.submit(form);

    // Modal must NOT close and must display the error message
    expect(await screen.findByText(/Database duplicate session code constraint violation \(409\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Schedule New Training Session/i)).toBeInTheDocument();
  });
});

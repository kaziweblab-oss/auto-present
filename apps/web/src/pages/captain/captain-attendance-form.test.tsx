import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { apiClient } from '@/lib/api';
import { CaptainAttendanceForm } from './captain-attendance-form';

function localToday(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function futureDate(): string {
  const future = new Date();
  future.setDate(future.getDate() + 7);
  return `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, '0')}-${String(future.getDate()).padStart(2, '0')}`;
}

const subjects = [{ subjectCode: 'CSE-101', subjectName: 'Data Structures' }];

describe('CaptainAttendanceForm date validation', () => {
  beforeEach(async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValue({
      data: { success: true, data: { validRolls: ['101', '102'] } },
    });
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        success: true,
        data: { identity: { status: 'CONFIRMED', roll: '007' }, canViewAttendance: true },
      },
    });
    await i18n.changeLanguage('en');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows future date error in English', async () => {
    render(<CaptainAttendanceForm subjects={subjects} />);

    const dateInput = screen.getByLabelText('Attendance date') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: futureDate() } });

    await waitFor(() => {
      expect(
        screen.getByText(
          'Attendance cannot be submitted for a future date. Please select today or an earlier date.',
        ),
      ).toBeInTheDocument();
    });
  });

  it('shows future date error in Bengali', async () => {
    await i18n.changeLanguage('bn');
    render(<CaptainAttendanceForm subjects={subjects} />);

    const dateInput = screen.getByLabelText('উপস্থিতির তারিখ') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: futureDate() } });

    await waitFor(() => {
      expect(
        screen.getByText(
          'ভবিষ্যতের তারিখে উপস্থিতি জমা দেওয়া যাবে না। আজকের তারিখ অথবা আগের কোনো তারিখ নির্বাচন করুন।',
        ),
      ).toBeInTheDocument();
    });
  });

  it('clears error when a valid date is selected after a future date', async () => {
    render(<CaptainAttendanceForm subjects={subjects} />);

    const dateInput = screen.getByLabelText('Attendance date') as HTMLInputElement;

    fireEvent.change(dateInput, { target: { value: futureDate() } });
    await waitFor(() => {
      expect(
        screen.getByText(
          'Attendance cannot be submitted for a future date. Please select today or an earlier date.',
        ),
      ).toBeInTheDocument();
    });

    fireEvent.change(dateInput, { target: { value: localToday() } });
    await waitFor(() => {
      expect(
        screen.queryByText(
          'Attendance cannot be submitted for a future date. Please select today or an earlier date.',
        ),
      ).not.toBeInTheDocument();
    });
  });

  it('accepts today as valid', () => {
    render(<CaptainAttendanceForm subjects={subjects} />);
    const dateInput = screen.getByLabelText('Attendance date') as HTMLInputElement;
    expect(dateInput.value).toBe(localToday());
  });

  it('accepts a past date as valid', () => {
    render(<CaptainAttendanceForm subjects={subjects} />);
    const dateInput = screen.getByLabelText('Attendance date') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2024-01-15' } });
    expect(
      screen.queryByText(
        'Attendance cannot be submitted for a future date. Please select today or an earlier date.',
      ),
    ).not.toBeInTheDocument();
  });

  it('maps backend ATTENDANCE_DATE_FUTURE to the same localized error message', async () => {
    render(<CaptainAttendanceForm subjects={subjects} />);

    const dateInput = screen.getByLabelText('Attendance date') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: futureDate() } });

    await waitFor(() => {
      const msg = screen.getByText(
        'Attendance cannot be submitted for a future date. Please select today or an earlier date.',
      );
      expect(msg).toBeInTheDocument();
    });
  });

  it('shows no duplicate validation message', async () => {
    render(<CaptainAttendanceForm subjects={subjects} />);

    const dateInput = screen.getByLabelText('Attendance date') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: futureDate() } });

    await waitFor(() => {
      const messages = screen.getAllByText(
        'Attendance cannot be submitted for a future date. Please select today or an earlier date.',
      );
      expect(messages).toHaveLength(1);
    });
  });

  it('shows invalid field state for future date', async () => {
    render(<CaptainAttendanceForm subjects={subjects} />);

    const dateInput = screen.getByLabelText('Attendance date') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: futureDate() } });

    const label = dateInput.closest('label');
    expect(label).toHaveAttribute('data-invalid', 'true');
  });
});

describe('CaptainAttendanceForm cursor CSS', () => {
  beforeEach(async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValue({
      data: { success: true, data: { validRolls: ['101', '102'] } },
    });
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        success: true,
        data: { identity: { status: 'CONFIRMED', roll: '007' }, canViewAttendance: true },
      },
    });
    await i18n.changeLanguage('en');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders select-all button with captain-subject-action class', () => {
    render(<CaptainAttendanceForm subjects={subjects} />);
    const selectAllButton = screen.getByText('Select all').closest('button');
    expect(selectAllButton).toHaveClass('captain-subject-action');
  });

  it('renders clear button with captain-subject-action class', () => {
    render(<CaptainAttendanceForm subjects={subjects} />);
    const clearButton = screen.getByText('Clear').closest('button');
    expect(clearButton).toHaveClass('captain-subject-action');
  });

  it('renders submit button with primary-action class', () => {
    render(<CaptainAttendanceForm subjects={subjects} />);
    const subjectCheckbox = screen.getByRole('checkbox');
    fireEvent.click(subjectCheckbox);

    const submitButton = screen.getByRole('button', { name: /submit attendance/i });
    expect(submitButton).toHaveClass('primary-action');
  });
});

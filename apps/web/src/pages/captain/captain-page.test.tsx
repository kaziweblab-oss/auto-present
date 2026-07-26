import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { apiClient } from '@/lib/api';
import { CaptainPage } from './captain-page';

vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({
    status: 'authenticated',
    user: {
      id: 'captain',
      email: 'captain@example.test',
      displayName: 'Captain',
      roles: [],
      requestedRole: 'CAPTAIN',
    },
  }),
}));

const registration = {
  id: 'registration',
  version: 1,
  spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/safe-id',
  spreadsheetTitle: 'Cloned Attendance',
  department: 'CST',
  semester: '5th',
  shift: 'Morning',
  captainRoll: '007',
  subjects: [{ subjectCode: 'CSE-101', subjectName: 'Data Structures' }],
  parserVersion: 'captain-sheet-v1',
  structureFingerprint: 'fingerprint',
  health: 'READ_VERIFIED',
  writeScopeGranted: true,
  warnings: [],
  verifiedAt: new Date(0).toISOString(),
};

describe('Captain onboarding page', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders only the minimal verified dashboard and formats subjects centrally', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        success: true,
        data: { workspaceStatus: 'CONNECTED', registration },
      },
    });
    render(
      <MemoryRouter>
        <CaptainPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Captain verified')).toBeInTheDocument();

    expect(
      screen.getByRole('checkbox', {
        name: /Data Structures/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/registered subjects/i)).toBeInTheDocument();
    expect(screen.queryByText(/student roster/i)).not.toBeInTheDocument();
  });

  it('requires Workspace reconnection even when a previous registration still exists', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        success: true,
        data: {
          workspaceStatus: 'RECONNECT_REQUIRED',
          registration,
        },
      },
    });

    render(
      <MemoryRouter>
        <CaptainPage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('button', {
        name: /reconnect/i,
      }),
    ).toBeInTheDocument();

    expect(screen.queryByText('Captain verified')).not.toBeInTheDocument();

    expect(
      screen.queryByRole('checkbox', {
        name: /Data Structures/i,
      }),
    ).not.toBeInTheDocument();

    expect(screen.queryByLabelText('Google Sheet URL')).not.toBeInTheDocument();
  });

  it('prevents duplicate registration and shows a bilingual safe absent-roll error', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        success: true,
        data: { workspaceStatus: 'CONNECTED', registration: null },
      },
    });

    let rejectRequest!: (error: unknown) => void;

    const post = vi.spyOn(apiClient, 'post').mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectRequest = reject;
        }),
    );

    render(
      <MemoryRouter>
        <CaptainPage />
      </MemoryRouter>,
    );
    await screen.findByRole('button', { name: 'Verify Sheet' });
    fireEvent.change(screen.getByLabelText('Google Sheet URL'), {
      target: {
        value: 'https://docs.google.com/spreadsheets/d/1abcdefghijklmnopqrstuvwxyzABCDE/edit',
      },
    });
    fireEvent.change(screen.getByLabelText('Captain class roll'), {
      target: { value: '007' },
    });
    const form = screen.getByRole('button', { name: 'Verify Sheet' }).closest('form')!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(post).toHaveBeenCalledTimes(1);
    await i18n.changeLanguage('bn');
    rejectRequest({
      isAxiosError: true,
      response: { data: { error: { code: 'CAPTAIN_ROLL_NOT_FOUND' } } },
    });
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('আপনি এই ক্লাসের শিক্ষার্থী নন'),
    );
    expect(screen.getByRole('button', { name: 'Sheet যাচাই করুন' })).toBeEnabled();
  });

  it('does not render the verification banner for attendance submission failures', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        success: true,
        data: { workspaceStatus: 'CONNECTED', registration },
      },
    });

    const post = vi.spyOn(apiClient, 'post').mockImplementation((url: string) => {
      if (url === '/captain/attendance/valid-rolls') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              subjectCodes: ['CSE-101'],
              validRolls: ['007', '008'],
              subjectRolls: {
                'CSE-101': ['007', '008'],
              },
            },
          },
        });
      }

      return Promise.reject(new Error('ATTENDANCE_DATE_ALREADY_EXISTS'));
    });

    render(
      <MemoryRouter>
        <CaptainPage />
      </MemoryRouter>,
    );

    await screen.findByRole('button', {
      name: /^Submit attendance/,
    });

    const user = userEvent.setup();
    const subjectCheckbox = screen.getByRole('checkbox', {
      name: /Data Structures/i,
    });
    await user.click(subjectCheckbox);
    await waitFor(() =>
      expect(
        screen.getByRole('checkbox', {
          name: /Data Structures/i,
        }),
      ).toBeChecked(),
    );
    await waitFor(() => expect(screen.getByText(/1 of 1 selected/i)).toBeInTheDocument());

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        '/captain/attendance/valid-rolls',
        expect.objectContaining({ subjectCodes: ['CSE-101'] }),
      ),
    );

    fireEvent.change(screen.getByLabelText('Attendance date'), {
      target: { value: '2024-01-02' },
    });

    const rollInput = await screen.findByLabelText('Present rolls');
    fireEvent.change(rollInput, { target: { value: '007' } });
    fireEvent.keyDown(rollInput, { key: 'Enter' });

    fireEvent.submit(screen.getByRole('button', { name: /^Submit attendance/ }).closest('form')!);

    await waitFor(() =>
      expect(
        screen.queryByText(/Captain verification could not be completed/i),
      ).not.toBeInTheDocument(),
    );
  });

  it('prevents duplicate attendance writes and localizes the duplicate-date result', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        success: true,
        data: { workspaceStatus: 'CONNECTED', registration },
      },
    });

    const post = vi.spyOn(apiClient, 'post').mockImplementation((url: string) => {
      if (url === '/captain/attendance/valid-rolls') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              subjectCodes: ['CSE-101'],
              validRolls: ['007', '008'],
              subjectRolls: {
                'CSE-101': ['007', '008'],
              },
            },
          },
        });
      }

      return Promise.resolve({
        data: {
          success: true,
          data: {
            date: '2024-01-02',
            requestedSubjects: 1,
            writtenSubjects: 0,
            failedSubjects: 1,
            status: 'FAILED',
            results: [
              {
                subject: { subjectCode: 'CSE-101', subjectName: 'Data Structures' },
                date: '2024-01-02',
                total: 2,
                present: 0,
                absent: 2,
                status: 'FAILED',
                errorCode: 'ATTENDANCE_DATE_ALREADY_EXISTS',
                errorMessage: 'Attendance date already exists',
              },
            ],
          },
        },
      });
    });

    render(
      <MemoryRouter>
        <CaptainPage />
      </MemoryRouter>,
    );

    await screen.findByRole('button', {
      name: /^Submit attendance/,
    });

    const user = userEvent.setup();
    const checkbox = screen.getByRole('checkbox', {
      name: /Data Structures/i,
    });
    await user.click(checkbox);
    await waitFor(() =>
      expect(
        screen.getByRole('checkbox', {
          name: /Data Structures/i,
        }),
      ).toBeChecked(),
    );
    await waitFor(() => expect(screen.getByText(/1 of 1 selected/i)).toBeInTheDocument());

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        '/captain/attendance/valid-rolls',
        expect.objectContaining({
          subjectCodes: ['CSE-101'],
        }),
      ),
    );

    const rollInput = screen.getByLabelText('Present rolls');
    await waitFor(() => expect(rollInput).toBeEnabled());

    fireEvent.change(screen.getByLabelText('Attendance date'), {
      target: { value: '2024-01-02' },
    });

    fireEvent.change(rollInput, {
      target: { value: '007' },
    });

    fireEvent.keyDown(rollInput, {
      key: ' ',
    });

    fireEvent.change(rollInput, {
      target: { value: '008' },
    });

    fireEvent.keyDown(rollInput, {
      key: 'Enter',
    });

    const form = screen
      .getByRole('button', {
        name: /^Submit attendance/,
      })
      .closest('form')!;

    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(post).toHaveBeenCalledTimes(2);

    expect(post).toHaveBeenCalledWith(
      '/captain/attendance/batch',
      expect.objectContaining({
        date: '2024-01-02',
        idempotencyKey: expect.any(String),
        presentRolls: ['007', '008'],
        subjectCodes: ['CSE-101'],
      }),
      expect.objectContaining({
        timeout: 60_000,
      }),
    );

    await i18n.changeLanguage('bn');

    // Wait for the attendance summary section to appear, then assert its localized message
    await screen.findByRole('status');
    expect(screen.getByRole('status')).toHaveTextContent(
      'এই তারিখের উপস্থিতি আগে থেকেই দেওয়া হয়েছে।',
    );

    expect(
      screen.getByRole('button', {
        name: /^উপস্থিতি জমা দিন/,
      }),
    ).toBeEnabled();
  });

  it('submits attendance once when the form is submitted rapidly and ignores Enter roll commits', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        success: true,
        data: { workspaceStatus: 'CONNECTED', registration },
      },
    });

    const post = vi.spyOn(apiClient, 'post').mockImplementation((url: string) => {
      if (url === '/captain/attendance/valid-rolls') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              subjectCodes: ['CSE-101'],
              validRolls: ['007', '008'],
              subjectRolls: {
                'CSE-101': ['007', '008'],
              },
            },
          },
        });
      }

      return Promise.resolve({
        data: {
          success: true,
          data: {
            date: '2024-01-02',
            requestedSubjects: 1,
            writtenSubjects: 1,
            failedSubjects: 0,
            status: 'WRITTEN',
            results: [
              {
                subject: { subjectCode: 'CSE-101', subjectName: 'Data Structures' },
                date: '2024-01-02',
                total: 2,
                present: 1,
                absent: 1,
                status: 'WRITTEN',
              },
            ],
          },
        },
      });
    });

    render(
      <MemoryRouter>
        <CaptainPage />
      </MemoryRouter>,
    );

    await screen.findByRole('button', { name: /^Submit attendance/ });

    const user = userEvent.setup();
    const subjectCheckbox2 = screen.getByRole('checkbox', {
      name: /Data Structures/i,
    });
    await user.click(subjectCheckbox2);
    await waitFor(() =>
      expect(
        screen.getByRole('checkbox', {
          name: /Data Structures/i,
        }),
      ).toBeChecked(),
    );
    await waitFor(() => expect(screen.getByText(/1 of 1 selected/i)).toBeInTheDocument());

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        '/captain/attendance/valid-rolls',
        expect.objectContaining({ subjectCodes: ['CSE-101'] }),
      ),
    );

    const rollInput = screen.getByLabelText('Present rolls');
    await waitFor(() => expect(rollInput).toBeEnabled());

    fireEvent.change(screen.getByLabelText('Attendance date'), {
      target: { value: '2024-01-02' },
    });

    fireEvent.change(rollInput, { target: { value: '007' } });
    fireEvent.keyDown(rollInput, { key: 'Enter' });

    const form = screen.getByRole('button', { name: /^Submit attendance/ }).closest('form')!;
    fireEvent.submit(form);
    fireEvent.submit(form);

    await waitFor(() => expect(post).toHaveBeenCalledTimes(2));

    // Wait for the attendance summary to render and assert the English success message
    await screen.findByRole('status');
    expect(screen.getByRole('status')).toHaveTextContent(/Attendance was submitted successfully/i);
    expect(screen.getByRole('checkbox', { name: /Data Structures/i })).not.toBeChecked();
  });

  /* ───── Cursor behavior ───── */

  it('renders captain page buttons with primary-action class', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        success: true,
        data: { workspaceStatus: 'NOT_CONNECTED', registration: null },
      },
    });
    render(
      <MemoryRouter>
        <CaptainPage />
      </MemoryRouter>,
    );
    const connectBtn = await screen.findByRole('button', { name: /connect google workspace/i });
    expect(connectBtn.className).toContain('primary-action');
  });
});

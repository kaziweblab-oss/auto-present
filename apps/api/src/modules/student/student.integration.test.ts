import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../app.js';
import { AppError } from '../../errors/app-error.js';
import { signAccessToken } from '../auth/auth.crypto.js';

const userId = '507f1f77bcf86cd799439011';
const sessionId = '507f1f77bcf86cd799439012';

describe('Student API routes', () => {
  const mockStudentService = {
    status: vi.fn<(...args: never[]) => unknown>(),
    register: vi.fn<(...args: never[]) => unknown>(),
    dashboard: vi.fn<(...args: never[]) => unknown>(),
    attendanceHistory: vi.fn<(...args: never[]) => unknown>(),
    getRegistrationOptions: vi.fn<(...args: never[]) => unknown>(),
  };

  const app = createApp({ studentService: mockStudentService as never });
  let accessToken: string;

  beforeAll(async () => {
    accessToken = await signAccessToken(userId, sessionId, []);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authentication', () => {
    it('rejects GET /api/v1/student/status when unauthenticated', async () => {
      await request(app).get('/api/v1/student/status').expect(401);
    });

    it('rejects POST /api/v1/student/registration when unauthenticated', async () => {
      await request(app).post('/api/v1/student/registration').expect(401);
    });

    it('rejects GET /api/v1/student/dashboard when unauthenticated', async () => {
      await request(app).get('/api/v1/student/dashboard').expect(401);
    });

    it('rejects GET /api/v1/student/attendance when unauthenticated', async () => {
      await request(app).get('/api/v1/student/attendance').expect(401);
    });

    it('rejects GET /api/v1/student/registration-options when unauthenticated', async () => {
      await request(app).get('/api/v1/student/registration-options').expect(401);
    });
  });

  describe('POST /api/v1/student/registration', () => {
    it('rejects invalid request body with VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/v1/student/registration')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Origin', 'http://localhost:5173')
        .set('X-CSRF-Token', 'csrf')
        .set('Cookie', 'ap_csrf=csrf')
        .send({ department: '' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects missing CSRF with 403', async () => {
      await request(app)
        .post('/api/v1/student/registration')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Origin', 'http://localhost:5173')
        .send({
          department: 'CST',
          semester: '5th',
          shift: 'Morning',
          roll: '007',
        })
        .expect(403);
    });

    it('forwards valid fields to service.register', async () => {
      mockStudentService.register.mockResolvedValue({ id: 'reg-1' });

      const res = await request(app)
        .post('/api/v1/student/registration')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Origin', 'http://localhost:5173')
        .set('X-CSRF-Token', 'csrf')
        .set('Cookie', 'ap_csrf=csrf')
        .send({
          department: 'CST',
          semester: '5th',
          shift: 'Morning',
          roll: '007',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual({ id: 'reg-1' });
      expect(mockStudentService.register).toHaveBeenCalledWith(
        userId,
        sessionId,
        'CST',
        '5th',
        'Morning',
        '007',
      );
    });
  });

  describe('GET /api/v1/student/status', () => {
    it('returns success response from service.status', async () => {
      mockStudentService.status.mockResolvedValue({ registered: true });

      const res = await request(app)
        .get('/api/v1/student/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual({ registered: true });
      expect(mockStudentService.status).toHaveBeenCalledWith(userId, sessionId);
    });
  });

  describe('GET /api/v1/student/dashboard', () => {
    it('returns success response from service.dashboard', async () => {
      mockStudentService.dashboard.mockResolvedValue({ subjects: [] });

      const res = await request(app)
        .get('/api/v1/student/dashboard')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual({ subjects: [] });
      expect(mockStudentService.dashboard).toHaveBeenCalledWith(userId, sessionId);
    });
  });

  describe('GET /api/v1/student/attendance', () => {
    it('forwards query params to service.attendanceHistory', async () => {
      mockStudentService.attendanceHistory.mockResolvedValue({ records: [] });

      const res = await request(app)
        .get('/api/v1/student/attendance')
        .query({ subjectCode: 'CSE-101', dateFrom: '2024-01-01' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual({ records: [] });
      expect(mockStudentService.attendanceHistory).toHaveBeenCalledWith(userId, sessionId, {
        subjectCode: 'CSE-101',
        dateFrom: '2024-01-01',
      });
    });

    it('omits undefined optional query fields', async () => {
      mockStudentService.attendanceHistory.mockResolvedValue({ records: [] });

      await request(app)
        .get('/api/v1/student/attendance')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(mockStudentService.attendanceHistory).toHaveBeenCalledWith(userId, sessionId, {});
    });
  });

  describe('GET /api/v1/student/registration-options', () => {
    it('returns success response from service.getRegistrationOptions', async () => {
      mockStudentService.getRegistrationOptions.mockResolvedValue({
        options: [
          {
            department: 'CST',
            departmentKey: 'cst',
            semester: '5th',
            semesterKey: '5th',
            shift: 'Morning',
            shiftKey: 'morning',
          },
        ],
      });

      const res = await request(app)
        .get('/api/v1/student/registration-options')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.options).toHaveLength(1);
      expect(res.body.data.options[0]).toMatchObject({ department: 'CST', shift: 'Morning' });
      expect(mockStudentService.getRegistrationOptions).toHaveBeenCalledWith(userId, sessionId);
    });
  });

  describe('error forwarding', () => {
    it('converts AppError from service into error response', async () => {
      mockStudentService.status.mockRejectedValue(
        new AppError(404, 'STUDENT_NOT_FOUND', 'Student not found'),
      );

      const res = await request(app)
        .get('/api/v1/student/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('STUDENT_NOT_FOUND');
      expect(res.body.error.message).toBe('Student not found');
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.requestId).toBeDefined();
    });
  });
});

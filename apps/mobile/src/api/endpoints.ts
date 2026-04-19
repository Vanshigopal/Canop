import { api } from './client';

// ── Auth ─────────────────────────────────────────────────
export const Auth = {
  login: (tenantSlug: string, email: string, password: string) =>
    api.post('/auth/login', { tenantSlug, email, password }),
  requestOtp: (tenantSlug: string, phone: string) =>
    api.post('/auth/otp/send', { tenantSlug, phone }),
  verifyOtp: (tenantSlug: string, phone: string, otp: string) =>
    api.post('/auth/otp/verify', { tenantSlug, phone, otp }),
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
  me: () => api.get('/auth/me'),
  logout: () => api.delete('/auth/sessions'),
  registerDeviceToken: (token: string, deviceId: string) =>
    api.post('/auth/device-token', { token, platform: 'android', deviceId }),
  unregisterDeviceToken: (deviceId: string) =>
    api.delete(`/auth/device-token/${deviceId}`),
};

// ── Student dashboards / portal ──────────────────────────
export const Student = {
  dashboard: () => api.get('/student/dashboard'),
  attendance: (params?: { from?: string; to?: string }) =>
    api.get('/student/attendance', { params }),
  fees: () => api.get('/student/fees'),
  assignments: () => api.get('/student/assignments'),
  videos: () => api.get('/student/videos'),
  materials: () => api.get('/student/materials'),
  profile: () => api.get('/student/profile'),
};

// ── Parent portal ────────────────────────────────────────
export const Parent = {
  children: () => api.get('/parent/children'),
  dashboard: (childId: string) =>
    api.get(`/parent/children/${childId}/dashboard`),
  fees: (childId: string) =>
    api.get(`/parent/children/${childId}/fees`),
  attendance: (childId: string) =>
    api.get(`/parent/children/${childId}/attendance`),
  grades: (childId: string) =>
    api.get(`/parent/children/${childId}/grades`),
};

// ── Teacher ──────────────────────────────────────────────
export const Teacher = {
  dashboard: () => api.get('/teacher/dashboard'),
  batches: () => api.get('/batches'),
  attendanceSession: (sessionId: string) =>
    api.get(`/attendance/sessions/${sessionId}`),
  scanQr: (sessionId: string, token: string) =>
    api.post('/attendance/qr/scan', { sessionId, token }),
  markAttendance: (
    sessionId: string,
    studentId: string,
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED',
  ) => api.post(`/attendance/sessions/${sessionId}/mark`, { studentId, status }),
};

// ── Admin ────────────────────────────────────────────────
export const Admin = {
  dashboard: () => api.get('/dashboard/stats'),
  students: (params?: { search?: string; page?: number }) =>
    api.get('/students', { params }),
  fees: () => api.get('/fees/reports/summary'),
  exams: () => api.get('/exams'),
  broadcasts: () => api.get('/broadcasts'),
};

// ── Notifications ────────────────────────────────────────
export const Notifications = {
  list: (params?: { read?: boolean }) =>
    api.get('/notifications', { params }),
  markRead: (id: string) => api.post(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
};

// ── Payments ─────────────────────────────────────────────
export const Payments = {
  createOrder: (installmentId: string) =>
    api.post('/payments/order', { installmentId }),
  verify: (orderId: string, paymentId: string, signature: string) =>
    api.post('/payments/verify', { orderId, paymentId, signature }),
};

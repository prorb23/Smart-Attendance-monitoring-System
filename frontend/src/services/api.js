import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config.url.includes('/auth/login')) {
      localStorage.removeItem('token');
      window.location.replace('/login');
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// ─── Students ─────────────────────────────────────────────────────────────────

export const studentsAPI = {
  list: (search = '') => api.get('/students', { params: search ? { search } : {} }),
  get: (studentId) => api.get(`/students/${encodeURIComponent(studentId)}`),
  create: (data) => api.post('/students', data),
  update: (studentId, data) => api.put(`/students/${encodeURIComponent(studentId)}`, data),
  delete: (studentId) => api.delete(`/students/${encodeURIComponent(studentId)}`),
};

// ─── Face Recognition ─────────────────────────────────────────────────────────

export const facesAPI = {
  register: (data) => api.post('/faces/register', data),
  train: () => api.post('/faces/train'),
};

// ─── Attendance ───────────────────────────────────────────────────────────────

export const attendanceAPI = {
  mark: (data) => api.post('/attendance/mark', data),
  list: (params = {}) => api.get('/attendance', { params }),
  getStats: () => api.get('/attendance/stats'),
  getTrends: (days = 7) => api.get('/attendance/trends', { params: { days } }),
  getMonthlyTrends: (months = 6) => api.get('/attendance/monthly-trends', { params: { months } }),
  getStudentAttendance: (studentId) => api.get(`/attendance/student/${encodeURIComponent(studentId)}`),
  getStudentStats: (studentId) => api.get(`/attendance/student-stats/${encodeURIComponent(studentId)}`),
};

// ─── Reports ──────────────────────────────────────────────────────────────────

export const reportsAPI = {
  exportExcel: (params = {}) => api.get('/reports/export/excel', { params, responseType: 'blob' }),
  exportCSV: (params = {}) => api.get('/reports/export/csv', { params, responseType: 'blob' }),
};

export default api;

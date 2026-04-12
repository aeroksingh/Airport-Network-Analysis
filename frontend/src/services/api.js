import axios from 'axios';

const BASE = (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const API_URL = `${BASE}/api`;

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
  withCredentials: true,
});

// Auto-attach token + session id
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['x-session-id'] = (() => {
    let id = localStorage.getItem('_sid');
    if (!id) { id = Math.random().toString(36).slice(2); localStorage.setItem('_sid', id); }
    return id;
  })();
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Named API groups — used by all pages
export const authAPI = {
  setup:    d => api.post('/auth/setup', d),
  register: d => api.post('/auth/register', d),
  login:    d => api.post('/auth/login', d),
  me:       () => api.get('/auth/me'),
};
export const flightAPI = {
  getAll:  p => api.get('/flights', { params: p }),
  getOne:  id => api.get(`/flights/${id}`),
  create:  d => api.post('/flights', d),
  update:  (id, d) => api.put(`/flights/${id}`, d),
  delete:  id => api.delete(`/flights/${id}`),
};
export const passengerAPI = {
  getAll:  p => api.get('/passengers', { params: p }),
  create:  d => api.post('/passengers', d),
  update:  (id, d) => api.put(`/passengers/${id}`, d),
  checkIn: (id, d) => api.patch(`/passengers/${id}/checkin`, d),
  delete:  id => api.delete(`/passengers/${id}`),
};
export const gateAPI = {
  getAll:         p => api.get('/gates', { params: p }),
  create:         d => api.post('/gates', d),
  update:         (id, d) => api.put(`/gates/${id}`, d),
  assignFlight:   (id, flightId) => api.patch(`/gates/${id}/assign`, { flightId }),
  unassignFlight: id => api.patch(`/gates/${id}/unassign`),
  delete:         id => api.delete(`/gates/${id}`),
};
export const userAPI = {
  getAll: () => api.get('/users'),
};
export const fileAPI = {
  upload:      form => api.post('/files/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  send:        d => api.post('/files/send', d),
  received:    () => api.get('/files/received'),
  sent:        () => api.get('/files/sent'),
  download:    fmt => `${API_URL}/logs/download?format=${fmt}`,
};
export const adminAPI = {
  getUsers:   () => api.get('/admin/users'),
  createUser: d => api.post('/admin/users', d),
  deleteUser: id => api.delete(`/admin/users/${id}`),
  setRole:    (id, role) => api.patch(`/admin/users/${id}/role`, { role }),
  getLogs:    () => api.get('/admin/logs'),
};

export { API_URL };
export default api;

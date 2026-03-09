import axios from 'axios';

const BASE_URL = 'http://127.0.0.1:3001/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 120000,
  // timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message = err.response?.data?.error || err.message || 'Network error';
    console.error('[API Error]', message);
    return Promise.reject(new Error(message));
  }
);

// Pages
export const pagesApi = {
  getAll: () => api.get('/pages'),
  getById: (id) => api.get(`/pages/${id}`),
  create: (data) => api.post('/pages', data),
  update: (id, data) => api.put(`/pages/${id}`, data),
  delete: (id) => api.delete(`/pages/${id}`),
  duplicate: (id) => api.post(`/pages/${id}/duplicate`),
  reorder: (pages) => api.post('/pages/reorder', { pages }),
};

// Blocks
export const blocksApi = {
  getByPage: (pageId) => api.get(`/blocks/page/${pageId}`),
  create: (data) => api.post('/blocks', data),
  update: (id, data) => api.put(`/blocks/${id}`, data),
  batchUpdate: (blocks) => api.put('/blocks/batch/update', { blocks }),
  delete: (id) => api.delete(`/blocks/${id}`),
  reorder: (pageId, blocks) => api.post('/blocks/reorder', { page_id: pageId, blocks }),
};

// Databases
export const databasesApi = {
  getByPage: (pageId) => api.get(`/databases/page/${pageId}`),
  getById: (id) => api.get(`/databases/${id}`),
  create: (data) => api.post('/databases', data),
  update: (id, data) => api.put(`/databases/${id}`, data),
  addProperty: (id, data) => api.post(`/databases/${id}/properties`, data),
  updateProperty: (id, propId, data) => api.put(`/databases/${id}/properties/${propId}`, data),
  deleteProperty: (id, propId) => api.delete(`/databases/${id}/properties/${propId}`),
  addRow: (id) => api.post(`/databases/${id}/rows`),
  updateCell: (id, rowId, propId, value) => api.put(`/databases/${id}/rows/${rowId}/cells/${propId}`, { value }),
  deleteRow: (id, rowId) => api.delete(`/databases/${id}/rows/${rowId}`),
};

// Search
export const searchApi = {
  search: (q) => api.get(`/search?q=${encodeURIComponent(q)}`),
  recent: () => api.get('/search/recent'),
};

// AI
export const aiApi = {
  status: () => api.get('/ai/status'),
  summarize: (content, model) => api.post('/ai/summarize', { content, model }),
  rewrite: (text, style, model) => api.post('/ai/rewrite', { text, style, model }),
  ideas: (topic, count, model) => api.post('/ai/ideas', { topic, count, model }),
  continue: (text, model) => api.post('/ai/continue', { text, model }),
  ask: (question, context, model) => api.post('/ai/ask', { question, context, model }),
};

// Upload
export const uploadApi = {
  image: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return axios.post(`${BASE_URL}/upload/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
};

export default api;

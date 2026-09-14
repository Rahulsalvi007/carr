import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
});

export const getHealth = () => api.get('/health');
export const getNetworkIp = () => api.get('/network-ip');
export const getConfig = () => api.get('/config');
export const updateConfig = (data) => api.post('/config', data);


export const getAnalytics = (days = 7) => api.get(`/analytics?days=${days}`);

export const getViolations = (params) => api.get('/violations', { params });
export const getViolation = (id) => api.get(`/violations/${id}`);
export const updateViolationStatus = (id, status) => api.patch(`/violations/${id}/status`, { status });
export const deleteViolation = (id) => api.delete(`/violations/${id}`);
export const bulkDeleteViolations = (ids) => api.post('/violations/bulk-delete', { ids });
export const clearAllViolations = (params = {}) => api.delete('/violations/clear', { params });

export const getVehicles = (params) => api.get('/vehicles', { params });
export const getDetectionsHistory = (params) => api.get('/detections', { params });
export const getDetection = (id) => api.get(`/detections/${id}`);
export const updateDetection = (id, data) => api.patch(`/detections/${id}`, data);
export const deleteDetection = (id) => api.delete(`/detections/${id}`);
export const bulkDeleteDetections = (ids) => api.post('/detections/bulk-delete', { ids });
export const clearAllDetections = (params = {}) => api.delete('/detections/clear', { params });

export const detectImage = (formData, params = {}) => api.post('/detect/image', formData, {
  params,
  headers: { 'Content-Type': 'multipart/form-data' },
});

export const detectVideo = (formData, frameSkip = 2, params = {}) => api.post(`/detect/video`, formData, {
  params: { frame_skip: frameSkip, ...params },
  headers: { 'Content-Type': 'multipart/form-data' },
});

export default api;

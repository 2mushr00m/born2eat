import api from './api';

export const postInquiry = (formData) => api.post('/inquiries', formData);

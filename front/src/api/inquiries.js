import api from './api';

export const postInquiry = ({ type, title, content }) => {
  return api.post('/inquiries', {
    type,
    title,
    content,
  });
};

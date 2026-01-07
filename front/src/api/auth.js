import api from './api';

// login
export const loginApi = ({ email, password }) => {
  return api.post("/auth/login", { email, password });
};

// logout
export const logoutApi = () => {
  return api.post("/auth/logout");
};

// signup
export const signupApi = ({ email, password, phone, nickname }) => {
  return api.post("/auth/signup", { email, password, phone, nickname });
};

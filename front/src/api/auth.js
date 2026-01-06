import api from './api';

// 로그인
export const LoginApi = ({ email, password }) => {
  return api.post("/auth/login", {
    email,
    password,
  });
};

// 로그아웃
export const LogoutApi = () => {
  return api.post("/auth/logout");
};

// 회원가입 임시
export const signup = ({ email, password, name, phone }) => {
  return api.post('/api/signup', {
    email,
    password,
    name,
    phone
  });
};

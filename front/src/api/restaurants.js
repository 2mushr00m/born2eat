// 음식점 관련 api 호출
import api from "./api";

export const getMe = () => api.get("/me");

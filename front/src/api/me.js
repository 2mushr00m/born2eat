// 마이페이지 api 호출
import api from "./api";

export const getMe = () => api.get("/me");
export const getMyLikes = () => api.get("/me/likes");
export const getMyReviews = () => api.get("/me/reviews");
export const getMyInquiries = () => api.get("/me/inquiries");
export const patchMe = (formData) => api.patch("/me", formData);
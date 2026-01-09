export const mockStats = {
  totalRestaurants: 142,
  pendingApprovals: 8,
  openReports: 5,
  totalReviews: 1280,
  avgRating: 4.3,
  bookmarks: 3920,
  searches7d: 8210,
  geocodeFail: 3,
};

export const mockTodos = [
  { id: 1, type: "승인대기", title: "생활의달인 - OO국수", createdAt: "2026-01-05", priority: "HIGH" },
  { id: 2, type: "수정요청", title: "주소 변경 요청: XX돈까스", createdAt: "2026-01-05", priority: "MID" },
  { id: 3, type: "신고", title: "폐업 신고: YY카페", createdAt: "2026-01-04", priority: "HIGH" },
  { id: 4, type: "리뷰신고", title: "광고성 리뷰 신고", createdAt: "2026-01-04", priority: "LOW" },
];

export const mockTopRestaurants = [
  { id: 101, name: "OO국수", area: "강남", score: 98, views: 2100, bookmarks: 480, reviews: 120 },
  { id: 102, name: "XX돈까스", area: "홍대", score: 92, views: 1800, bookmarks: 390, reviews: 98 },
  { id: 103, name: "YY카페", area: "성수", score: 86, views: 1500, bookmarks: 410, reviews: 64 },
  { id: 104, name: "ZZ곱창", area: "신촌", score: 79, views: 1200, bookmarks: 260, reviews: 58 },
];

export const mockTopTags = [
  { tag: "#가성비", count: 64 },
  { tag: "#혼밥", count: 58 },
  { tag: "#웨이팅", count: 47 },
  { tag: "#데이트", count: 41 },
  { tag: "#현지인맛집", count: 36 },
];

export const mockQuality = [
  { label: "좌표 미설정", value: 3, total: 142 },
  { label: "주소 표준화 실패", value: 2, total: 142 },
  { label: "중복 후보", value: 6, total: 142 },
  { label: "운영시간 미기재", value: 18, total: 142 },
];

import React from "react";
import KpiCard from "./dashboard/components/KpiCard";
import SectionCard from "./dashboard/components/SectionCard";
import StatusBadge from "./dashboard/components/StatusBadge";
import ProgressBar from "./dashboard/components/ProgressBar";
import DataTable from "./dashboard/components/DataTable";

import {
  mockStats,
  mockTodos,
  mockTopRestaurants,
  mockTopTags,
  mockQuality,
} from "./dashboard/mock/dashboardMock";

export default function Adboard() {
  const stats = mockStats;

  const todoColumns = [
    { key: "type", title: "유형", width: 90, render: (r) => <StatusBadge text={r.type} /> },
    { key: "title", title: "내용" },
    { key: "createdAt", title: "등록일", width: 110 },
    {
      key: "action",
      title: "처리",
      width: 160,
      render: (r) => (
        <div style={{ display: "flex", gap: 8 }}>
          <button style={btn.primary} onClick={() => alert(`처리: ${r.id}`)}>처리</button>
          <button style={btn.ghost} onClick={() => alert(`보류: ${r.id}`)}>보류</button>
        </div>
      ),
    },
  ];

  const topRestaurantColumns = [
    { key: "name", title: "맛집" },
    { key: "area", title: "지역", width: 90 },
    {
      key: "score",
      title: "인기점수",
      width: 160,
      render: (r) => (
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ width: 120 }}>
            <ProgressBar value={r.score} total={100} />
          </div>
          <strong>{r.score}</strong>
        </div>
      ),
    },
    { key: "views", title: "조회", width: 90 },
    { key: "bookmarks", title: "북마크", width: 90 },
    { key: "reviews", title: "리뷰", width: 70 },
  ];

  return (
    <div style={styles.page}>
      {/* <div style={styles.top}>
        <h2 style={{ margin: 0 }}></h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={btn.ghost} onClick={() => alert("새로고침(데모)")}>새로고침</button>
          <button style={btn.primary} onClick={() => alert("리포트 다운로드(데모)")}>리포트</button>
        </div>
      </div> */}

      {/* KPI */}
      <div style={styles.kpiGrid}>
        <KpiCard label="총 맛집" value={stats.totalRestaurants} sub="전체 등록된 맛집 수" />
        <KpiCard label="승인 대기" value={stats.pendingApprovals} sub="관리자 승인 필요" />
        <KpiCard label="미처리 신고" value={stats.openReports} sub="폐업/오류/리뷰신고 등" />
        <KpiCard label="리뷰" value={stats.totalReviews} sub={`평균 평점 ${stats.avgRating}`} />
        <KpiCard label="북마크" value={stats.bookmarks.toLocaleString()} sub="사용자 찜/저장" />
        <KpiCard label="최근 7일 검색" value={stats.searches7d.toLocaleString()} sub="검색 로그 기반" />
        <KpiCard label="좌표 오류" value={stats.geocodeFail} sub="지도 표시 불가" />
      </div>

      {/* 2행: 운영할 일 + 인기 TOP */}
      <div style={styles.row2}>
        <SectionCard
          title="운영 할 일(처리함)"
          right={<span style={styles.mini}>총 {mockTodos.length}건</span>}
        >
          <DataTable columns={todoColumns} rows={mockTodos} rowKey={(r) => r.id} />
        </SectionCard>

        <SectionCard
          title="이번주 인기 맛집 TOP"
          right={<span style={styles.mini}>조회·북마크·리뷰 기반(데모)</span>}
        >
          <DataTable
            columns={topRestaurantColumns}
            rows={mockTopRestaurants}
            rowKey={(r) => r.id}
          />
        </SectionCard>
      </div>

      {/* 3행: 태그 TOP + 데이터 품질 */}
      <div style={styles.row3}>
        <SectionCard title="인기 태그 TOP" right={<span style={styles.mini}>최근 7일</span>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {mockTopTags.map((t) => (
              <div key={t.tag} style={styles.tagRow}>
                <div style={{ fontWeight: 800 }}>{t.tag}</div>
                <div style={{ flex: 1 }}>
                  <ProgressBar value={t.count} total={mockTopTags[0].count} />
                </div>
                <div style={{ width: 40, textAlign: "right" }}>{t.count}</div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="데이터 품질(정리 필요)" right={<span style={styles.mini}>정합성 지표</span>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {mockQuality.map((q) => (
              <div key={q.label} style={styles.qualityRow}>
                <div style={{ width: 140, fontWeight: 800 }}>{q.label}</div>
                <div style={{ flex: 1 }}>
                  <ProgressBar value={q.value} total={q.total} />
                </div>
                <div style={{ width: 80, textAlign: "right", color: "#444" }}>
                  {q.value} / {q.total}
                </div>
              </div>
            ))}
            <div style={{ marginTop: 6, fontSize: 12, color: "#777" }}>
              * 좌표 미설정/주소 실패/중복 후보 등은 지도 품질에 직접 영향이 있습니다.
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

const styles = {
  page: {
    // padding: 20,
    // marginLeft: 260,          
    // width: "calc(100% - 260px)",
    width: "100%",
    boxSizing: "border-box",
  },

  top: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  kpiGrid: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 16,
  },
  row2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginBottom: 12,
  },
  row3: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  mini: {
    fontSize: 12,
    color: "#777",
  },
  tagRow: {
    display: "grid",
    gridTemplateColumns: "120px 1fr 50px",
    gap: 12,
    alignItems: "center",
  },
  qualityRow: {
    display: "flex",
    gap: 12,
    alignItems: "center",
  },
};

const btn = {
  primary: {
    border: "none",
    borderRadius: 10,
    padding: "8px 12px",
    cursor: "pointer",
    fontWeight: 800,
    background: "#4c6ef5",
    color: "#fff",
  },
  ghost: {
    border: "1px solid #dbe4ff",
    borderRadius: 10,
    padding: "8px 12px",
    cursor: "pointer",
    fontWeight: 800,
    background: "#fff",
    color: "#2b4cff",
  },
};

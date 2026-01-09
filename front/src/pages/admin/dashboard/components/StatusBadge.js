import React from "react";

export default function StatusBadge({ text }) {
  const style = {
    ...styles.base,
    ...(text === "승인대기" ? styles.pending : {}),
    ...(text === "수정요청" ? styles.edit : {}),
    ...(text === "신고" ? styles.report : {}),
    ...(text === "리뷰신고" ? styles.review : {}),
  };

  return <span style={style}>{text}</span>;
}

const styles = {
  base: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    background: "#eee",
    color: "#333",
  },
  pending: { background: "#fff3cd", color: "#8a6d3b" },
  edit: { background: "#d1ecf1", color: "#0c5460" },
  report: { background: "#f8d7da", color: "#721c24" },
  review: { background: "#e2e3ff", color: "#2c2f87" },
};

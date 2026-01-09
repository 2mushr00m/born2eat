import React from "react";

export default function KpiCard({ label, value, sub }) {
  return (
    <div style={styles.card}>
      <div style={styles.label}>{label}</div>
      <div style={styles.value}>{value}</div>
      {sub ? <div style={styles.sub}>{sub}</div> : null}
    </div>
  );
}

const styles = {
  card: {
    background: "#fff",
    borderRadius: 12,
    padding: 14,
    boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
    minWidth: 180,
    flex: "1 1 180px",
  },
  label: { fontSize: 13, color: "#666" },
  value: { fontSize: 24, fontWeight: 800, marginTop: 6 },
  sub: { fontSize: 12, color: "#888", marginTop: 6 },
};

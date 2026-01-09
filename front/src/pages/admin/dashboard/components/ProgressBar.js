import React from "react";

export default function ProgressBar({ value, total }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={styles.wrap}>
      <div style={{ ...styles.bar, width: `${pct}%` }} />
      <div style={styles.text}>{pct}%</div>
    </div>
  );
}

const styles = {
  wrap: {
    position: "relative",
    height: 12,
    background: "#f1f3f5",
    borderRadius: 999,
    overflow: "hidden",
  },
  bar: {
    height: "100%",
    background: "#4c6ef5",
  },
  text: {
    position: "absolute",
    top: -18,
    right: 0,
    fontSize: 11,
    color: "#666",
  },
};

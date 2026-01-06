import api from "./api";

export function apiImageUrl(filePath) {
  if (!filePath) return "";
  const base = (api?.defaults?.baseURL || "").replace(/\/$/, "");
  const p = String(filePath).replace(/^\/+/, "");
  return `${base}/${p}`;
}

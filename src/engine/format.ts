// Number formatting shared by the log and the screen.
export function fmt(n: number): string {
  if (!isFinite(n)) return "∞";
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (a >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (a >= 1e4) return (n / 1e3).toFixed(1) + "k";
  if (a >= 100) return Math.floor(n).toLocaleString("en-US");
  return a >= 10 ? n.toFixed(0) : (Math.round(n * 10) / 10).toString();
}

export const pct = (x: number) => (x * 100).toFixed(x < 0.1 ? 1 : 0) + "%";

export function mmss(s: number): string {
  s = Math.max(0, Math.ceil(s));
  const m = Math.floor(s / 60);
  return m ? `${m}:${String(s % 60).padStart(2, "0")}` : `${s}s`;
}

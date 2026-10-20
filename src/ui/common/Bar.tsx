/** a thin progress bar; `kind` picks the colour */
export function Bar({ value, kind = "", tall, id }: { value: number; kind?: string; tall?: boolean; id?: string }) {
  const w = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className={`bar ${kind} ${tall ? "tall" : ""}`} id={id}>
      <i style={{ width: w + "%" }} />
    </div>
  );
}

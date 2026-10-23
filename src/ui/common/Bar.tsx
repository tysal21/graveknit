/** a thin progress bar; `kind` picks the colour.
 *  With `chip`, a pale strip lingers where the bar just dropped and then drains, so you can see how big each hit was. */
export function Bar({ value, kind = "", tall, id, chip }: { value: number; kind?: string; tall?: boolean; id?: string; chip?: boolean }) {
  const w = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className={`bar ${kind} ${tall ? "tall" : ""}`} id={id}>
      {chip && <b className="chip" style={{ width: w + "%" }} />}
      <i style={{ width: w + "%" }} />
    </div>
  );
}

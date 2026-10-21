import { Component, type ReactNode } from "react";
import { SAVE_KEY } from "../engine/save";

/** what the player sees instead of a black screen if something breaks: the error, and their save to copy */
export function CrashScreen({ error }: { error: unknown }) {
  let raw = "";
  try {
    raw = localStorage.getItem(SAVE_KEY) ?? "";
  } catch {
    /* storage blocked */
  }
  const text = raw ? "GK1:" + btoa(unescape(encodeURIComponent(raw))) : "";
  const msg = error instanceof Error ? `${error.message}\n${(error.stack ?? "").split("\n").slice(0, 4).join("\n")}` : String(error);
  return (
    <div style={{ maxWidth: 640, margin: "40px auto", padding: 16, color: "#ebe3cf", fontFamily: "system-ui, sans-serif" }}>
      <h2 style={{ fontFamily: "Georgia, serif" }}>Something came unstitched</h2>
      <p>The game hit an error while loading. Your save is safe in this browser. Don't clear your browser data.</p>
      <p>Try reloading first. If it keeps happening, copy the error and your save below and send them over.</p>
      <p>
        <button onClick={() => location.replace(location.pathname + "?v=" + Date.now())}>Reload</button>{" "}
        {text && <button onClick={() => navigator.clipboard?.writeText(text)}>Copy my save</button>}
      </p>
      <pre style={{ whiteSpace: "pre-wrap", background: "#15130f", padding: 10, fontSize: 12 }}>{msg}</pre>
      {text && <textarea readOnly value={text} style={{ width: "100%", height: 80, fontSize: 11 }} />}
    </div>
  );
}

/** catches a crash anywhere in the screen and shows CrashScreen instead */
export class CrashGuard extends Component<{ children: ReactNode }, { error: unknown }> {
  state = { error: null as unknown };
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }
  render() {
    return this.state.error ? <CrashScreen error={this.state.error} /> : this.props.children;
  }
}

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./ui/App";
import { CrashGuard, CrashScreen } from "./ui/Crash";
import { boot } from "./ui/runtime";
import "./ui/styles.css";

const root = createRoot(document.getElementById("root")!);
try {
  boot();
  root.render(
    <StrictMode>
      <CrashGuard>
        <App />
      </CrashGuard>
    </StrictMode>,
  );
} catch (e) {
  // a crash while loading the save would otherwise leave a black screen
  root.render(<CrashScreen error={e} />);
}

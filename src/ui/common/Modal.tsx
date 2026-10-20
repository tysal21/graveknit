import type { ReactNode } from "react";
import { closeModal } from "../uiStore";

/** a dialog over a dark backdrop; clicking the backdrop closes it unless `locked` */
export function Modal({ children, locked, className = "" }: { children: ReactNode; locked?: boolean; className?: string }) {
  return (
    <div className="scrim" onClick={(e) => !locked && e.target === e.currentTarget && closeModal()}>
      <div className={`modal ${className}`} role="dialog" aria-modal="true">
        {children}
      </div>
    </div>
  );
}

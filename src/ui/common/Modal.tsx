import type { ReactNode } from "react";
import { closeModal } from "../uiStore";

/** a dialog over a dark backdrop; clicking the backdrop closes it unless `locked` */
export function Modal({ children, locked }: { children: ReactNode; locked?: boolean }) {
  return (
    <div className="scrim" onClick={(e) => !locked && e.target === e.currentTarget && closeModal()}>
      <div className="modal" role="dialog" aria-modal="true">
        {children}
      </div>
    </div>
  );
}

export type SlotId = "skull" | "rib" | "main" | "off" | "core";

export const SLOTS: { id: SlotId; name: string }[] = [
  { id: "skull", name: "Skull" },
  { id: "rib", name: "Ribcage" },
  { id: "main", name: "Main Arm" },
  { id: "off", name: "Off Arm" },
  { id: "core", name: "Soul Core" },
];

export const slotName = (id: SlotId) => SLOTS.find((s) => s.id === id)!.name;

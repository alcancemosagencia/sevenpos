export const escposCommands = {
  drawerKick: "\x1b\x70\x00\x19\xfa",
  cutPaper: "\x1d\x56\x00",
  initialize: "\x1b\x40",
};

export function dispatchDrawerKick(enabled: boolean) {
  if (!enabled || typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("sevenpos:drawer-kick", { detail: escposCommands.drawerKick }));
}

export function dispatchKitchenPrint(payload: unknown) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("sevenpos:kitchen-print", { detail: payload }));
}

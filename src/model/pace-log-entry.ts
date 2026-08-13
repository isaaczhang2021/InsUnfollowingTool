export type PaceLogEntry = {
  readonly kind: "between" | "after_five" | "cooldown";
  readonly afterCount: number;
  readonly waitedMs: number;
};

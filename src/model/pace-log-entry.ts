export type PaceLogEntry = {
  readonly kind: "between" | "after_five";
  readonly afterCount: number;
  readonly waitedMs: number;
};

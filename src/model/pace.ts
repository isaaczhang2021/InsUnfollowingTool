export interface Pace {
  readonly betweenMs: number;
  readonly afterFiveMs: number;
  readonly consecutiveSuccess: number;
  readonly consecutiveFail: number;
}

import { Pace } from "../model/pace";
import {
  AUTO_PACE_START_BETWEEN_MS,
  AUTO_PACE_MIN_BETWEEN_MS,
  AUTO_PACE_START_AFTER_FIVE_MS,
  AUTO_PACE_MIN_AFTER_FIVE_MS,
  AUTO_PACE_SPEEDUP_EVERY_SUCCESS,
  AUTO_PACE_SPEEDUP_FACTOR,
  AUTO_PACE_FAIL_BETWEEN_FACTOR,
  AUTO_PACE_FAIL_AFTER_FIVE_FACTOR,
} from "../constants/constants";

export const createInitialPace = (): Pace => ({
  betweenMs: AUTO_PACE_START_BETWEEN_MS,
  afterFiveMs: AUTO_PACE_START_AFTER_FIVE_MS,
  consecutiveSuccess: 0,
  consecutiveFail: 0,
});

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/**
 * After enough consecutive successes, shrink both delays by SPEEDUP_FACTOR (down to the floor).
 */
export const onPaceSuccess = (pace: Pace): Pace => {
  const consecutiveSuccess = pace.consecutiveSuccess + 1;
  if (consecutiveSuccess < AUTO_PACE_SPEEDUP_EVERY_SUCCESS) {
    return {
      ...pace,
      consecutiveSuccess,
      consecutiveFail: 0,
    };
  }

  return {
    betweenMs: clamp(
      Math.round(pace.betweenMs * AUTO_PACE_SPEEDUP_FACTOR),
      AUTO_PACE_MIN_BETWEEN_MS,
      AUTO_PACE_START_BETWEEN_MS,
    ),
    afterFiveMs: clamp(
      Math.round(pace.afterFiveMs * AUTO_PACE_SPEEDUP_FACTOR),
      AUTO_PACE_MIN_AFTER_FIVE_MS,
      AUTO_PACE_START_AFTER_FIVE_MS,
    ),
    consecutiveSuccess: 0,
    consecutiveFail: 0,
  };
};

/**
 * Any failure slows the pace and resets the success streak.
 */
export const onPaceFailure = (pace: Pace): Pace => ({
  betweenMs: clamp(
    Math.round(pace.betweenMs * AUTO_PACE_FAIL_BETWEEN_FACTOR),
    AUTO_PACE_MIN_BETWEEN_MS,
    Math.round(AUTO_PACE_START_BETWEEN_MS * AUTO_PACE_FAIL_BETWEEN_FACTOR),
  ),
  afterFiveMs: clamp(
    Math.round(pace.afterFiveMs * AUTO_PACE_FAIL_AFTER_FIVE_FACTOR),
    AUTO_PACE_MIN_AFTER_FIVE_MS,
    Math.round(AUTO_PACE_START_AFTER_FIVE_MS * AUTO_PACE_FAIL_AFTER_FIVE_FACTOR),
  ),
  consecutiveSuccess: 0,
  consecutiveFail: pace.consecutiveFail + 1,
});

/**
 * Sleep after an unfollow: jittered between-delay, plus a long pause every 5 unfollows.
 */
export const nextBetweenSleepMs = (pace: Pace): number => {
  const jitterFloor = pace.betweenMs;
  const jitterCeil = pace.betweenMs * 1.2;
  return Math.floor(Math.random() * (jitterCeil - jitterFloor)) + jitterFloor;
};

export const shouldTakeAfterFiveBreak = (completedCount: number): boolean =>
  completedCount > 0 && completedCount % 5 === 0;

export const estimateRemainingMs = (
  remaining: number,
  pace: Pace,
): number => {
  if (remaining <= 0) {
    return 0;
  }
  const betweenTotal = remaining * pace.betweenMs;
  const afterFiveBreaks = Math.floor(remaining / 5);
  return betweenTotal + afterFiveBreaks * pace.afterFiveMs;
};

export const formatDuration = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) {
    return `~${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `~${minutes}m`;
  }
  return `~${totalSeconds}s`;
};

export const formatWaitMs = (ms: number): string => {
  if (ms >= 10000) {
    return `${Math.round(ms / 1000)}s`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
};

/**
 * Clamp a user-edited pace (seconds -> ms) into the allowed auto-queue range.
 */
export const clampPaceFromSeconds = (
  betweenSeconds: number,
  afterFiveSeconds: number,
  base: Pace,
): Pace => ({
  betweenMs: clamp(
    Math.round(betweenSeconds * 1000),
    AUTO_PACE_MIN_BETWEEN_MS,
    Math.round(AUTO_PACE_START_BETWEEN_MS * AUTO_PACE_FAIL_BETWEEN_FACTOR),
  ),
  afterFiveMs: clamp(
    Math.round(afterFiveSeconds * 1000),
    AUTO_PACE_MIN_AFTER_FIVE_MS,
    Math.round(AUTO_PACE_START_AFTER_FIVE_MS * AUTO_PACE_FAIL_AFTER_FIVE_FACTOR),
  ),
  consecutiveSuccess: 0,
  consecutiveFail: base.consecutiveFail,
});

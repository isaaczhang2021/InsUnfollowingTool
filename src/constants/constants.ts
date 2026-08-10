export const INSTAGRAM_HOSTNAME = "www.instagram.com";
export const UNFOLLOWERS_PER_PAGE = 50;
export const WHITELISTED_RESULTS_STORAGE_KEY = "iu_whitelisted-results";
export const TIMINGS_STORAGE_KEY = "iu_timings";
export const PAGE_SIZE_STORAGE_KEY = "iu_page-size";
export const MAX_UNFOLLOWS_PER_RUN_STORAGE_KEY = "iu_max-unfollows-per-run";

// PAGINATION CONSTANTS
export const PAGE_SIZE_CHOICES = [20, 30, 50, 100, 120];
export const MIN_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 200;

// UNFOLLOW BATCH CONSTANTS
// Every run is capped because unfollowing hundreds of accounts at once gets the account rate limited.
export const DEFAULT_MAX_UNFOLLOWS_PER_RUN = 20;
export const MIN_UNFOLLOWS_PER_RUN = 1;
export const MAX_UNFOLLOWS_PER_RUN = 100;

// AUTO-QUEUE ADAPTIVE PACE (more aggressive than default Settings timings)
export const AUTO_PACE_START_BETWEEN_MS = 4000;
export const AUTO_PACE_MIN_BETWEEN_MS = 2000;
export const AUTO_PACE_START_AFTER_FIVE_MS = 60000;
export const AUTO_PACE_MIN_AFTER_FIVE_MS = 30000;
export const AUTO_PACE_SPEEDUP_EVERY_SUCCESS = 25;
export const AUTO_PACE_SPEEDUP_FACTOR = 0.9;
export const AUTO_PACE_FAIL_BETWEEN_FACTOR = 1.5;
export const AUTO_PACE_FAIL_AFTER_FIVE_FACTOR = 2;
export const AUTO_PACE_PAUSE_AFTER_CONSECUTIVE_FAILS = 3;

//TIMINGS CONSTANTS
export const DEFAULT_TIME_BETWEEN_SEARCH_CYCLES = 1000;
export const DEFAULT_TIME_TO_WAIT_AFTER_FIVE_SEARCH_CYCLES = 10000;
export const DEFAULT_TIME_BETWEEN_UNFOLLOWS = 4000;
export const DEFAULT_TIME_TO_WAIT_AFTER_FIVE_UNFOLLOWS = 300000;

// FILTER CONSTANTS
export const WITHOUT_PROFILE_PICTURE_URL_IDS = [
  "44884218_345707102882519_2446069589734326272_n",
  "464760996_1254146839119862_3605321457742435801_n",
];

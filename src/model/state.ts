import { UserNode } from "./user";
import { ScanningTab } from "./scanning-tab";
import { ScanningFilter } from "./scanning-filter";
import { UnfollowLogEntry } from "./unfollow-log-entry";
import { UnfollowFilter } from "./unfollow-filter";
import { Pace } from "./pace";
import { PaceLogEntry } from "./pace-log-entry";

type ScanningState = {
  readonly status: 'scanning';
  readonly page: number;
  readonly currentTab: ScanningTab;
  readonly searchTerm: string;
  readonly percentage: number;
  readonly results: readonly UserNode[];
  readonly whitelistedResults: readonly UserNode[];
  readonly selectedResults: readonly UserNode[];
  readonly filter: ScanningFilter;
};

type UnfollowingState = {
  readonly status: 'unfollowing';
  readonly searchTerm: string;
  readonly percentage: number;
  readonly selectedResults: readonly UserNode[];
  readonly unfollowLog: readonly UnfollowLogEntry[];
  readonly paceLog: readonly PaceLogEntry[];
  readonly filter: UnfollowFilter;
  readonly mode: 'manual' | 'auto_queue';
  readonly paused: boolean;
  readonly pauseKind?: 'manual' | 'cooldown';
  readonly cooldownEndsAt?: number;
  readonly queueTotal: number;
  readonly pace: Pace;
  // Bumped when starting or retrying a queue so the unfollow effect re-runs without leaving "unfollowing".
  readonly queueRunId: number;
};

//TODO THIS TYPE OF MULTIPLE STATE NEEDS TO BE SEPARETED IN DIFFERENT FILES ASAP (Global state,unfollowing state, scanning state etc...)
export type State = { readonly status: 'initial' } | ScanningState | UnfollowingState;

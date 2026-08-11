import React, { useEffect, useState } from "react";
import { getUnfollowLogForDisplay } from "../utils/utils";
import {
  estimateRemainingMs,
  formatDuration,
  formatWaitMs,
} from "../utils/pace-manager";
import {
  AUTO_PACE_MIN_BETWEEN_MS,
  AUTO_PACE_MIN_AFTER_FIVE_MS,
} from "../constants/constants";
import { State } from "../model/state";

interface UnfollowingProps {
  state: State;
  handleUnfollowFilter: (e: React.ChangeEvent<HTMLInputElement>) => void;
  toggleUnfollowingPaused: () => void;
  applyUnfollowingPace: (betweenSeconds: number, afterFiveSeconds: number) => void;
}

export const Unfollowing = ({
  state,
  handleUnfollowFilter,
  toggleUnfollowingPaused,
  applyUnfollowingPace,
}: UnfollowingProps) => {
  const paceBetweenMs = state.status === "unfollowing" ? state.pace.betweenMs : 0;
  const paceAfterFiveMs = state.status === "unfollowing" ? state.pace.afterFiveMs : 0;
  const [betweenDraft, setBetweenDraft] = useState(String(Math.round(paceBetweenMs / 1000) || 4));
  const [afterFiveDraft, setAfterFiveDraft] = useState(
    String(Math.round(paceAfterFiveMs / 1000) || 60),
  );

  useEffect(() => {
    if (state.status !== "unfollowing") {
      return;
    }
    setBetweenDraft(String(Math.round(state.pace.betweenMs / 1000)));
    setAfterFiveDraft(String(Math.round(state.pace.afterFiveMs / 1000)));
  }, [
    state.status === "unfollowing" ? state.pace.betweenMs : 0,
    state.status === "unfollowing" ? state.pace.afterFiveMs : 0,
    state.status,
  ]);

  if (state.status !== "unfollowing") {
    return null;
  }

  const doneCount = state.unfollowLog.length;
  const remaining = Math.max(0, state.queueTotal - doneCount);
  const estimatedRemaining = formatDuration(estimateRemainingMs(remaining, state.pace));
  const isComplete = doneCount === state.selectedResults.length;
  const lastBetween = [...state.paceLog].reverse().find(entry => entry.kind === "between");
  const lastAfterFive = [...state.paceLog].reverse().find(entry => entry.kind === "after_five");

  type TimelineItem =
    | { readonly key: string; readonly kind: "unfollow"; readonly entry: (typeof state.unfollowLog)[number]; readonly index: number }
    | { readonly key: string; readonly kind: "pace"; readonly entry: (typeof state.paceLog)[number] };

  // Rebuild a chronological view: each unfollow, then any waits that followed it.
  const timeline: TimelineItem[] = [];
  let paceCursor = 0;
  state.unfollowLog.forEach((entry, index) => {
    timeline.push({
      key: `unfollow-${entry.user.id}-${index}`,
      kind: "unfollow",
      entry,
      index,
    });
    const afterCount = index + 1;
    while (
      paceCursor < state.paceLog.length
      && state.paceLog[paceCursor].afterCount === afterCount
    ) {
      const paceEntry = state.paceLog[paceCursor];
      timeline.push({
        key: `pace-${paceEntry.kind}-${paceEntry.afterCount}-${paceCursor}`,
        kind: "pace",
        entry: paceEntry,
      });
      paceCursor += 1;
    }
  });

  return (
    <section className="workspace-layout">
      <aside className="app-sidebar">
        <div className="panel-heading">
          <span>Unfollow Queue</span>
          <strong>{state.percentage}%</strong>
        </div>
        <div className="unfollow-progress metric-stack">
          <p>
            <span>Progress</span>
            <strong>
              {doneCount}/{state.queueTotal}
            </strong>
          </p>
          {state.mode === "auto_queue" && (
            <>
              <p>
                <span>Mode</span>
                <strong>Auto queue</strong>
              </p>
              <p>
                <span>Pace</span>
                <strong>
                  {formatWaitMs(state.pace.betweenMs)} / after5{" "}
                  {formatWaitMs(state.pace.afterFiveMs)}
                </strong>
              </p>
              <p>
                <span>Last between</span>
                <strong>{lastBetween ? formatWaitMs(lastBetween.waitedMs) : "—"}</strong>
              </p>
              <p>
                <span>Last after5</span>
                <strong>{lastAfterFive ? formatWaitMs(lastAfterFive.waitedMs) : "—"}</strong>
              </p>
              {!isComplete && (
                <p>
                  <span>Est. left</span>
                  <strong>{estimatedRemaining}</strong>
                </p>
              )}
              {state.paused && (
                <p className="unfollow-paused-banner">
                  <span>Status</span>
                  <strong>Paused</strong>
                </p>
              )}
            </>
          )}
        </div>
        {state.mode === "auto_queue" && !isComplete && (
          <>
            <button
              type="button"
              className="button-control button-pause"
              onClick={toggleUnfollowingPaused}
            >
              {state.paused ? "Resume" : "Pause"}
            </button>
            <div className={`pace-debug ${state.paused ? "" : "pace-debug-locked"}`}>
              <p className="pace-debug-title">Debug pace (pause to edit)</p>
              <label htmlFor="pace-between-input">
                Between (sec)
                <input
                  id="pace-between-input"
                  type="number"
                  min={AUTO_PACE_MIN_BETWEEN_MS / 1000}
                  step="0.5"
                  disabled={!state.paused}
                  value={betweenDraft}
                  onChange={e => setBetweenDraft(e.currentTarget.value)}
                />
              </label>
              <label htmlFor="pace-after5-input">
                After every 5 (sec)
                <input
                  id="pace-after5-input"
                  type="number"
                  min={AUTO_PACE_MIN_AFTER_FIVE_MS / 1000}
                  step="1"
                  disabled={!state.paused}
                  value={afterFiveDraft}
                  onChange={e => setAfterFiveDraft(e.currentTarget.value)}
                />
              </label>
              <button
                type="button"
                className="button-secondary"
                disabled={!state.paused}
                onClick={() => {
                  applyUnfollowingPace(Number(betweenDraft), Number(afterFiveDraft));
                }}
              >
                Apply pace
              </button>
            </div>
          </>
        )}
        <menu className="flex column grow m-clear p-clear">
          <p>Filter</p>
          <label className="badge m-small">
            <input
              type="checkbox"
              name="showSucceeded"
              checked={state.filter.showSucceeded}
              onChange={handleUnfollowFilter}
            />
            &nbsp;Succeeded
          </label>
          <label className="badge m-small">
            <input
              type="checkbox"
              name="showFailed"
              checked={state.filter.showFailed}
              onChange={handleUnfollowFilter}
            />
            &nbsp;Failed
          </label>
        </menu>
      </aside>
      <article className="unfollow-log-container">
        {isComplete && (
          <>
            <hr />
            <div className="fs-large p-medium clr-green">All DONE!</div>
            <hr />
          </>
        )}
        {timeline.map(item => {
          if (item.kind === "pace") {
            if (item.entry.kind === "after_five") {
              return (
                <div className="p-medium pace-log-line" key={item.key}>
                  After-5 break: {formatWaitMs(item.entry.waitedMs)} (at #{item.entry.afterCount})
                </div>
              );
            }
            return (
              <div className="p-medium pace-log-line" key={item.key}>
                Waited {formatWaitMs(item.entry.waitedMs)} before next
              </div>
            );
          }

          const filtered = getUnfollowLogForDisplay([item.entry], state.searchTerm, state.filter);
          if (filtered.length === 0) {
            return null;
          }
          const entry = item.entry;
          return entry.unfollowedSuccessfully ? (
            <div className="p-medium" key={item.key}>
              Unfollowed
              <a
                className="clr-inherit"
                target="_blank"
                href={`../${entry.user.username}`}
                rel="noreferrer"
              >
                &nbsp;{entry.user.username}
              </a>
              <span className="clr-cyan">
                &nbsp; [{item.index + 1}/{state.selectedResults.length}]
              </span>
            </div>
          ) : (
            <div className="p-medium clr-red" key={item.key}>
              Failed to unfollow {entry.user.username} [{item.index + 1}/
              {state.selectedResults.length}]
            </div>
          );
        })}
      </article>
    </section>
  );
};

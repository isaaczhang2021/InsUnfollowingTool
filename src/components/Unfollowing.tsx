import React from "react";
import { getUnfollowLogForDisplay } from "../utils/utils";
import { estimateRemainingMs, formatDuration } from "../utils/pace-manager";
import { State } from "../model/state";

interface UnfollowingProps {
  state: State;
  handleUnfollowFilter: (e: React.ChangeEvent<HTMLInputElement>) => void;
  toggleUnfollowingPaused: () => void;
}

export const Unfollowing = ({
  state,
  handleUnfollowFilter,
  toggleUnfollowingPaused,
}: UnfollowingProps) => {
  if (state.status !== "unfollowing") {
    return null;
  }

  const doneCount = state.unfollowLog.length;
  const remaining = Math.max(0, state.queueTotal - doneCount);
  const estimatedRemaining = formatDuration(estimateRemainingMs(remaining, state.pace));
  const isComplete = doneCount === state.selectedResults.length;

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
                  {Math.round(state.pace.betweenMs / 1000)}s / after5{" "}
                  {Math.round(state.pace.afterFiveMs / 1000)}s
                </strong>
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
          <button
            type="button"
            className="button-control button-pause"
            onClick={toggleUnfollowingPaused}
          >
            {state.paused ? "Resume" : "Pause"}
          </button>
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
        {getUnfollowLogForDisplay(state.unfollowLog, state.searchTerm, state.filter).map(
          (entry, index) =>
            entry.unfollowedSuccessfully ? (
              <div className="p-medium" key={entry.user.id}>
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
                  &nbsp; [{index + 1}/{state.selectedResults.length}]
                </span>
              </div>
            ) : (
              <div className="p-medium clr-red" key={entry.user.id}>
                Failed to unfollow {entry.user.username} [{index + 1}/
                {state.selectedResults.length}]
              </div>
            ),
        )}
      </article>
    </section>
  );
};

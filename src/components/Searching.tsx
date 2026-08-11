import React, { useEffect, useState } from "react";
import {
  assertUnreachable,
  getCurrentPageUnfollowers,
  getMaxPage,
  getUsersForDisplay,
  isWithoutProfilePicture,
  sortUsersByUsername,
} from "../utils/utils";
import { State } from "../model/state";
import { UserNode } from "../model/user";
import {
  WHITELISTED_RESULTS_STORAGE_KEY,
  PAGE_SIZE_CHOICES,
  MIN_UNFOLLOWS_PER_RUN,
  MAX_UNFOLLOWS_PER_RUN,
} from "../constants/constants";


export interface SearchingProps {
  state: State;
  setState: (state: State) => void;
  scanningPaused: boolean;
  pauseScan: () => void;
  handleScanFilter: (e: React.ChangeEvent<HTMLInputElement>) => void;
  toggleUser: (checked: boolean, user: UserNode) => void;
  UserCheckIcon: React.FC;
  UserUncheckIcon: React.FC;
  pageSize: number;
  onPageSizeChange: (pageSize: number) => void;
  maxUnfollowsPerRun: number;
  onMaxUnfollowsPerRunChange: (maxUnfollows: number) => void;
  startUnfollowing: () => void;
  startAutoQueueUnfollowing: () => void;
}

export const Searching = ({
  state,
  setState,
  scanningPaused,
  pauseScan,
  handleScanFilter,
  toggleUser,
  UserCheckIcon,
  UserUncheckIcon,
  pageSize,
  onPageSizeChange,
  maxUnfollowsPerRun,
  onMaxUnfollowsPerRunChange,
  startUnfollowing,
  startAutoQueueUnfollowing,
}: SearchingProps) => {
  // Kept as a draft so clearing the field while typing does not immediately snap back to the minimum.
  const [maxUnfollowsDraft, setMaxUnfollowsDraft] = useState(String(maxUnfollowsPerRun));

  useEffect(() => {
    setMaxUnfollowsDraft(String(maxUnfollowsPerRun));
  }, [maxUnfollowsPerRun]);

  if (state.status !== "scanning") {
    return null;
  }

  const usersForDisplay = getUsersForDisplay(
    state.results,
    state.whitelistedResults,
    state.currentTab,
    state.searchTerm,
    state.filter,
  );
  const autoQueueCandidates = getUsersForDisplay(
    state.results,
    state.whitelistedResults,
    "non_whitelisted",
    state.searchTerm,
    state.filter,
  );
  // A page size typed in the settings menu is not necessarily one of the shortcuts.
  const pageSizeOptions = PAGE_SIZE_CHOICES.includes(pageSize)
    ? PAGE_SIZE_CHOICES
    : [...PAGE_SIZE_CHOICES, pageSize].sort((a, b) => a - b);
  const unfollowCount = Math.min(state.selectedResults.length, maxUnfollowsPerRun);
  const isCapped = state.selectedResults.length > maxUnfollowsPerRun;
  const canStartAutoQueue = state.percentage === 100 && autoQueueCandidates.length > 0;
  let currentLetter = "";

  const onNewLetter = (firstLetter: string) => {
    currentLetter = firstLetter;
    return <div className="alphabet-character">{currentLetter}</div>;
  };

  return (
    <section className="workspace-layout">
      <aside className="app-sidebar">
        <div className="sidebar-content">
          <div className="panel-heading">
            <span>Scanner</span>
            <strong>{state.percentage}%</strong>
          </div>
          <menu className="sidebar-filters-grid">
            <p>Filter</p>
            <label className="badge m-small">
              <input
                type="checkbox"
                name="showNonFollowers"
                checked={state.filter.showNonFollowers}
                onChange={handleScanFilter}
              />
              &nbsp;Non-Followers
            </label>
            <label className="badge m-small">
              <input
                type="checkbox"
                name="showFollowers"
                checked={state.filter.showFollowers}
                onChange={handleScanFilter}
              />
              &nbsp;Followers
            </label>
            <label className="badge m-small">
              <input
                type="checkbox"
                name="showVerified"
                checked={state.filter.showVerified}
                onChange={handleScanFilter}
              />
              &nbsp;Verified
            </label>
            <label className="badge m-small">
              <input
                type="checkbox"
                name="showPrivate"
                checked={state.filter.showPrivate}
                onChange={handleScanFilter}
              />
              &nbsp;Private
            </label>
            <label className="badge m-small">
              <input
                type="checkbox"
                name="showWithOutProfilePicture"
                checked={state.filter.showWithOutProfilePicture}
                onChange={handleScanFilter}
              />
              &nbsp;No Pic
            </label>
          </menu>

          <div className="sidebar-buttons-grid">
            <button
              className="button-secondary"
              onClick={() => {
                const verifiedUsers = usersForDisplay.filter(u => u.is_verified);
                const currentIds = new Set(state.selectedResults.map(u => u.id));
                const toAdd = verifiedUsers.filter(u => !currentIds.has(u.id));
                setState({ ...state, selectedResults: [...state.selectedResults, ...toAdd] });
              }}
            >
              Verified
            </button>
            <button
              className="button-secondary"
              onClick={() => {
                const privateUsers = usersForDisplay.filter(u => u.is_private);
                const currentIds = new Set(state.selectedResults.map(u => u.id));
                const toAdd = privateUsers.filter(u => !currentIds.has(u.id));
                setState({ ...state, selectedResults: [...state.selectedResults, ...toAdd] });
              }}
            >
              Private
            </button>
            <button
              className="button-secondary"
              onClick={() => {
                const noPicUsers = usersForDisplay.filter(u => isWithoutProfilePicture(u));
                const currentIds = new Set(state.selectedResults.map(u => u.id));
                const toAdd = noPicUsers.filter(u => !currentIds.has(u.id));
                setState({ ...state, selectedResults: [...state.selectedResults, ...toAdd] });
              }}
            >
              No Pic
            </button>
            <button
              className="button-secondary danger-text"
              onClick={() => setState({ ...state, selectedResults: [] })}
            >
              Clear
            </button>
            <button
              className="button-secondary whitelist-selected-btn"
              type="button"
              disabled={state.selectedResults.length === 0}
              title={
                state.currentTab === "non_whitelisted"
                  ? "Move checked accounts into the whitelist"
                  : "Remove checked accounts from the whitelist"
              }
              onClick={() => {
                if (state.selectedResults.length === 0) {
                  return;
                }
                const selectedIds = new Set(state.selectedResults.map(u => u.id));
                let whitelistedResults: readonly UserNode[];
                if (state.currentTab === "non_whitelisted") {
                  const existingIds = new Set(state.whitelistedResults.map(u => u.id));
                  const toAdd = state.selectedResults.filter(u => !existingIds.has(u.id));
                  whitelistedResults = [...state.whitelistedResults, ...toAdd];
                } else {
                  whitelistedResults = state.whitelistedResults.filter(u => !selectedIds.has(u.id));
                }
                localStorage.setItem(
                  WHITELISTED_RESULTS_STORAGE_KEY,
                  JSON.stringify(whitelistedResults),
                );
                setState({
                  ...state,
                  whitelistedResults,
                  selectedResults: [],
                });
              }}
            >
              {state.currentTab === "non_whitelisted"
                ? `Whitelist selected (${state.selectedResults.length})`
                : `Remove from whitelist (${state.selectedResults.length})`}
            </button>
          </div>
          <div className="sidebar-stats metric-stack">
            <p><span>Displayed</span><strong>{usersForDisplay.length}</strong></p>
            <p><span>Total scanned</span><strong>{state.results.length}</strong></p>
            <p className="whitelist-counter">
              <span>Whitelisted</span><strong>★ {state.whitelistedResults.length}</strong>
            </p>
          </div>

          {state.percentage === 100 && (
            <div className="sidebar-summary">
              <h4>Scan Summary</h4>
              <div className="summary-grid">
                <div className="summary-item">
                  <span>Non-Followers</span>
                  <strong>{state.results.filter(u => !u.follows_viewer).length}</strong>
                </div>
                <div className="summary-item">
                  <span>Verified</span>
                  <strong>{state.results.filter(u => u.is_verified).length}</strong>
                </div>
                <div className="summary-item">
                  <span>Private</span>
                  <strong>{state.results.filter(u => u.is_private).length}</strong>
                </div>
              </div>
            </div>
          )}
          <div className="sidebar-footer-controls">
            <button
              className="button-control button-pause"
              onClick={pauseScan}
            >
              {scanningPaused ? "Resume" : "Pause"}
            </button>
            <div className="sidebar-pagination">
              <div className="pagination-controls">
                <a
                  onClick={() => {
                    if (state.page - 1 > 0) {
                      setState({
                        ...state,
                        page: state.page - 1,
                      });
                    }
                  }}
                >
                  ❮
                </a>
                <span>
                  {state.page}/{getMaxPage(usersForDisplay, pageSize)}
                </span>
                <a
                  onClick={() => {
                    if (state.page < getMaxPage(usersForDisplay, pageSize)) {
                      setState({
                        ...state,
                        page: state.page + 1,
                      });
                    }
                  }}
                >
                  ❯
                </a>
              </div>
            </div>
          </div>
          <div className="sidebar-page-size">
            <label htmlFor="page-size-select">Per page</label>
            <select
              id="page-size-select"
              title="How many accounts to show on each page"
              value={pageSize}
              onChange={e => onPageSizeChange(Number(e.currentTarget.value))}
            >
              {pageSizeOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="unfollow-cap">
          <label htmlFor="max-unfollows-input">Max unfollow this run</label>
          <input
            id="max-unfollows-input"
            type="number"
            min={MIN_UNFOLLOWS_PER_RUN}
            max={MAX_UNFOLLOWS_PER_RUN}
            value={maxUnfollowsDraft}
            onChange={e => setMaxUnfollowsDraft(e.currentTarget.value)}
            onBlur={e => {
              const rawValue = e.currentTarget.value.trim();
              if (rawValue !== "") {
                onMaxUnfollowsPerRunChange(Number(rawValue));
              }
              setMaxUnfollowsDraft(String(maxUnfollowsPerRun));
            }}
          />
          <button
            type="button"
            className="button-secondary"
            title="Replace the current selection with the first accounts of this filter"
            disabled={state.currentTab !== "non_whitelisted" || usersForDisplay.length === 0}
            onClick={() => {
              setState({
                ...state,
                selectedResults: sortUsersByUsername(usersForDisplay).slice(0, maxUnfollowsPerRun),
              });
            }}
          >
            Select first {maxUnfollowsPerRun}
          </button>
          {isCapped && (
            <span className="unfollow-cap-hint">
              {state.selectedResults.length} selected, only {unfollowCount} will be unfollowed this run.
            </span>
          )}
        </div>
        <button
          className="unfollow"
          onClick={startUnfollowing}
        >
          Unfollow ({unfollowCount})
        </button>
        <button
          className="unfollow-all-matching"
          type="button"
          disabled={!canStartAutoQueue}
          title="Queue every non-whitelisted account that matches the current filters and keep going until done"
          onClick={startAutoQueueUnfollowing}
        >
          Unfollow all matching ({autoQueueCandidates.length})
        </button>
        <span className="unfollow-all-hint">
          Auto queue uses current filters. Pace starts at 4s / after5 1min, then speeds up.
        </span>
      </aside>
      <article className="results-container">
        <nav className="tabs-container">
          <button
            type="button"
            className={`tab ${state.currentTab === "non_whitelisted" ? "tab-active" : ""}`}
            onClick={() => {
              if (state.currentTab === "non_whitelisted") {
                return;
              }
              setState({
                ...state,
                currentTab: "non_whitelisted",
                page: 1,
              });
            }}
          >
            Non-Whitelisted
          </button>
          <button
            type="button"
            className={`tab ${state.currentTab === "whitelisted" ? "tab-active" : ""}`}
            onClick={() => {
              if (state.currentTab === "whitelisted") {
                return;
              }
              setState({
                ...state,
                currentTab: "whitelisted",
                page: 1,
              });
            }}
          >
            Whitelisted
          </button>
        </nav>
        {getCurrentPageUnfollowers(usersForDisplay, state.page, pageSize).map(user => {
          const firstLetter = user.username.substring(0, 1).toUpperCase();
          return (
            <>
              {firstLetter !== currentLetter && onNewLetter(firstLetter)}
              <label className="result-item">
                <div className="flex grow align-center">
                  <div
                    className="avatar-container"
                    onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                      // Prevent selecting result when trying to add to whitelist.
                      e.preventDefault();
                      e.stopPropagation();
                      let whitelistedResults: readonly UserNode[] = [];
                      switch (state.currentTab) {
                        case "non_whitelisted":
                          whitelistedResults = [...state.whitelistedResults, user];
                          break;

                        case "whitelisted":
                          whitelistedResults = state.whitelistedResults.filter(
                            result => result.id !== user.id,
                          );
                          break;

                        default:
                          assertUnreachable(state.currentTab);
                      }
                      localStorage.setItem(
                        WHITELISTED_RESULTS_STORAGE_KEY,
                        JSON.stringify(whitelistedResults),
                      );
                      // Drop the user from the unfollow selection so Unfollow(N) stays accurate.
                      setState({
                        ...state,
                        whitelistedResults,
                        selectedResults: state.selectedResults.filter(result => result.id !== user.id),
                      });
                    }}
                  >
                    <img
                      className="avatar"
                      alt={user.username}
                      src={user.profile_pic_url}
                    />
                    <span className="avatar-icon-overlay-container">
                      {state.currentTab === "non_whitelisted" ? (
                        <UserCheckIcon />
                      ) : (
                        <UserUncheckIcon />
                      )}
                    </span>
                  </div>
                  <div className="flex column m-medium">
                    <a
                      className="fs-xlarge"
                      target="_blank"
                      href={`/${user.username}`}
                      rel="noreferrer"
                    >
                      {user.username}
                    </a>
                    <span className="fs-medium">{user.full_name}</span>
                  </div>
                  {user.is_verified && <div className="verified-badge">✔</div>}
                  {user.is_private && (
                    <div className="flex justify-center w-100">
                      <span className="private-indicator">Private</span>
                    </div>
                  )}
                </div>
                <div className="flex align-center gap-small">
                  <input
                    className="account-checkbox"
                    type="checkbox"
                    checked={state.selectedResults.indexOf(user) !== -1}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => toggleUser(e.currentTarget.checked, user)}
                  />
                </div>
              </label>
            </>
          );
        })}
      </article>
    </section>
  );
};

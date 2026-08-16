import React, { ChangeEvent, useEffect, useState } from "react";
import { render } from "react-dom";
import "./styles.scss";

import { Typename, User, UserNode } from "./model/user";
import { Toast } from "./components/Toast";
import { UserCheckIcon } from "./components/icons/UserCheckIcon";
import { UserUncheckIcon } from "./components/icons/UserUncheckIcon";
import { DEFAULT_TIME_BETWEEN_SEARCH_CYCLES,
  DEFAULT_TIME_BETWEEN_UNFOLLOWS,
  DEFAULT_TIME_TO_WAIT_AFTER_FIVE_SEARCH_CYCLES,
  DEFAULT_TIME_TO_WAIT_AFTER_FIVE_UNFOLLOWS,
  DEFAULT_FAILURE_COOLDOWN_MINUTES,
  INSTAGRAM_HOSTNAME } from "./constants/constants";
import {
  assertUnreachable,
  getCookie,
  getCurrentPageUnfollowers,
  getMaxPage,
  getUsersForDisplay,
  readUnfollowOutcome,
  sleep,
  sleepInterruptible,
  unfollowUserUrlGenerator,
  urlGenerator,
} from "./utils/utils";
import {
  createInitialPace,
  onPaceSuccess,
  onPaceFailure,
  nextBetweenSleepMs,
  shouldTakeAfterFiveBreak,
  clampPaceFromSeconds,
  formatWaitMs,
} from "./utils/pace-manager";
import { Pace } from "./model/pace";
import { PaceLogEntry } from "./model/pace-log-entry";
import { NotSearching } from "./components/NotSearching";
import { State } from "./model/state";
import { Searching } from "./components/Searching";
import { Toolbar } from "./components/Toolbar";
import { Unfollowing } from "./components/Unfollowing";
import { Timings } from "./model/timings";
import {
  loadWhitelist,
  saveWhitelist,
  loadTimings,
  saveTimings,
  loadPageSize,
  savePageSize,
  clampPageSize,
  loadMaxUnfollowsPerRun,
  saveMaxUnfollowsPerRun,
  clampMaxUnfollowsPerRun,
  loadFailureCooldownMinutes,
  saveFailureCooldownMinutes,
  clampFailureCooldownMinutes,
} from "./utils/whitelist-manager";

const LOCAL_PREVIEW_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const isLocalPreview = LOCAL_PREVIEW_HOSTS.has(location.hostname);

const _avatarUrl = (seed: string): string =>
  `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundColor=0f172a,1f2937,312e81&fontFamily=Verdana`;

const _createPreviewUser = (
  id: string,
  username: string,
  fullName: string,
  options: { readonly isPrivate?: boolean; readonly isVerified?: boolean; readonly followsViewer?: boolean } = {},
): UserNode => ({
  id,
  username,
  full_name: fullName,
  profile_pic_url: _avatarUrl(username),
  is_private: options.isPrivate ?? false,
  is_verified: options.isVerified ?? false,
  followed_by_viewer: true,
  follows_viewer: options.followsViewer ?? false,
  requested_by_viewer: false,
  reel: {
    id,
    expiring_at: 0,
    has_pride_media: false,
    latest_reel_media: 0,
    seen: null,
    owner: {
      __typename: Typename.GraphUser,
      id,
      profile_pic_url: _avatarUrl(username),
      username,
    },
  },
});

const _getPreviewUsers = (): readonly UserNode[] => [
  _createPreviewUser("1", "alina.frames", "Alina Moreno", { isVerified: true }),
  _createPreviewUser("2", "brassandbone", "Theo Walsh", { isPrivate: true }),
  _createPreviewUser("3", "citrus.archive", "Mara Kim", { followsViewer: true }),
  _createPreviewUser("4", "dawnledger", "Jon Bell", { isPrivate: true }),
  _createPreviewUser("5", "elias.market", "Elias Noor", { isVerified: true }),
  _createPreviewUser("6", "fieldnotes.studio", "Nadia Reyes"),
  _createPreviewUser("7", "glint.supply", "Remy Park", { followsViewer: true }),
  _createPreviewUser("8", "harbor.sequence", "Ivy Chen", { isPrivate: true }),
  _createPreviewUser("9", "inkline.daily", "Sofia Grant"),
  _createPreviewUser("10", "juniper.signal", "Cal Reed", { isVerified: true }),
  _createPreviewUser("11", "keystone.labs", "Mina Torres"),
  _createPreviewUser("12", "lowlight.club", "Owen Voss", { isPrivate: true }),
];

// pause
let scanningPaused = false;
let unfollowingPaused = false;
// Applied while paused; the auto-queue loop picks this up on Resume.
let pendingPaceOverride: Pace | null = null;
// The unfollow loop captures state once, so it reads the cooldown from here to see later edits.
let failureCooldownMinutes = DEFAULT_FAILURE_COOLDOWN_MINUTES;

function pauseScan() {
  scanningPaused = !scanningPaused;
}


function App() {
  const [state, setState] = useState<State>({
    ...(
      isLocalPreview && new URLSearchParams(location.search).get("preview") === "scanning"
        ? {
          status: "scanning",
          page: 1,
          searchTerm: "",
          currentTab: "non_whitelisted",
          percentage: 100,
          results: _getPreviewUsers(),
          selectedResults: _getPreviewUsers().slice(0, 3),
          whitelistedResults: _getPreviewUsers().slice(10, 12),
          filter: {
            showNonFollowers: true,
            showFollowers: false,
            showVerified: true,
            showPrivate: true,
            showWithOutProfilePicture: true,
          },
        } as State
        : { status: "initial" as const }
    ),
  });

  const [toast, setToast] = useState<{ readonly show: false } | { readonly show: true; readonly text: string }>({
    show: false,
  });

  const [timings, setTimings] = useState<Timings>(() => {
    const storedTimings = loadTimings();
    return storedTimings ?? {
      timeBetweenSearchCycles: DEFAULT_TIME_BETWEEN_SEARCH_CYCLES,
      timeToWaitAfterFiveSearchCycles: DEFAULT_TIME_TO_WAIT_AFTER_FIVE_SEARCH_CYCLES,
      timeBetweenUnfollows: DEFAULT_TIME_BETWEEN_UNFOLLOWS,
      timeToWaitAfterFiveUnfollows: DEFAULT_TIME_TO_WAIT_AFTER_FIVE_UNFOLLOWS,
    };
  });

  const [pageSize, setPageSize] = useState<number>(loadPageSize);
  const [maxUnfollowsPerRun, setMaxUnfollowsPerRun] = useState<number>(loadMaxUnfollowsPerRun);
  const [failureCooldown, setFailureCooldown] = useState<number>(loadFailureCooldownMinutes);

  // Save timings whenever they change
  useEffect(() => {
    saveTimings(timings);
  }, [timings]);

  useEffect(() => {
    savePageSize(pageSize);
  }, [pageSize]);

  useEffect(() => {
    saveMaxUnfollowsPerRun(maxUnfollowsPerRun);
  }, [maxUnfollowsPerRun]);

  useEffect(() => {
    failureCooldownMinutes = failureCooldown;
    saveFailureCooldownMinutes(failureCooldown);
  }, [failureCooldown]);


  let isActiveProcess: boolean;
  switch (state.status) {
    case "initial":
      isActiveProcess = false;
      break;
    case "scanning":
    case "unfollowing":
      isActiveProcess = state.percentage < 100;
      break;
    default:
      assertUnreachable(state);
  }

  const onScan = async () => {
    if (state.status !== "initial") {
      return;
    }
    if (isLocalPreview) {
      const previewUsers = _getPreviewUsers();
      setState({
        status: "scanning",
        page: 1,
        searchTerm: "",
        currentTab: "non_whitelisted",
        percentage: 100,
        results: previewUsers,
        selectedResults: previewUsers.slice(0, 3),
        whitelistedResults: previewUsers.slice(10, 12),
        filter: {
          showNonFollowers: true,
          showFollowers: false,
          showVerified: true,
          showPrivate: true,
          showWithOutProfilePicture: true,
        },
      });
      return;
    }
    const whitelistedResults = loadWhitelist();
    setState({
      status: "scanning",
      page: 1,
      searchTerm: "",
      currentTab: "non_whitelisted",
      percentage: 0,
      results: [],
      selectedResults: [],
      whitelistedResults,
      filter: {
        showNonFollowers: true,
        showFollowers: false,
        showVerified: true,
        showPrivate: true,
        showWithOutProfilePicture: true,
      },
    });
  };

  const handleScanFilter = (e: ChangeEvent<HTMLInputElement>) => {
    if (state.status !== "scanning") {
      return;
    }
    if (state.selectedResults.length > 0) {
      if (!confirm("Changing filter options will clear selected users")) {
        // Force re-render. Bit of a hack but had an issue where the checkbox state was still
        // changing in the UI even even when not confirming. So updating the state fixes this
        // by synchronizing the checkboxes with the filter statuses in the state.
        setState({ ...state });
        return;
      }
    }
    setState({
      ...state,
      // Make sure to clear selected results when changing filter options. This is to avoid having
      // users selected in the unfollow queue but not visible in the UI, which would be confusing.
      selectedResults: [],
      filter: {
        ...state.filter,
        [e.currentTarget.name]: e.currentTarget.checked,
      },
    });
  };

  const handleUnfollowFilter = (e: ChangeEvent<HTMLInputElement>) => {
    if (state.status !== "unfollowing") {
      return;
    }
    setState({
      ...state,
      filter: {
        ...state.filter,
        [e.currentTarget.name]: e.currentTarget.checked,
      },
    });
  };

  const toggleUser = (newStatus: boolean, user: UserNode) => {
    if (state.status !== "scanning") {
      return;
    }
    if (newStatus) {
      setState({
        ...state,
        selectedResults: [...state.selectedResults, user],
      });
    } else {
      setState({
        ...state,
        selectedResults: state.selectedResults.filter(result => result.id !== user.id),
      });
    }
  };

  const toggleAllUsers = (e: ChangeEvent<HTMLInputElement>) => {
    if (state.status !== "scanning") {
      return;
    }
    const displayed = getUsersForDisplay(
      state.results,
      state.whitelistedResults,
      state.currentTab,
      state.searchTerm,
      state.filter,
    );
    if (e.currentTarget.checked) {
      const currentIds = new Set(state.selectedResults.map(u => u.id));
      const toAdd = displayed.filter(u => !currentIds.has(u.id));
      setState({
        ...state,
        selectedResults: [...state.selectedResults, ...toAdd],
      });
    } else {
      const displayedIds = new Set(displayed.map(u => u.id));
      setState({
        ...state,
        selectedResults: state.selectedResults.filter(u => !displayedIds.has(u.id)),
      });
    }
  };

  // it will work the same as toggleAllUsers, but it will select everyone on the current page.
  const toggleCurrentePageUsers = (e: ChangeEvent<HTMLInputElement>) => {
    if (state.status !== "scanning") {
      return;
    }
    const pageUsers = getCurrentPageUnfollowers(
      getUsersForDisplay(
        state.results,
        state.whitelistedResults,
        state.currentTab,
        state.searchTerm,
        state.filter,
      ),
      state.page,
      pageSize,
    );
    if (e.currentTarget.checked) {
      const currentIds = new Set(state.selectedResults.map(u => u.id));
      const toAdd = pageUsers.filter(u => !currentIds.has(u.id));
      setState({
        ...state,
        selectedResults: [...state.selectedResults, ...toAdd],
      });
    } else {
      const pageUserIds = new Set(pageUsers.map(u => u.id));
      setState({
        ...state,
        selectedResults: state.selectedResults.filter(u => !pageUserIds.has(u.id)),
      });
    }
  };

  const onWhitelistUpdate = (updatedWhitelist: readonly UserNode[]) => {
    saveWhitelist(updatedWhitelist);
    if (state.status === "scanning") {
      setState({
        ...state,
        whitelistedResults: updatedWhitelist,
      });
    }
  };

  const onPageSizeChange = (nextPageSize: number) => {
    const validPageSize = clampPageSize(nextPageSize);
    setPageSize(validPageSize);
    if (state.status !== "scanning") {
      return;
    }
    // A bigger page size can leave the user on a page that no longer exists.
    const maxPage = getMaxPage(
      getUsersForDisplay(
        state.results,
        state.whitelistedResults,
        state.currentTab,
        state.searchTerm,
        state.filter,
      ),
      validPageSize,
    );
    if (state.page > maxPage) {
      setState({ ...state, page: maxPage });
    }
  };

  const onMaxUnfollowsPerRunChange = (nextMaxUnfollows: number) => {
    setMaxUnfollowsPerRun(clampMaxUnfollowsPerRun(nextMaxUnfollows));
  };

  const onFailureCooldownMinutesChange = (nextMinutes: number) => {
    setFailureCooldown(clampFailureCooldownMinutes(nextMinutes));
  };

  const startUnfollowing = () => {
    if (state.status !== "scanning") {
      return;
    }
    if (state.selectedResults.length === 0) {
      alert("Must select at least a single user to unfollow");
      return;
    }
    // Only the first `maxUnfollowsPerRun` selected accounts are unfollowed, the rest are left alone.
    const usersToUnfollow = state.selectedResults.slice(0, maxUnfollowsPerRun);
    const skippedCount = state.selectedResults.length - usersToUnfollow.length;
    const confirmMessage = skippedCount > 0
      ? `Unfollow ${usersToUnfollow.length} of the ${state.selectedResults.length} selected accounts?\n`
        + `The remaining ${skippedCount} are skipped because of the "max unfollow this run" limit.\n`
        + "Whitelisted accounts are never unfollowed."
      : `Unfollow ${usersToUnfollow.length} selected accounts?\nWhitelisted accounts are never unfollowed.`;
    if (!confirm(confirmMessage)) {
      return;
    }
    unfollowingPaused = false;
    pendingPaceOverride = null;
    const newState: State = {
      ...state,
      status: "unfollowing",
      percentage: 0,
      selectedResults: usersToUnfollow,
      unfollowLog: [],
      paceLog: [],
      filter: {
        showSucceeded: true,
        showFailed: true,
      },
      mode: "manual",
      paused: false,
      queueTotal: usersToUnfollow.length,
      pace: createInitialPace(),
      queueRunId: 1,
    };
    setState(newState);
  };

  const startAutoQueueUnfollowing = () => {
    if (state.status !== "scanning") {
      return;
    }
    if (state.percentage < 100) {
      alert("Wait until scanning reaches 100% before starting the auto queue.");
      return;
    }
    const queue = getUsersForDisplay(
      state.results,
      state.whitelistedResults,
      "non_whitelisted",
      state.searchTerm,
      state.filter,
    );
    if (queue.length === 0) {
      alert("No non-whitelisted accounts match the current filters.");
      return;
    }
    const confirmMessage =
      `Unfollow all ${queue.length} matching non-whitelisted accounts?\n\n`
      + "This uses the current sidebar filters (e.g. Non-Followers only if that is checked).\n"
      + "Whitelisted accounts are never unfollowed.\n"
      + "Pace starts at ~4s between unfollows and 1 min after every 5, then speeds up gradually.\n"
      + "Keep this tab open and do not let the computer sleep.\n"
      + "Each failed unfollow cools down automatically before continuing.";
    if (!confirm(confirmMessage)) {
      return;
    }
    unfollowingPaused = false;
    pendingPaceOverride = null;
    const newState: State = {
      ...state,
      status: "unfollowing",
      percentage: 0,
      selectedResults: queue,
      unfollowLog: [],
      paceLog: [],
      filter: {
        showSucceeded: true,
        showFailed: true,
      },
      mode: "auto_queue",
      paused: false,
      queueTotal: queue.length,
      pace: createInitialPace(),
      queueRunId: 1,
    };
    setState(newState);
  };

  const retryFailedUnfollowing = () => {
    if (state.status !== "unfollowing") {
      return;
    }
    if (state.unfollowLog.length !== state.queueTotal) {
      alert("Wait until the current queue finishes before retrying failures.");
      return;
    }
    const seenIds = new Set<string>();
    const failedUsers = state.unfollowLog
      .filter(entry => !entry.unfollowedSuccessfully)
      .map(entry => entry.user)
      .filter(user => {
        if (seenIds.has(user.id)) {
          return false;
        }
        seenIds.add(user.id);
        return true;
      });
    if (failedUsers.length === 0) {
      alert("No failed unfollows to retry.");
      return;
    }
    if (!confirm(
      `Retry ${failedUsers.length} failed accounts?\n\n`
      + "Uses the same auto-queue pace and per-failure cooldown.\n"
      + "No new scan is needed. Keep this tab open.",
    )) {
      return;
    }
    unfollowingPaused = false;
    pendingPaceOverride = null;
    setState(prevState => {
      if (prevState.status !== "unfollowing") {
        return prevState;
      }
      return {
        ...prevState,
        selectedResults: failedUsers,
        unfollowLog: [],
        paceLog: [],
        queueTotal: failedUsers.length,
        percentage: 0,
        paused: false,
        pauseKind: undefined,
        cooldownEndsAt: undefined,
        pace: createInitialPace(),
        queueRunId: prevState.queueRunId + 1,
        mode: "auto_queue",
        filter: {
          showSucceeded: true,
          showFailed: true,
        },
      };
    });
  };

  const setUnfollowingPaused = (paused: boolean) => {
    unfollowingPaused = paused;
    setState(prevState => {
      if (prevState.status !== "unfollowing") {
        return prevState;
      }
      // Resuming clears the fail streak so one leftover failure does not instantly re-pause.
      if (!paused && prevState.mode === "auto_queue") {
        return {
          ...prevState,
          paused: false,
          pauseKind: undefined,
          cooldownEndsAt: undefined,
          pace: {
            ...prevState.pace,
            consecutiveFail: 0,
          },
        };
      }
      return { ...prevState, paused, pauseKind: "manual", cooldownEndsAt: undefined };
    });
  };

  const applyFailureCooldown = (minutes: number) => {
    const clamped = clampFailureCooldownMinutes(minutes);
    setFailureCooldown(clamped);
    setToast({
      show: true,
      text: `Failure cooldown set to ${clamped}m. Applies to the next cooldown.`,
    });
  };

  const toggleUnfollowingPaused = () => {
    if (state.status !== "unfollowing") {
      return;
    }
    setUnfollowingPaused(!state.paused);
  };

  const applyUnfollowingPace = (betweenSeconds: number, afterFiveSeconds: number) => {
    if (state.status !== "unfollowing" || state.mode !== "auto_queue") {
      return;
    }
    if (!state.paused) {
      alert("Pause the queue before changing pace.");
      return;
    }
    const nextPace = clampPaceFromSeconds(betweenSeconds, afterFiveSeconds, state.pace);
    pendingPaceOverride = nextPace;
    setState({
      ...state,
      pace: nextPace,
    });
    const clampedFields: string[] = [];
    if (Math.round(betweenSeconds * 1000) !== nextPace.betweenMs) {
      clampedFields.push(`Between from ${betweenSeconds}s`);
    }
    if (Math.round(afterFiveSeconds * 1000) !== nextPace.afterFiveMs) {
      clampedFields.push(`After5 from ${afterFiveSeconds}s`);
    }
    const clampNote = clampedFields.length === 0 ? "" : ` (capped ${clampedFields.join(", ")})`;
    setToast({
      show: true,
      text: `Pace set to ${formatWaitMs(nextPace.betweenMs)} / after5 ${formatWaitMs(nextPace.afterFiveMs)}${clampNote}. Resume to continue.`,
    });
  };

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      // Prompt user if he tries to leave while in the middle of a process (searching / unfollowing / etc..)
      // This is especially good for avoiding accidental tab closing which would result in a frustrating experience.
      if (!isActiveProcess) {
        return;
      }

      // `e` Might be undefined in older browsers, so silence linter for this one.
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      e = e || window.event;

      // `e` Might be undefined in older browsers, so silence linter for this one.
      // For IE and Firefox prior to version 4
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (e) {
        e.returnValue = "Changes you made may not be saved.";
      }

      // For Safari
      return "Changes you made may not be saved.";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isActiveProcess, state]);

  useEffect(() => {
    const scan = async () => {
      if (state.status !== "scanning" || isLocalPreview) {
        return;
      }
      const results = [...state.results];
      let scrollCycle = 0;
      let url = urlGenerator();
      let hasNext = true;
      let currentFollowedUsersCount = 0;
      let totalFollowedUsersCount = -1;

      while (hasNext) {
        let receivedData: User;
        try {
          receivedData = (await fetch(url).then(res => res.json())).data.user.edge_follow;
        } catch (e) {
          console.error(e);
          continue;
        }

        if (totalFollowedUsersCount === -1) {
          totalFollowedUsersCount = receivedData.count;
        }

        hasNext = receivedData.page_info.has_next_page;
        url = urlGenerator(receivedData.page_info.end_cursor);
        currentFollowedUsersCount += receivedData.edges.length;
        receivedData.edges.forEach(x => results.push(x.node));

        setState(prevState => {
          if (prevState.status !== "scanning") {
            return prevState;
          }
          const newState: State = {
            ...prevState,
            // Fix: Changed from Math.floor to Math.round to ensure progress reaches 100%
            // Math.floor would leave progress at 99% when near completion
            percentage: Math.round((currentFollowedUsersCount / totalFollowedUsersCount) * 100),
            results,
          };
          return newState;
        });

        // Pause scanning if user requested so.
        while (scanningPaused) {
          await sleep(1000);
          console.info("Scan paused");
        }

        // Human-like behavior: Micro-pause between fetching chunks
        const microPause = Math.floor(Math.random() * 1500) + 500; // 500ms - 2000ms
        await sleep(microPause);

        // Standard delay between cycles
        await sleep(Math.floor(Math.random() * (timings.timeBetweenSearchCycles - timings.timeBetweenSearchCycles * 0.7)) + timings.timeBetweenSearchCycles);
        
        scrollCycle++;
        if (scrollCycle > 6) {
          scrollCycle = 0;
          // Variable long sleep to avoid patterns
          const longSleepVar = Math.max(
            0,
            timings.timeToWaitAfterFiveSearchCycles + (Math.random() * 10000 - 5000), // +/- 5 seconds
          );
          setToast({ show: true, text: `Sleeping ${Math.round(longSleepVar / 1000)} seconds to prevent getting temp blocked` });
          await sleep(longSleepVar);
        }
        setToast({ show: false });
      }
      setToast({ show: true, text: "Scanning completed!" });
    };
    scan();
    // Dependency array not entirely legit, but works this way. TODO: Find a way to fix.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  useEffect(() => {
    const unfollow = async () => {
      if (state.status !== "unfollowing" || isLocalPreview) {
        return;
      }

      const csrftoken = getCookie("csrftoken");
      if (csrftoken === null) {
        throw new Error("csrftoken cookie is null");
      }

      const isAutoQueue = state.mode === "auto_queue";
      let pace: Pace = state.pace;
      let counter = 0;
      const queue = state.selectedResults;

      const appendPaceLog = (entry: PaceLogEntry) => {
        setState(prevState => {
          if (prevState.status !== "unfollowing") {
            return prevState;
          }
          return {
            ...prevState,
            paceLog: [...prevState.paceLog, entry],
            pace: isAutoQueue ? pace : prevState.pace,
          };
        });
      };

      for (const user of queue) {
        let wasPaused = false;
        while (unfollowingPaused) {
          wasPaused = true;
          await sleep(1000);
        }
        // Apply pace can land while a sleep is still running, so consume the override
        // regardless of whether this iteration actually waited in the pause loop.
        if (isAutoQueue) {
          if (pendingPaceOverride !== null) {
            pace = { ...pendingPaceOverride, consecutiveFail: 0 };
            pendingPaceOverride = null;
          } else if (wasPaused) {
            // Align with Resume clearing the fail streak.
            pace = { ...pace, consecutiveFail: 0 };
          }
        }

        counter += 1;
        const percentage = Math.round((counter / queue.length) * 100);
        let unfollowedSuccessfully = false;

        try {
          const response = await fetch(unfollowUserUrlGenerator(user.id), {
            headers: {
              "content-type": "application/x-www-form-urlencoded",
              "x-csrftoken": csrftoken,
            },
            method: "POST",
            mode: "cors",
            credentials: "include",
          });
          const outcome = await readUnfollowOutcome(response);
          unfollowedSuccessfully = outcome.successful;
          if (!outcome.successful) {
            console.error(`Unfollow failed for ${user.username}: ${outcome.detail}`);
          }
        } catch (e) {
          console.error(e);
          unfollowedSuccessfully = false;
        }

        if (isAutoQueue) {
          pace = unfollowedSuccessfully ? onPaceSuccess(pace) : onPaceFailure(pace);
        }

        const shouldCoolDown = isAutoQueue && !unfollowedSuccessfully;
        const cooldownMs = failureCooldownMinutes * 60 * 1000;

        if (shouldCoolDown) {
          unfollowingPaused = true;
        }

        setState(prevState => {
          if (prevState.status !== "unfollowing") {
            return prevState;
          }
          return {
            ...prevState,
            percentage,
            pace: isAutoQueue ? pace : prevState.pace,
            paused: shouldCoolDown ? true : prevState.paused,
            pauseKind: shouldCoolDown ? "cooldown" : prevState.pauseKind,
            cooldownEndsAt: shouldCoolDown ? Date.now() + cooldownMs : prevState.cooldownEndsAt,
            unfollowLog: [
              ...prevState.unfollowLog,
              {
                user,
                unfollowedSuccessfully,
              },
            ],
          };
        });

        if (shouldCoolDown) {
          setToast({
            show: true,
            text: `Cooling down ${failureCooldownMinutes}m after failure. Auto-resume when done.`,
          });
          // Resume ends the cooldown early by clearing the pause flag.
          const cooledMs = await sleepInterruptible(cooldownMs, () => !unfollowingPaused);
          unfollowingPaused = false;
          pace = { ...pace, consecutiveFail: 0 };
          appendPaceLog({
            kind: "cooldown",
            afterCount: counter,
            waitedMs: cooledMs,
          });
          setState(prevState => {
            if (prevState.status !== "unfollowing") {
              return prevState;
            }
            return {
              ...prevState,
              paused: false,
              pauseKind: undefined,
              cooldownEndsAt: undefined,
            };
          });
        }

        if (user === queue[queue.length - 1]) {
          break;
        }

        if (isAutoQueue) {
          const betweenSleep = nextBetweenSleepMs(pace);
          setToast({
            show: true,
            text: `Waiting ${formatWaitMs(betweenSleep)} · after5 ${formatWaitMs(pace.afterFiveMs)} · ${counter}/${queue.length}`,
          });
          appendPaceLog({
            kind: "between",
            afterCount: counter,
            waitedMs: await sleepInterruptible(betweenSleep, () => unfollowingPaused),
          });
          if (shouldTakeAfterFiveBreak(counter)) {
            const afterFiveSleep = pace.afterFiveMs;
            setToast({
              show: true,
              text: `After-5 break ${formatWaitMs(afterFiveSleep)} (at #${counter}/${queue.length})`,
            });
            appendPaceLog({
              kind: "after_five",
              afterCount: counter,
              waitedMs: await sleepInterruptible(afterFiveSleep, () => unfollowingPaused),
            });
          }
        } else {
          const betweenSleep =
            Math.floor(
              Math.random() * (timings.timeBetweenUnfollows * 1.2 - timings.timeBetweenUnfollows),
            ) + timings.timeBetweenUnfollows;
          appendPaceLog({
            kind: "between",
            afterCount: counter,
            waitedMs: betweenSleep,
          });
          await sleep(betweenSleep);
          if (counter % 5 === 0) {
            const afterFiveSleep = timings.timeToWaitAfterFiveUnfollows;
            appendPaceLog({
              kind: "after_five",
              afterCount: counter,
              waitedMs: afterFiveSleep,
            });
            setToast({
              show: true,
              text: `Sleeping ${afterFiveSleep / 60000} minutes to prevent getting temp blocked`,
            });
            await sleep(afterFiveSleep);
          }
        }
        setToast({ show: false });
      }
    };
    unfollow();
    // Dependency array not entirely legit, but works this way. TODO: Find a way to fix.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, state.status === "unfollowing" ? state.queueRunId : 0]);

  let markup: React.JSX.Element;
  switch (state.status) {
    case "initial":
      markup = <NotSearching onScan={onScan}></NotSearching>;
      break;

    case "scanning": {
      markup = <Searching
        state={state}
        handleScanFilter={handleScanFilter}
        toggleUser={toggleUser}
        pauseScan={pauseScan}
        setState={setState}
        scanningPaused={scanningPaused}
        UserCheckIcon={UserCheckIcon}
        UserUncheckIcon={UserUncheckIcon}
        pageSize={pageSize}
        onPageSizeChange={onPageSizeChange}
        maxUnfollowsPerRun={maxUnfollowsPerRun}
        onMaxUnfollowsPerRunChange={onMaxUnfollowsPerRunChange}
        startUnfollowing={startUnfollowing}
        startAutoQueueUnfollowing={startAutoQueueUnfollowing}
      ></Searching>;
      break;
    }

    case "unfollowing":
      markup = <Unfollowing
        state={state}
        handleUnfollowFilter={handleUnfollowFilter}
        toggleUnfollowingPaused={toggleUnfollowingPaused}
        applyUnfollowingPace={applyUnfollowingPace}
        failureCooldownMinutes={failureCooldown}
        applyFailureCooldown={applyFailureCooldown}
        retryFailedUnfollowing={retryFailedUnfollowing}
      ></Unfollowing>;
      break;

    default:
      assertUnreachable(state);
  }

  return (
    <main id="main" role="main" className="iu">
      <section className="overlay">
        <Toolbar
          state={state}
          setState={setState}
          isActiveProcess={isActiveProcess}
          toggleAllUsers={toggleAllUsers}
          toggleCurrentePageUsers={toggleCurrentePageUsers}
          setTimings={setTimings}
          currentTimings={timings}
          whitelistedUsers={state.status === "scanning" ? state.whitelistedResults : loadWhitelist()}
          onWhitelistUpdate={onWhitelistUpdate}
          pageSize={pageSize}
          onPageSizeChange={onPageSizeChange}
          maxUnfollowsPerRun={maxUnfollowsPerRun}
          onMaxUnfollowsPerRunChange={onMaxUnfollowsPerRunChange}
          failureCooldownMinutes={failureCooldown}
          onFailureCooldownMinutesChange={onFailureCooldownMinutesChange}
        ></Toolbar>

        {markup}

        {toast.show && <Toast show={toast.show} message={toast.text} onClose={() => setToast({ show: false })} />}
      </section>
    </main>
  );
}

if (location.hostname !== INSTAGRAM_HOSTNAME && !isLocalPreview) {
  alert("Can be used only on Instagram routes");
} else {
  document.title = "InstagramUnfollowers";
  document.body.innerHTML = "";
  render(<App />, document.body);
}

"use client";

import { useEffect, useState } from "react";

const KEY = "rave_ai_demo_tour_seen";

/** True only for a visitor's first time on this page in this browser — drives
 * the one-time onboarding cue so it never nags a returning visitor. */
export function useFirstVisit(): [boolean, () => void] {
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading a one-time flag from storage, not derived render state
      setIsFirstVisit(window.localStorage.getItem(KEY) !== "1");
    } catch {
      // localStorage unavailable (private mode etc.) — default to not showing the cue
    }
  }, []);

  const markSeen = () => {
    setIsFirstVisit(false);
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      // non-critical
    }
  };

  return [isFirstVisit, markSeen];
}

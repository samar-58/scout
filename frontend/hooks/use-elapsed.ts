"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Wall-clock elapsed time for the active run. Starts on the rising edge of
 * `isRunning`, freezes on the falling edge so the final duration stays visible,
 * and resets when a new run begins. Ticks once a second — a spinning
 * millisecond counter would add anxiety, not information.
 */
export function useElapsed(isRunning: boolean): number {
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!isRunning) {
      startedAt.current = undefined;
      return;
    }

    startedAt.current = Date.now();
    setElapsed(0);

    const interval = setInterval(() => {
      if (startedAt.current !== undefined) {
        setElapsed(Date.now() - startedAt.current);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  return elapsed;
}

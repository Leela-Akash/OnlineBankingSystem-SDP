import { useEffect, useRef } from 'react';

/**
 * Custom hook that runs a callback periodically, automatically pausing
 * when the browser tab is hidden and immediately triggering on refocus.
 *
 * @param {Function} callback Function to execute
 * @param {number} intervalMs Polling interval in ms (default 45000ms)
 * @param {boolean} enabled Whether polling is active
 */
export function useVisibilityPolling(callback, intervalMs = 45000, enabled = true) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    let timerId = null;

    const tick = () => {
      if (document.visibilityState === 'visible') {
        savedCallback.current();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Immediate refresh when tab becomes visible again
        savedCallback.current();
        clearInterval(timerId);
        timerId = setInterval(tick, intervalMs);
      } else {
        clearInterval(timerId);
      }
    };

    // Initial timer setup
    timerId = setInterval(tick, intervalMs);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(timerId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [intervalMs, enabled]);
}

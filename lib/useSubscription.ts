"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getLocalSubscriptionStatus,
  SubscriptionStatus,
  calculateTimeLeft,
} from "./subscription";

export function useSubscription(): SubscriptionStatus & { refresh: () => void } {
  const [status, setStatus] = useState<SubscriptionStatus>(() => getLocalSubscriptionStatus());

  const refresh = useCallback(() => {
    setStatus(getLocalSubscriptionStatus());
  }, []);

  useEffect(() => {
    // Initial fetch
    refresh();

    // Timer tick every 1 second
    const interval = setInterval(() => {
      setStatus((prev) => {
        const current = getLocalSubscriptionStatus();
        const targetTimestamp = current.isPaid && current.paidExpiresAt 
          ? current.paidExpiresAt 
          : current.trialExpiresAt;
        
        return {
          ...current,
          timeLeft: calculateTimeLeft(targetTimestamp),
        };
      });
    }, 1000);

    const handleUpdate = () => {
      refresh();
    };

    window.addEventListener("subscription_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener("subscription_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [refresh]);

  return {
    ...status,
    refresh,
  };
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ViewId } from "../types";

/**
 * Owns the active view, the brief inter-view loading flash, and scroll handling.
 */
export function useViewNavigation() {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const viewLoadingTimerRef = useRef<number | null>(null);
  const [activeView, setActiveView] = useState<ViewId>("home");
  const [viewLoading, setViewLoading] = useState(false);

  const changeView = useCallback((view: ViewId) => {
    setViewLoading(true);
    setActiveView(view);

    if (viewLoadingTimerRef.current) {
      window.clearTimeout(viewLoadingTimerRef.current);
    }
    viewLoadingTimerRef.current = window.setTimeout(() => {
      setViewLoading(false);
      viewLoadingTimerRef.current = null;
    }, 260);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [activeView]);

  useEffect(() => {
    return () => {
      if (viewLoadingTimerRef.current) {
        window.clearTimeout(viewLoadingTimerRef.current);
      }
    };
  }, []);

  return { activeView, viewLoading, changeView, scrollRef };
}

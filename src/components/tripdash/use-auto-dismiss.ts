"use client";
import { useEffect, useRef } from "react";

export const NOTICE_MS = 4000;

export function useAutoDismiss(value: string, clear: () => void, ms = NOTICE_MS) {
  const clearRef = useRef(clear);
  useEffect(() => { clearRef.current = clear; });
  useEffect(() => {
    if (!value) return;
    const timer = setTimeout(() => clearRef.current(), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
}

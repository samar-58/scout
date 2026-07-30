"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { initialFormState } from "@/lib/startup-form";
import type { StartupFormState } from "@/lib/types";

const STORAGE_KEY = "scout:composer-draft:v1";
const WRITE_DEBOUNCE_MS = 400;

function isFormState(value: unknown): value is Partial<StartupFormState> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Keeps the composer draft in localStorage.
 *
 * Runs are not persisted, so losing a run already costs the founder the report.
 * Losing the fourteen fields they typed on top of that is avoidable. Only the
 * draft is stored — never results — and reads happen after mount so server and
 * client markup match.
 */
export function useComposerDraft() {
  const [form, setForm] = useState<StartupFormState>(initialFormState);
  const [draftRestored, setDraftRestored] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    hydrated.current = true;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const parsed: unknown = JSON.parse(stored);
      if (!isFormState(parsed)) return;

      // Merge over the initial state so an older draft shape cannot introduce
      // undefined values into controlled inputs.
      const merged = { ...initialFormState } as StartupFormState;
      for (const key of Object.keys(initialFormState) as (keyof StartupFormState)[]) {
        const value = parsed[key];
        if (typeof value === "string") merged[key] = value;
      }
      setForm(merged);
      setDraftRestored(merged.idea.trim().length > 0);
    } catch {
      // A corrupt or blocked store must never break the composer.
    }
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    const timer = setTimeout(() => {
      try {
        const hasContent = Object.values(form).some(
          (value) => value.trim().length > 0,
        );
        if (hasContent) {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
        } else {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        // Private mode or a full quota — persistence is best-effort.
      }
    }, WRITE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [form]);

  const update = useCallback(
    <K extends keyof StartupFormState>(field: K, value: StartupFormState[K]) => {
      setDraftRestored(false);
      setForm((current) => ({ ...current, [field]: value }));
    },
    [],
  );

  const clearDraft = useCallback(() => {
    setDraftRestored(false);
    setForm(initialFormState);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore — the in-memory reset already happened.
    }
  }, []);

  const dismissRestoredNotice = useCallback(() => setDraftRestored(false), []);

  return { form, update, clearDraft, draftRestored, dismissRestoredNotice };
}

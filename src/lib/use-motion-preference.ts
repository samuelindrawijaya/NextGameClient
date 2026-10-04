"use client";

import { useSyncExternalStore } from "react";
import { useReducedMotion } from "framer-motion";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function useMotionPreference() {
  // Match server markup during hydration before applying the device preference.
  const hydrated = useSyncExternalStore(
    subscribe,
    clientSnapshot,
    serverSnapshot,
  );
  const reduced = useReducedMotion();
  return hydrated && Boolean(reduced);
}

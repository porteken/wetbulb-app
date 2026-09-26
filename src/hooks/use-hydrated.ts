"use client";

import { useSyncExternalStore } from "react";

function unsubscribe() {
  return;
}

const subscribe = () => unsubscribe;
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export const useHydrated = (): boolean =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

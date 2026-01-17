'use client';

import { useSyncExternalStore } from 'react';

type Subscriber = () => void;

const listeners = new Set<Subscriber>();
let currentTerm = '';

export const transcriptSearchStore = {
  get: () => currentTerm,
  set: (term: string) => {
    currentTerm = term;
    listeners.forEach((listener) => listener());
  },
  subscribe: (listener: Subscriber) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useTranscriptSearchTerm() {
  return useSyncExternalStore(
    transcriptSearchStore.subscribe,
    transcriptSearchStore.get,
    transcriptSearchStore.get,
  );
}

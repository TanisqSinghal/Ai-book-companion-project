'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const subscribeToReducedMotion = (onChange: () => void) => {
    const query = window.matchMedia(REDUCED_MOTION_QUERY);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
};

// False on the server, so hydration matches; the real value applies right after
export function usePrefersReducedMotion() {
    return useSyncExternalStore(
        subscribeToReducedMotion,
        () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
        () => false,
    );
}

interface TypewriterOptions {
    typeMs?: number;
    deleteMs?: number;
    holdMs?: number;
}

// Types a phrase, holds it, deletes it, then moves on to the next one (loops forever).
// `phrases` must be a stable array (e.g. a module-level constant).
export function useTypewriter(phrases: string[], { typeMs = 45, deleteMs = 22, holdMs = 2400 }: TypewriterOptions = {}) {
    const reducedMotion = usePrefersReducedMotion();
    const [index, setIndex] = useState(0);
    const [length, setLength] = useState(0);
    const [deleting, setDeleting] = useState(false);

    const phrase = phrases[index];

    useEffect(() => {
        if (reducedMotion) return;

        const isFullyTyped = !deleting && length === phrase.length;
        const delay = isFullyTyped ? holdMs : deleting ? deleteMs : typeMs;

        const timeout = window.setTimeout(() => {
            if (isFullyTyped) {
                setDeleting(true);
            } else if (deleting && length === 0) {
                setDeleting(false);
                setIndex((current) => (current + 1) % phrases.length);
            } else {
                setLength((current) => current + (deleting ? -1 : 1));
            }
        }, delay);

        return () => window.clearTimeout(timeout);
    }, [reducedMotion, phrases.length, phrase.length, length, deleting, typeMs, deleteMs, holdMs]);

    return reducedMotion ? phrases[0] : phrase.slice(0, length);
}

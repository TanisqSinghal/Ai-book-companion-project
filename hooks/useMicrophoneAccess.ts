'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

export type MicProblem = 'insecure' | 'blocked' | 'dismissed' | 'not-found' | 'in-use' | 'unknown';

export const MIC_PROBLEM_TEXT: Record<MicProblem, { title: string; caption: string; steps: string[] }> = {
    blocked: {
        title: 'Your microphone is blocked',
        caption: "I can't hear you yet: your microphone is blocked. See below how to allow it.",
        steps: [
            'Click the lock or settings icon at the left of the address bar.',
            'Set Microphone to Allow.',
            'Tap the mic button again. If it still fails, reload the page.',
            "On a phone, also check that your browser may use the microphone in your phone's Settings.",
        ],
    },
    dismissed: {
        title: 'Microphone permission needed',
        caption: 'I need your microphone to talk. Tap the mic and choose Allow.',
        steps: ['Tap the mic button again and choose Allow when your browser asks.'],
    },
    'not-found': {
        title: 'No microphone found',
        caption: "I can't find a microphone on this device.",
        steps: ['Connect a microphone or headset, then tap the mic button again.'],
    },
    'in-use': {
        title: 'Your microphone is busy',
        caption: 'Another app is using your microphone right now.',
        steps: ['Close other apps or tabs using the microphone (such as Zoom, Meet or Teams), then tap the mic again.'],
    },
    insecure: {
        title: 'Voice chat needs a secure connection',
        caption: 'Voice chat only works over a secure connection.',
        steps: ['Open this site with an https:// address (or on localhost), then try again.'],
    },
    unknown: {
        title: "Couldn't use your microphone",
        caption: "Something stopped your microphone from starting.",
        steps: ['Check your microphone and browser settings, then tap the mic button again.'],
    },
};

// Microphone access only exists on https pages (and localhost)
const isMicSupported = () => window.isSecureContext && Boolean(navigator.mediaDevices?.getUserMedia);
const subscribeToNothing = () => () => {};

// Browsers without the Permissions API (or without 'microphone' in it) report 'unknown'
const queryMicPermission = async (): Promise<PermissionStatus | null> => {
    try {
        return await navigator.permissions.query({ name: 'microphone' as PermissionName });
    } catch {
        return null;
    }
};

const problemFromError = async (error: unknown): Promise<MicProblem> => {
    const name = error instanceof DOMException ? error.name : '';

    if (name === 'NotAllowedError' || name === 'SecurityError') {
        // Closing the prompt also rejects with NotAllowedError, but leaves the permission at 'prompt'
        const permission = await queryMicPermission();
        return permission?.state === 'prompt' ? 'dismissed' : 'blocked';
    }
    if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'not-found';
    if (name === 'NotReadableError' || name === 'AbortError') return 'in-use';
    return 'unknown';
};

// Makes sure the microphone works before a voice session is started (and counted against the plan),
// and notices a blocked microphone as soon as the page loads.
export function useMicrophoneAccess() {
    const [problem, setProblem] = useState<MicProblem | null>(null);
    // Fixed for the page's lifetime; the server can't know it, so it assumes a secure page
    const micSupported = useSyncExternalStore(subscribeToNothing, isMicSupported, () => true);

    useEffect(() => {
        // Browsers report the microphone as 'denied' on plain-http pages, which would read as "blocked"
        if (!micSupported) return;

        let permission: PermissionStatus | null = null;
        let cancelled = false;

        const sync = () => {
            if (!permission) return;
            if (permission.state === 'denied') {
                setProblem('blocked');
            } else {
                // Allowed again in the site settings: drop the permission warning without a reload
                setProblem((current) => (current === 'blocked' || current === 'dismissed' ? null : current));
            }
        };

        queryMicPermission().then((status) => {
            if (cancelled || !status) return;
            permission = status;
            sync();
            permission.addEventListener('change', sync);
        });

        return () => {
            cancelled = true;
            permission?.removeEventListener('change', sync);
        };
    }, [micSupported]);

    // Asks for the microphone (showing the browser prompt if needed) and releases it straight away
    const ensureAccess = useCallback(async (): Promise<boolean> => {
        if (!isMicSupported()) return false;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach((track) => track.stop());
            setProblem(null);
            return true;
        } catch (error) {
            console.warn('Microphone check failed:', error);
            setProblem(await problemFromError(error));
            return false;
        }
    }, []);

    return { problem: micSupported ? problem : 'insecure', ensureAccess };
}

export default useMicrophoneAccess;

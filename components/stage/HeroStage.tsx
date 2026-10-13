'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

import type { CallStatus } from '@/hooks/useVapi';

// WebGL only exists in the browser, so the 3D stage is never server-rendered
const ConversationStage = dynamic(() => import('@/components/stage/ConversationStage'), {
    ssr: false,
    loading: () => <p className="stage-fallback">Setting the stage…</p>,
});

interface DemoBeat {
    status: CallStatus;
    speaker: 'ai' | 'user';
    caption: string;
    durationMs: number;
}

// A short scripted exchange so visitors see the conversation before starting one
const DEMO_BEATS: DemoBeat[] = [
    { status: 'speaking', speaker: 'ai', caption: 'Chapter three is where it gets interesting. Want the short version?', durationMs: 4200 },
    { status: 'listening', speaker: 'user', caption: 'Yes, and why does the author keep coming back to it?', durationMs: 3600 },
    { status: 'thinking', speaker: 'ai', caption: 'Thinking…', durationMs: 1500 },
    { status: 'speaking', speaker: 'ai', caption: 'Because it sets up everything that follows. Here is how.', durationMs: 4000 },
    { status: 'listening', speaker: 'user', caption: 'That makes sense. What should I read next?', durationMs: 3400 },
    { status: 'thinking', speaker: 'ai', caption: 'Thinking…', durationMs: 1500 },
];
const LEVEL_INTERVAL_MS = 60;

const HeroStage = () => {
    const [beatIndex, setBeatIndex] = useState(0);
    const aiLevel = useRef(0);
    const userLevel = useRef(0);

    const beat = DEMO_BEATS[beatIndex];

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            setBeatIndex((index) => (index + 1) % DEMO_BEATS.length);
        }, beat.durationMs);

        return () => window.clearTimeout(timeout);
    }, [beat]);

    // Fake a speech-like loudness curve for whoever holds the floor
    useEffect(() => {
        const interval = window.setInterval(() => {
            const t = performance.now() / 1000;
            const syllables = Math.abs(Math.sin(t * 9)) * Math.abs(Math.sin(t * 2.3 + 1));
            const loudness = 0.25 + syllables * 0.7;
            aiLevel.current = loudness;
            userLevel.current = loudness;
        }, LEVEL_INTERVAL_MS);

        return () => window.clearInterval(interval);
    }, []);

    return (
        <div className="hero3d-scene" aria-hidden="true">
            <div className="stage-canvas">
                <ConversationStage
                    status={beat.status}
                    aiLevel={aiLevel}
                    userLevel={userLevel}
                    userSpeaking={beat.status === 'listening'}
                    coverURL="/assets/book-cover.svg"
                />
            </div>
            <div className="hero3d-scene-fade" />
            <p className={`hero3d-caption ${beat.speaker === 'ai' ? 'hero3d-caption-ai' : 'hero3d-caption-user'}`}>
                {beat.caption}
            </p>
        </div>
    );
};

export default HeroStage;

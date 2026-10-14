'use client';

import { useEffect, useState } from 'react';

import { usePrefersReducedMotion } from '@/hooks/useTypewriter';

const STEPS = [
    { title: 'Upload PDF', description: 'Add your book file' },
    { title: 'AI Processing', description: 'We analyze the content' },
    { title: 'Voice Chat', description: 'Discuss with AI' },
];

const START_DELAY_MS = 600;
const CHAR_MS = 38;
// Extra ticks between steps, so each card lands before the next starts typing
const PAUSE_TICKS = 10;

// Where each step starts on the shared typing timeline
const STEP_OFFSETS = STEPS.reduce<number[]>((offsets, step, index) => {
    const previous = index === 0 ? 0 : offsets[index - 1] + STEPS[index - 1].title.length + STEPS[index - 1].description.length + PAUSE_TICKS;
    return [...offsets, previous];
}, []);
const TOTAL_TICKS = STEP_OFFSETS[STEPS.length - 1] + STEPS[STEPS.length - 1].title.length + STEPS[STEPS.length - 1].description.length;

const clamp = (value: number, max: number) => Math.min(Math.max(value, 0), max);

// Full text holds the space (invisible) while the typed part is drawn on top, so nothing shifts
const TypedText = ({ text, shown, showCaret, className = '' }: { text: string; shown: number; showCaret: boolean; className?: string }) => (
    <span className="relative inline-block">
        <span className="invisible">{text}</span>
        <span className={`absolute inset-0 whitespace-nowrap ${className}`} aria-hidden="true">
            {text.slice(0, shown)}
            {showCaret && <span className="type-caret" />}
        </span>
    </span>
);

// Reveals the how-it-works steps one by one with a typing effect
const HeroSteps = () => {
    const reducedMotion = usePrefersReducedMotion();
    const [tick, setTick] = useState(0);

    useEffect(() => {
        if (reducedMotion || tick >= TOTAL_TICKS) return;

        const timeout = window.setTimeout(() => setTick((current) => current + 1), tick === 0 ? START_DELAY_MS : CHAR_MS);
        return () => window.clearTimeout(timeout);
    }, [reducedMotion, tick]);

    const typed = reducedMotion ? TOTAL_TICKS : tick;

    return (
        <ol className="hero3d-steps">
            {STEPS.map((step, index) => {
                const local = typed - STEP_OFFSETS[index];
                const titleShown = clamp(local, step.title.length);
                const descriptionShown = clamp(local - step.title.length, step.description.length);
                const isDone = descriptionShown === step.description.length;
                const isVisible = local > 0 || isDone;
                const isActive = isVisible && !isDone;

                return (
                    <li
                        key={step.title}
                        className={`hero3d-step ${isVisible ? 'hero3d-step-visible' : 'hero3d-step-hidden'} ${isActive ? 'hero3d-step-active' : ''}`}
                    >
                        <span className="hero3d-step-number">{index + 1}</span>
                        <div className="flex flex-col">
                            <span className="sr-only">{`${step.title}: ${step.description}`}</span>
                            <h3 className="hero3d-step-title" aria-hidden="true">
                                <TypedText
                                    text={step.title}
                                    shown={titleShown}
                                    showCaret={isActive && titleShown < step.title.length}
                                    className="hero3d-shine"
                                />
                            </h3>
                            <p className="hero3d-step-description" aria-hidden="true">
                                <TypedText text={step.description} shown={descriptionShown} showCaret={isActive && titleShown === step.title.length} />
                            </p>
                        </div>
                    </li>
                );
            })}
        </ol>
    );
};

export default HeroSteps;

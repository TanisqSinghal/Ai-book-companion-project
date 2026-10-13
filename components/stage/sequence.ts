import type { RefObject } from 'react';

// Clock time at which the current entrance sequence began (null until the first frame)
export type SequenceRef = RefObject<number | null>;

// Smoothed loudness of each speaker, shared by everything that reacts to sound
export type EnergyRef = RefObject<{ ai: number; user: number }>;

// Entrance timeline, in seconds: the pedestals light up one by one, then the robot boots
export const RING_ON_AT = 0.5;
export const RING_STAGGER = 0.4;
export const POWER_ON_AT = 1.7;
export const FLICKER_LENGTH = 0.65;
// The camera glides for this long before it starts following the speakers
export const ENTRANCE_LENGTH = 3.2;

export const sequenceTime = (sequence: SequenceRef, now: number) =>
    sequence.current === null ? 0 : now - sequence.current;

// 0 before `onAt`, a stuttering light while it catches, then a steady 1
export const flicker = (since: number, onAt: number) => {
    if (since < onAt) return 0;
    if (since > onAt + FLICKER_LENGTH) return 1;
    return Math.sin(since * 83) + Math.sin(since * 47) > 0.1 ? 1 : 0.12;
};

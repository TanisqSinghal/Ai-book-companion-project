'use client';

import { useEffect, useRef } from 'react';

const FFT_SIZE = 512;
const LEVEL_GAIN = 4;

// Live microphone loudness (0-1) in a ref, so the 3D scene can read it every frame without re-rendering.
export function useMicLevel(active: boolean) {
    const level = useRef(0);

    useEffect(() => {
        if (!active) return;

        let cancelled = false;
        let frame = 0;
        let stream: MediaStream | null = null;
        let context: AudioContext | null = null;

        const listen = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                if (cancelled) {
                    stream.getTracks().forEach((track) => track.stop());
                    return;
                }

                context = new AudioContext();
                const analyser = context.createAnalyser();
                analyser.fftSize = FFT_SIZE;
                context.createMediaStreamSource(stream).connect(analyser);

                const samples = new Uint8Array(analyser.fftSize);
                const tick = () => {
                    analyser.getByteTimeDomainData(samples);
                    let sum = 0;
                    for (let i = 0; i < samples.length; i++) {
                        const value = (samples[i] - 128) / 128;
                        sum += value * value;
                    }
                    level.current = Math.min(1, Math.sqrt(sum / samples.length) * LEVEL_GAIN);
                    frame = requestAnimationFrame(tick);
                };
                tick();
            } catch {
                // No mic access: the avatar falls back to transcript-driven animation
            }
        };

        listen();

        return () => {
            cancelled = true;
            cancelAnimationFrame(frame);
            stream?.getTracks().forEach((track) => track.stop());
            context?.close().catch(() => {});
            level.current = 0;
        };
    }, [active]);

    return level;
}

export default useMicLevel;

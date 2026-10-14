'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Vapi from '@vapi-ai/web';
import { useAuth } from '@clerk/nextjs';

import { ASSISTANT_ID, DEFAULT_VOICE, HINGLISH_ASSISTANT_ID, VOICE_SETTINGS } from '@/lib/constants';
import { getHinglishVoice, getVoice } from '@/lib/utils';
import { IBook, Messages } from '@/types';
import { startVoiceSession, endVoiceSession, saveSessionMessage } from '@/lib/actions/session.actions';
import { useSubscriptionPlan } from '@/hooks/useSubscriptionPlan';

export function useLatestRef<T>(value: T) {
    const ref = useRef(value);

    useEffect(() => {
        ref.current = value;
    }, [value]);

    return ref;
}

const TIMER_INTERVAL_MS = 1000;
const SECONDS_PER_MINUTE = 60;

export type VapiLanguage = 'english' | 'hinglish';

// Each language uses its own Vapi account (public key + assistant must belong to the same org)
const VAPI_CONFIGS: Record<VapiLanguage, { apiKey?: string; assistantId?: string; keyEnv: string; assistantEnv: string }> = {
    english: {
        apiKey: process.env.NEXT_PUBLIC_VAPI_API_KEY,
        assistantId: ASSISTANT_ID,
        keyEnv: 'NEXT_PUBLIC_VAPI_API_KEY',
        assistantEnv: 'NEXT_PUBLIC_ASSISTANT_ID',
    },
    hinglish: {
        apiKey: process.env.NEXT_PUBLIC_VAPI_HINGLISH_API_KEY,
        assistantId: HINGLISH_ASSISTANT_ID,
        keyEnv: 'NEXT_PUBLIC_VAPI_HINGLISH_API_KEY',
        assistantEnv: 'NEXT_PUBLIC_HINGLISH_ASSISTANT_ID',
    },
};

const vapiClients: Partial<Record<VapiLanguage, InstanceType<typeof Vapi>>> = {};
function getVapi(language: VapiLanguage) {
    if (!vapiClients[language]) {
        const { apiKey, keyEnv } = VAPI_CONFIGS[language];
        if (!apiKey) {
            throw new Error(`${keyEnv} environment variable is not set`);
        }
        vapiClients[language] = new Vapi(apiKey);
    }
    return vapiClients[language];
}

const getConfigurationError = (language: VapiLanguage) => {
    const { apiKey, assistantId, keyEnv, assistantEnv } = VAPI_CONFIGS[language];
    if (!apiKey) return `Vapi is not configured. Add ${keyEnv} and try again.`;
    if (!assistantId) return `Vapi assistant is not configured. Add ${assistantEnv} and try again.`;
    return null;
};

const getFirstMessage = (language: VapiLanguage, title: string, author: string) =>
    language === 'hinglish'
        ? `नमस्ते, मेरा नाम Lumora है, आपसे मिलकर अच्छा लगा। क्या आपने ${author} की ${title} पढ़ी है, या हम बिल्कुल शुरुआत से शुरू करें?`
        : `Hey, my name is Lumora, good to meet you. Have you read ${title} by ${author} yet, or are we starting fresh?`;

// Vapi reports API failures as objects (e.g. { message, error, statusCode }), not strings
const getVapiErrorMessage = (error: unknown): string => {
    if (!error) return 'Vapi could not start the call.';
    if (typeof error === 'string') return error;
    if (Array.isArray(error)) return error.map(getVapiErrorMessage).join(', ');
    if (typeof error === 'object') {
        const { message, error: detail } = error as { message?: unknown; error?: unknown };
        if (message) return getVapiErrorMessage(message);
        if (detail) return getVapiErrorMessage(detail);
    }
    return JSON.stringify(error);
};

export type CallStatus = 'idle' | 'connecting' | 'starting' | 'listening' | 'thinking' | 'speaking';

export function useVapi(book: IBook, language: VapiLanguage = 'english') {
    const { userId } = useAuth();
    const { limits } = useSubscriptionPlan();

    const [status, setStatus] = useState<CallStatus>('idle');
    const [messages, setMessages] = useState<Messages[]>([]);
    const [currentMessage, setCurrentMessage] = useState('');
    const [currentUserMessage, setCurrentUserMessage] = useState('');
    const [duration, setDuration] = useState(0);
    const [maxDurationSeconds, setMaxDurationSeconds] = useState(
        limits.maxSessionMinutes * SECONDS_PER_MINUTE,
    );
    const [limitError, setLimitError] = useState<string | null>(null);
    const [didHitSessionLimit, setDidHitSessionLimit] = useState(false);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const sessionIdRef = useRef<string | null>(null);
    // Unlike sessionIdRef this survives 'call-end', so final transcripts that arrive late are still saved
    const historySessionIdRef = useRef<string | null>(null);
    const savedMessageKeysRef = useRef(new Set<string>());
    const isStoppingRef = useRef(false);
    // Assistant loudness (0-1), kept in a ref so the 3D stage can read it per frame
    const assistantVolumeRef = useRef(0);

    // Keep refs in sync with latest values for use in callbacks
    const maxDurationRef = useLatestRef(maxDurationSeconds);
    const durationRef = useLatestRef(duration);
    const voice = book.persona || DEFAULT_VOICE;

    useEffect(() => {
        if (status === 'idle') {
            setMaxDurationSeconds(limits.maxSessionMinutes * SECONDS_PER_MINUTE);
        }
    }, [limits.maxSessionMinutes, status]);

    // Set up Vapi event listeners
    useEffect(() => {
        const handlers = {
            'call-start': () => {
                isStoppingRef.current = false;
                setStatus('starting'); // AI speaks first, wait for it
                setCurrentMessage('');
                setCurrentUserMessage('');

                // Start duration timer
                startTimeRef.current = Date.now();
                setDuration(0);
                timerRef.current = setInterval(() => {
                    if (startTimeRef.current) {
                        const newDuration = Math.floor((Date.now() - startTimeRef.current) / TIMER_INTERVAL_MS);
                        setDuration(newDuration);

                        if (newDuration >= maxDurationRef.current && !isStoppingRef.current) {
                            isStoppingRef.current = true;
                            setDidHitSessionLimit(true);
                            setLimitError(
                                `Session time limit (${Math.floor(
                                    maxDurationRef.current / SECONDS_PER_MINUTE,
                                )} minutes) reached.`,
                            );
                            getVapi(language).stop();
                        }
                    }
                }, TIMER_INTERVAL_MS);
            },

            'call-end': () => {
                // Don't reset isStoppingRef here - delayed events may still fire
                setStatus('idle');
                setCurrentMessage('');
                setCurrentUserMessage('');
                assistantVolumeRef.current = 0;

                // Stop timer
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }

                // End session tracking
                if (sessionIdRef.current) {
                    endVoiceSession(sessionIdRef.current, durationRef.current).catch((err) =>
                        console.error('Failed to end voice session:', err),
                    );
                    sessionIdRef.current = null;
                }

                startTimeRef.current = null;
            },

            'speech-start': () => {
                if (!isStoppingRef.current) {
                    setStatus('speaking');
                }
            },
            'speech-end': () => {
                if (!isStoppingRef.current) {
                    // After AI finishes speaking, user can talk
                    setStatus('listening');
                }
            },

            'volume-level': (volume: number) => {
                assistantVolumeRef.current = volume;
            },

            message: (message: {
                type: string;
                role: string;
                transcriptType: string;
                transcript: string;
            }) => {
                if (message.type !== 'transcript') return;

                // User finished speaking → AI is thinking
                if (message.role === 'user' && message.transcriptType === 'final') {
                    if (!isStoppingRef.current) {
                        setStatus('thinking');
                    }
                    setCurrentUserMessage('');
                }

                // Partial user transcript → show real-time typing
                if (message.role === 'user' && message.transcriptType === 'partial') {
                    setCurrentUserMessage(message.transcript);
                    return;
                }

                // Partial AI transcript → show word-by-word
                if (message.role === 'assistant' && message.transcriptType === 'partial') {
                    setCurrentMessage(message.transcript);
                    return;
                }

                // Final transcript → add to messages
                if (message.transcriptType === 'final') {
                    if (message.role === 'assistant') setCurrentMessage('');
                    if (message.role === 'user') setCurrentUserMessage('');

                    // Same duplicate rule as the on-screen transcript below
                    const historySessionId = historySessionIdRef.current;
                    const messageKey = `${message.role}:${message.transcript}`;
                    if (
                        historySessionId &&
                        (message.role === 'user' || message.role === 'assistant') &&
                        !savedMessageKeysRef.current.has(messageKey)
                    ) {
                        savedMessageKeysRef.current.add(messageKey);
                        saveSessionMessage(historySessionId, message.role, message.transcript).catch((err) =>
                            console.error('Failed to save conversation message:', err),
                        );
                    }

                    setMessages((prev) => {
                        const isDupe = prev.some(
                            (m) => m.role === message.role && m.content === message.transcript,
                        );
                        return isDupe ? prev : [...prev, { role: message.role, content: message.transcript }];
                    });
                }
            },

            error: (error: Error & { type?: string }) => {
                console.error('Vapi error:', error);
                // Don't reset isStoppingRef here - delayed events may still fire
                setStatus('idle');
                setCurrentMessage('');
                setCurrentUserMessage('');

                // Stop timer on error
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }

                // End session tracking on error (a call that never started has no duration of its own)
                if (sessionIdRef.current) {
                    const callDuration = startTimeRef.current ? durationRef.current : 0;
                    endVoiceSession(sessionIdRef.current, callDuration).catch((err) =>
                        console.error('Failed to end voice session on error:', err),
                    );
                    sessionIdRef.current = null;
                }

                startTimeRef.current = null;

                // Start failures were already explained by 'call-start-failed' - keep that message
                if (error.type === 'start-method-error') return;

                // Show user-friendly error message
                const errorMessage = typeof error.message === 'string' ? error.message.toLowerCase() : '';
                if (errorMessage.includes('timeout') || errorMessage.includes('silence')) {
                    setLimitError('Session ended due to inactivity. Click the mic to start again.');
                } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
                    setLimitError('Connection lost. Please check your internet and try again.');
                } else {
                    setLimitError('Session ended unexpectedly. Click the mic to start again.');
                }
            },

            'call-start-failed': (event: { error?: unknown }) => {
                const message = getVapiErrorMessage(event.error);
                console.error('Vapi call start failed:', message, event);
                setStatus('idle');
                setLimitError(message);
            },
        };

        const configurationError = getConfigurationError(language);
        if (configurationError) return;

        const client = getVapi(language);
        const cleanupDurationRef = durationRef;
        Object.entries(handlers).forEach(([event, handler]) => {
            client.on(event as keyof typeof handlers, handler as () => void);
        });

        return () => {
            // End active session on unmount
            if (sessionIdRef.current) {
                client.stop();
                endVoiceSession(sessionIdRef.current, cleanupDurationRef.current).catch((err) =>
                    console.error('Failed to end voice session on unmount:', err),
                );
                sessionIdRef.current = null;
            }
            // Cleanup handlers
            Object.entries(handlers).forEach(([event, handler]) => {
                client.off(event as keyof typeof handlers, handler as () => void);
            });
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [durationRef, maxDurationRef, language]);

    const start = useCallback(async () => {
        if (!userId) {
            setLimitError('Please sign in to start a voice session.');
            return;
        }

        setLimitError(null);
        setDidHitSessionLimit(false);
        setStatus('connecting');

        try {
            const configurationError = getConfigurationError(language);
            if (configurationError) throw new Error(configurationError);

            // Check session limits and create session record
            const result = await startVoiceSession(userId, book._id);

            if (!result.success) {
                setLimitError(result.error || 'Session limit reached. Please upgrade your plan.');
                setStatus('idle');
                return;
            }

            sessionIdRef.current = result.sessionId || null;
            historySessionIdRef.current = result.sessionId || null;
            savedMessageKeysRef.current = new Set();
            setMaxDurationSeconds(
                (result.maxDurationMinutes ?? limits.maxSessionMinutes) * SECONDS_PER_MINUTE,
            );

            const firstMessage = getFirstMessage(language, book.title, book.author);
            const activeVoice = language === 'hinglish' ? getHinglishVoice(voice) : getVoice(voice);

            await getVapi(language).start(VAPI_CONFIGS[language].assistantId, {
                firstMessage,
                variableValues: {
                    title: book.title,
                    author: book.author,
                    bookId: book._id,
                },
                // English keeps the low-latency turbo model; Hinglish uses multilingual v2 for proper Hindi pronunciation
                voice: {
                    provider: '11labs' as const,
                    voiceId: activeVoice.id,
                    model: language === 'hinglish' ? 'eleven_multilingual_v2' as const : 'eleven_turbo_v2_5' as const,
                    stability: VOICE_SETTINGS.stability,
                    similarityBoost: VOICE_SETTINGS.similarityBoost,
                    style: VOICE_SETTINGS.style,
                    useSpeakerBoost: VOICE_SETTINGS.useSpeakerBoost,
                },
            });
        } catch (err) {
            console.error('Failed to start call:', err);
            if(sessionIdRef.current) {
                endVoiceSession(sessionIdRef.current, 0).catch((error) =>
                    console.error('Failed to end voice session after start error:', error),
                );
                sessionIdRef.current = null;
            }

            setStatus('idle');
            // Keep the specific reason from 'call-start-failed' if Vapi already reported one
            setLimitError((current) => current ?? 'Failed to start voice session. Please try again.');
        }
    }, [book._id, book.title, book.author, limits.maxSessionMinutes, voice, userId, language]);

    const stop = useCallback(() => {
        isStoppingRef.current = true;
        getVapi(language).stop();
    }, [language]);

    const clearError = useCallback(() => {
        setLimitError(null);
    }, []);

    const isActive =
        status === 'starting' ||
        status === 'listening' ||
        status === 'thinking' ||
        status === 'speaking';

    // Calculate remaining time
    // const maxDurationSeconds = limits.maxSessionMinutes * SECONDS_PER_MINUTE;
    // const remainingSeconds = Math.max(0, maxDurationSeconds - duration);
    // const showTimeWarning =
    //     isActive && remainingSeconds <= TIME_WARNING_THRESHOLD && remainingSeconds > 0;

    return {
        status,
        isActive,
        messages,
        currentMessage,
        currentUserMessage,
        duration,
        maxDurationSeconds,
        assistantVolumeRef,
        start,
        stop,
        limitError,
        didHitSessionLimit,
        clearError,
    };
}

export default useVapi;

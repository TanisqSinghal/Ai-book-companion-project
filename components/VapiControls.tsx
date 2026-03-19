'use client';

import { Mic, MicOff } from "lucide-react";
import useVapi from "@/hooks/useVapi";
import { IBook } from "@/types";
import Image from "next/image";
import Transcript from "@/components/Transcript";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const formatDuration = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const STATUS_LABELS = {
    idle: 'Ready',
    connecting: 'Connecting',
    starting: 'Starting',
    listening: 'Listening',
    thinking: 'Thinking',
    speaking: 'Speaking',
} as const;

const VapiControls = ({ book }: { book: IBook }) => {
    const router = useRouter();

    const { status,
        isActive,
        messages,
        currentMessage,
        currentUserMessage,
        duration,
        maxDurationSeconds,
        start,
        stop,
        didHitSessionLimit,
        limitError,
    } = useVapi(book);

    useEffect(() => {
        if (didHitSessionLimit) {
            router.replace('/');
        }
    }, [didHitSessionLimit, router]);

    const isAiThinkingOrSpeaking = isActive && (status === "thinking" || status === "speaking");
    const statusDotClass = `vapi-status-dot-${status === 'idle' ? 'ready' : status}`;

    return (
        <>

            <div className="vapi-header-card">
                <div className="vapi-cover-wrapper">
                    <Image
                        src={book.coverURL || '/assets/book-cover.svg'}
                        alt={book.title}
                        width={120}
                        height={180}
                        className="vapi-cover-image !w-[120px] !h-[180px]"
                    />

                    <div className="vapi-mic-wrapper">
                        {isAiThinkingOrSpeaking && <span className="vapi-pulse-ring" aria-hidden="true" />}
                        <button
                            onClick={isActive ? stop : start}
                            disabled={status === 'connecting'}
                            type="button"
                            className={`vapi-mic-btn !w-[60px] !h-[60px] ${isActive ? 'vapi-mic-btn-active' : 'vapi-mic-btn-inactive'}`}
                            aria-label={isActive ? "Disable microphone" : "Enable microphone"}
                        >
                            {isActive ? (
                                <Mic className="size-6 text-white" />
                            ) : (
                                <MicOff className="size-6 text-[#212a3b]" />
                            )}
                        </button>
                    </div>
                </div>

                <div className="min-w-0 flex-1 flex flex-col gap-2">
                    <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#212a3b] leading-tight">{book.title}</h1>
                    <p className="text-[#3d485e] text-lg">by {book.author}</p>

                    <div className="mt-1 flex flex-wrap gap-2">
                        <div className="vapi-status-indicator">
                            <span className={`vapi-status-dot ${statusDotClass}`} />
                            <span className="vapi-status-text">{STATUS_LABELS[status]}</span>
                        </div>

                        <div className="vapi-status-indicator">
                            <span className="vapi-status-text">Voice: {book.persona || 'Default'}</span>
                        </div>

                        <div className="vapi-status-indicator">
                            <span className="vapi-status-text">{formatDuration(duration)}/{formatDuration(maxDurationSeconds)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {limitError && (
                <div className="warning-banner" role="alert">
                    <p className="warning-banner-text">{limitError}</p>
                </div>
            )}

            <div className="vapi-transcript-wrapper">
                <Transcript
                    messages={messages}
                    currentMessage={currentMessage}
                    currentUserMessage={currentUserMessage}
                />
            </div>
        </>
    )
}

export default VapiControls;
'use client';

import { Mic, MicOff } from "lucide-react";
import useVapi from "@/hooks/useVapi";
import { IBook } from "@/types";
import Image from "next/image";
import Transcript from "@/components/Transcript";

const VapiControls = ({ book }: { book: IBook }) => {

    const { status,
        isActive,
        messages,
        currentMessage,
        currentUserMessage,
        duration,
        start,
        stop,
        clearErros } = useVapi(book);

    const isAiThinkingOrSpeaking = isActive && (status === "thinking" || status === "speaking");

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
                            <span className="vapi-status-dot vapi-status-dot-ready" />
                            <span className="vapi-status-text">Ready</span>
                        </div>

                        <div className="vapi-status-indicator">
                            <span className="vapi-status-text">Voice: {book.persona || 'Default'}</span>
                        </div>

                        <div className="vapi-status-indicator">
                            <span className="vapi-status-text">0:00/15:00</span>
                        </div>
                    </div>
                </div>
            </div>

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
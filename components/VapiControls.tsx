'use client';

import { Bot, Mic, MicOff, PhoneOff, User } from "lucide-react";
import dynamic from "next/dynamic";
import useVapi, { VapiLanguage } from "@/hooks/useVapi";
import useMicLevel from "@/hooks/useMicLevel";
import { MIC_PROBLEM_TEXT } from "@/hooks/useMicrophoneAccess";
import { IS_HINGLISH_AVAILABLE } from "@/lib/constants";
import { getHinglishVoice, getVoice } from "@/lib/utils";
import { detectMood } from "@/lib/mood";
import { IBook } from "@/types";
import Image from "next/image";
import Transcript from "@/components/Transcript";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useInView } from "@/hooks/useInView";

// WebGL only exists in the browser, so the 3D stage is never server-rendered
const ConversationStage = dynamic(() => import("@/components/stage/ConversationStage"), {
    ssr: false,
    loading: () => <p className="stage-fallback">Setting the stage…</p>,
});

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

const LANGUAGE_OPTIONS: { value: VapiLanguage; label: string }[] = [
    { value: 'english', label: 'English' },
    { value: 'hinglish', label: 'Hinglish' },
];

const VapiControls = ({ book }: { book: IBook }) => {
    const router = useRouter();
    const [language, setLanguage] = useState<VapiLanguage>('english');
    const [stage, setStage] = useState<HTMLDivElement | null>(null);
    const stageInView = useInView(stage);

    const { status,
        isActive,
        messages,
        currentMessage,
        currentUserMessage,
        duration,
        maxDurationSeconds,
        assistantVolumeRef,
        start,
        stop,
        didHitSessionLimit,
        limitError,
        micProblem,
    } = useVapi(book, language);

    const micLevelRef = useMicLevel(isActive);

    // After a failed start, bring the fix-it steps into view (the stage fills most of a phone screen).
    // A blocked mic noticed on page load shows the steps too, but doesn't scroll the page.
    const [micHelp, setMicHelp] = useState<HTMLDivElement | null>(null);
    const [startAttempts, setStartAttempts] = useState(0);
    useEffect(() => {
        if (micProblem && startAttempts > 0) {
            micHelp?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [micProblem, micHelp, startAttempts]);

    const handleStart = () => {
        setStartAttempts((count) => count + 1);
        start();
    };

    useEffect(() => {
        if (didHitSessionLimit) {
            router.replace('/');
        }
    }, [didHitSessionLimit, router]);

    const statusDotClass = `vapi-status-dot-${status === 'idle' ? 'ready' : status}`;
    const voiceName = (language === 'hinglish' ? getHinglishVoice(book.persona) : getVoice(book.persona)).name;

    const lastAssistantMessage = messages.findLast((message) => message.role === 'assistant')?.content;
    const lastUserMessage = messages.findLast((message) => message.role === 'user')?.content;
    const aiCaption =
        currentMessage ||
        lastAssistantMessage ||
        (status !== 'idle'
            ? 'One moment…'
            : micProblem
                ? MIC_PROBLEM_TEXT[micProblem].caption
                : `Tap the mic and let's talk about ${book.title}.`);
    const userCaption = currentUserMessage || lastUserMessage;

    // The robot shows the tone of its own words; the reader reacts to them, or shows their own while talking
    const aiMood = status === 'speaking' ? detectMood(currentMessage || lastAssistantMessage || '') : 'neutral';
    const userMood = status === 'listening' ? detectMood(currentUserMessage) : aiMood;

    const isAiTurn = status === 'speaking' || status === 'thinking';
    const isUserTurn = status === 'listening';

    return (
        <>
            <section className="stage-shell" aria-label={`Voice conversation about ${book.title}`}>
                <div ref={setStage} className="stage-canvas">
                    <ConversationStage
                        active={stageInView}
                        status={status}
                        aiLevel={assistantVolumeRef}
                        userLevel={micLevelRef}
                        userSpeaking={currentUserMessage.trim().length > 0}
                        coverURL={book.coverURL}
                        aiMood={aiMood}
                        userMood={userMood}
                    />
                </div>
                <div className="stage-vignette" aria-hidden="true" />

                <div className="stage-hud">
                    <div className="stage-topbar">
                        <div className="stage-book-chip">
                            <Image
                                src={book.coverURL || '/assets/book-cover.svg'}
                                alt=""
                                width={40}
                                height={60}
                                className="stage-book-cover"
                            />
                            <div className="min-w-0">
                                <h1 className="stage-book-title">{book.title}</h1>
                                <p className="stage-book-author">by {book.author}</p>
                            </div>
                        </div>

                        <div className="stage-meta">
                            {IS_HINGLISH_AVAILABLE && (
                                <div className="stage-chip !gap-1 !p-1 pointer-events-auto" role="radiogroup" aria-label="Conversation language">
                                    {LANGUAGE_OPTIONS.map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            role="radio"
                                            aria-checked={language === option.value}
                                            onClick={() => setLanguage(option.value)}
                                            disabled={status !== 'idle'}
                                            className={`rounded-full px-2.5 py-0.5 transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${language === option.value ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'}`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <div className="stage-chip">
                                <span className={`vapi-status-dot ${statusDotClass}`} />
                                <span>{STATUS_LABELS[status]}</span>
                            </div>
                            <div className="stage-chip tabular-nums">
                                {formatDuration(duration)} / {formatDuration(maxDurationSeconds)}
                            </div>
                        </div>
                    </div>

                    <div className="stage-captions" aria-live="polite">
                        <p className={`stage-caption stage-caption-ai ${isAiTurn ? 'stage-caption-live' : ''}`}>
                            <span className="stage-caption-text">{aiCaption}</span>
                        </p>
                        {userCaption && (
                            <p className={`stage-caption stage-caption-user ${isUserTurn ? 'stage-caption-live' : ''}`}>
                                <span className="stage-caption-text">{userCaption}</span>
                            </p>
                        )}
                    </div>

                    <div className="stage-bottombar">
                        <div className={`stage-nameplate stage-nameplate-ai ${isAiTurn ? 'stage-nameplate-live' : ''}`}>
                            <Bot className="size-5 shrink-0" />
                            <div className="min-w-0">
                                <p className="stage-nameplate-name">{voiceName}</p>
                                <p className="stage-nameplate-role">AI companion</p>
                            </div>
                        </div>

                        <div className="stage-mic">
                            <div className="relative">
                                {isActive && <span className="stage-mic-ring" aria-hidden="true" />}
                                <button
                                    onClick={isActive ? stop : handleStart}
                                    disabled={status === 'connecting'}
                                    type="button"
                                    className={`stage-mic-btn ${isActive ? 'stage-mic-btn-active' : 'stage-mic-btn-inactive'}`}
                                    aria-label={isActive ? "End conversation" : "Start conversation"}
                                >
                                    {isActive ? <PhoneOff className="size-7" /> : <Mic className="size-7" />}
                                </button>
                            </div>
                            <p className="stage-mic-hint">
                                {status === 'connecting' ? 'Connecting…' : isActive ? 'Tap to end' : micProblem ? 'Tap to retry' : 'Tap to talk'}
                            </p>
                        </div>

                        <div className={`stage-nameplate stage-nameplate-user ${isUserTurn ? 'stage-nameplate-live' : ''}`}>
                            <div className="min-w-0 text-right">
                                <p className="stage-nameplate-name">You</p>
                                <p className="stage-nameplate-role">Reader</p>
                            </div>
                            <User className="size-5 shrink-0" />
                        </div>
                    </div>
                </div>
            </section>

            {micProblem && !isActive && (
                <div ref={setMicHelp} className="mic-help" role="alert">
                    <MicOff className="mic-help-icon" aria-hidden="true" />
                    <div className="min-w-0">
                        <p className="mic-help-title">{MIC_PROBLEM_TEXT[micProblem].title}</p>
                        <ol className="mic-help-steps">
                            {MIC_PROBLEM_TEXT[micProblem].steps.map((step) => (
                                <li key={step}>{step}</li>
                            ))}
                        </ol>
                    </div>
                </div>
            )}

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

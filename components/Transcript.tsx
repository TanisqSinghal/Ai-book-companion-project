'use client';

import { Messages } from "@/types";
import { Mic } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

interface TranscriptProps {
    messages: Messages[];
    currentMessage: string;
    currentUserMessage: string;
}

const Transcript = ({ messages, currentMessage, currentUserMessage }: TranscriptProps) => {
    const messagesRef = useRef<HTMLDivElement | null>(null);

    const hasConversation = useMemo(() => {
        return messages.length > 0 || currentMessage.trim().length > 0 || currentUserMessage.trim().length > 0;
    }, [messages, currentMessage, currentUserMessage]);

    // Scroll only inside the transcript box - scrollIntoView would also scroll the page away from the stage
    useEffect(() => {
        const container = messagesRef.current;
        if (container) container.scrollTop = container.scrollHeight;
    }, [messages, currentMessage, currentUserMessage]);

    if (!hasConversation) {
        return (
            <div className="transcript-container">
                <div className="transcript-empty">
                    <Mic className="size-12 text-(--text-secondary)" />
                    <p className="transcript-empty-text mt-3">No conversation yet</p>
                    <p className="transcript-empty-hint">Click the mic button above to start talking</p>
                </div>
            </div>
        );
    }

    return (
        <div className="transcript-container">
            <div ref={messagesRef} className="transcript-messages">
                {messages.map((message, index) => {
                    const isUser = message.role === "user";

                    return (
                        <div
                            key={`${message.role}-${index}`}
                            className={`transcript-message ${isUser ? "transcript-message-user" : "transcript-message-assistant"}`}
                        >
                            <div
                                className={`transcript-bubble ${
                                    isUser ? "transcript-bubble-user" : "transcript-bubble-assistant"
                                }`}
                            >
                                {message.content}
                            </div>
                        </div>
                    );
                })}

                {currentUserMessage.trim().length > 0 && (
                    <div className="transcript-message transcript-message-user">
                        <div className="transcript-bubble transcript-bubble-user">
                            {currentUserMessage}
                            <span className="transcript-cursor" />
                        </div>
                    </div>
                )}

                {currentMessage.trim().length > 0 && (
                    <div className="transcript-message transcript-message-assistant">
                        <div className="transcript-bubble transcript-bubble-assistant">
                            {currentMessage}
                            <span className="transcript-cursor" />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Transcript;
'use client';

import { useTypewriter } from '@/hooks/useTypewriter';

const TAGLINES = [
    'An intelligent AI companion for your books.',
    'Talks with you in English, Hindi & Hinglish.',
    'Reads your PDFs and answers from the book.',
    'Ask anything: summaries, characters, big ideas.',
];

// Floating HUD card that introduces the robot in the hero scene
const AgentIntro = () => {
    const tagline = useTypewriter(TAGLINES);

    return (
        <div className="hero3d-agent-intro">
            <p className="hero3d-agent-label">
                <span className="hero3d-agent-dot" aria-hidden="true" />
                AI Agent · Online
            </p>
            <h2 className="hero3d-agent-name hero3d-shine">Lumora</h2>
            <p className="hero3d-agent-tagline">
                <span className="sr-only">{TAGLINES.join(' ')}</span>
                <span aria-hidden="true">
                    {tagline}
                    <span className="type-caret" />
                </span>
            </p>
        </div>
    );
};

export default AgentIntro;

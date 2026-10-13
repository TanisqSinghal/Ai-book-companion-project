import React from 'react'
import Link from 'next/link'
import HeroStage from '@/components/stage/HeroStage'

const STEPS = [
    { title: 'Upload PDF', description: 'Add your book file' },
    { title: 'AI Processing', description: 'We analyze the content' },
    { title: 'Voice Chat', description: 'Discuss with AI' },
];

const HeroSection = () => {
    return (
        <section className="wrapper mb-10 md:mb-16">
            <div className="hero3d-card">
                <div className="hero3d-copy">
                    <h1 className="hero3d-title">Your Library</h1>
                    <p className="hero3d-description">
                        Convert your books into interactive AI conversations. <br className="hidden md:block" />
                        Listen, learn, and discuss your favorite reads.
                    </p>
                    <Link href="/books/new" className="hero3d-cta">
                        <span className="text-3xl font-light mb-1 mr-2">+</span>
                        <span>Add new book</span>
                    </Link>

                    <ol className="hero3d-steps">
                        {STEPS.map((step, index) => (
                            <li key={step.title} className="hero3d-step">
                                <span className="hero3d-step-number">{index + 1}</span>
                                <div className="flex flex-col">
                                    <h3 className="hero3d-step-title">{step.title}</h3>
                                    <p className="hero3d-step-description">{step.description}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                </div>

                <HeroStage />
            </div>
        </section>
    )
}

export default HeroSection

import React from 'react'
import Link from 'next/link'
import HeroStage from '@/components/stage/HeroStage'
import HeroSteps from '@/components/HeroSteps'

const HeroSection = () => {
    return (
        <section className="hero3d-section mb-10 md:mb-16">
            <div className="hero3d-card">
                <div className="hero3d-copy">
                    <h1 className="hero3d-title">
                        <span className="hero3d-shine">Your</span>{" "}
                        <span className="hero3d-title-glow">Library</span>
                    </h1>
                    <p className="hero3d-description">
                        Convert your books into interactive AI conversations. <br className="hidden md:block" />
                        Listen, learn, and discuss your favorite reads.
                    </p>
                    <Link href="/books/new" className="hero3d-cta">
                        <span className="text-3xl font-light mb-1 mr-2">+</span>
                        <span>Add new book</span>
                    </Link>

                    <HeroSteps />
                </div>

                <HeroStage />
            </div>
        </section>
    )
}

export default HeroSection

'use client';

import dynamic from 'next/dynamic';

// WebGL only exists in the browser, so the heart is never server-rendered
const ShinyHeart = dynamic(() => import('@/components/about/ShinyHeart'), {
    ssr: false,
    loading: () => <span className="about-heart-fallback">❤</span>,
});

const MadeWithLove = () => (
    // A div, not a <p>: the 3D canvas renders a <div>, which is not allowed inside a paragraph
    <div className="about-love">
        <span className="hero3d-shine">Made with</span>
        <div className="about-heart" role="img" aria-label="love">
            <ShinyHeart />
        </div>
        <span className="hero3d-shine">by Tanishak &amp; Rahul</span>
    </div>
);

export default MadeWithLove;

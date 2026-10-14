'use client';

import { useEffect, useState } from 'react';

// True while the element is on (or near) the screen, so offscreen 3D scenes can stop rendering
export function useInView(element: Element | null, rootMargin = '150px') {
    const [inView, setInView] = useState(true);

    useEffect(() => {
        if (!element) return;

        const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin });
        observer.observe(element);
        return () => observer.disconnect();
    }, [element, rootMargin]);

    return inView;
}

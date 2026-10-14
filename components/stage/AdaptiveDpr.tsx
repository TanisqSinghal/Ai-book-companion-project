'use client';

import { PerformanceMonitor } from '@react-three/drei';

// Full sharpness by default; drops to 1x resolution while the device can't keep up, and recovers after
export const MAX_DPR: [number, number] = [1, 1.75];

const AdaptiveDpr = ({ onChange }: { onChange: (dpr: number | [number, number]) => void }) => (
    <PerformanceMonitor
        onDecline={() => onChange(1)}
        onIncline={() => onChange(MAX_DPR)}
        onFallback={() => onChange(1)}
        flipflops={3}
    />
);

export default AdaptiveDpr;

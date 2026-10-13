'use client';

import { useEffect, useState } from 'react';
import * as THREE from 'three';

import { BOOK_DEPTH, BOOK_HEIGHT, BOOK_WIDTH } from '@/components/stage/bookSize';

export const useCoverTexture = (coverURL?: string) => {
    const [texture, setTexture] = useState<THREE.Texture | null>(null);

    useEffect(() => {
        if (!coverURL) return;

        let cancelled = false;
        let loaded: THREE.Texture | null = null;
        // Remote covers go through the Next image optimizer so they are same-origin for WebGL
        const src = coverURL.startsWith('/')
            ? coverURL
            : `/_next/image?url=${encodeURIComponent(coverURL)}&w=384&q=75`;

        new THREE.TextureLoader().load(
            src,
            (result) => {
                if (cancelled) {
                    result.dispose();
                    return;
                }
                result.colorSpace = THREE.SRGBColorSpace;
                result.anisotropy = 8;
                loaded = result;
                setTexture(result);
            },
            undefined,
            () => {
                // Keep the plain cover if the image cannot be loaded
            },
        );

        return () => {
            cancelled = true;
            loaded?.dispose();
        };
    }, [coverURL]);

    return texture;
};

// A closed hardback: binding, page block and the cover image on the front
const Book3D = ({ coverURL }: { coverURL?: string }) => {
    const cover = useCoverTexture(coverURL);

    return (
        <group>
            <mesh>
                <boxGeometry args={[BOOK_WIDTH, BOOK_HEIGHT, BOOK_DEPTH]} />
                <meshStandardMaterial color="#663820" roughness={0.6} />
            </mesh>
            <mesh position={[0.025, 0, 0]}>
                <boxGeometry args={[BOOK_WIDTH - 0.03, BOOK_HEIGHT - 0.06, BOOK_DEPTH - 0.04]} />
                <meshStandardMaterial color="#f3e4c7" roughness={0.9} />
            </mesh>
            <mesh position={[0, 0, BOOK_DEPTH / 2 + 0.002]}>
                <planeGeometry args={[BOOK_WIDTH, BOOK_HEIGHT]} />
                <meshStandardMaterial
                    key={cover ? 'cover' : 'plain'}
                    map={cover}
                    color={cover ? '#ffffff' : '#7a4528'}
                    roughness={0.55}
                />
            </mesh>
        </group>
    );
};

export default Book3D;

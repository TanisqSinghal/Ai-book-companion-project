'use client';

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer, Sparkles, useCursor } from '@react-three/drei';
import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';

import Book3D from '@/components/stage/Book3D';
import { AI_COLOR } from '@/components/stage/Robot';
import { USER_COLOR } from '@/components/stage/Human';
import { PLANK_THICKNESS, layoutShelf } from '@/components/shelf/layout';
import type { ShelfBook, ShelfSlot } from '@/components/shelf/layout';

const BACKDROP = '#0a1022';
const FOV = 30;
// Books rest turned aside like a shop display and swing round to face you on hover
const REST_TURN = -0.55;
const PULL_OUT = 0.5;
// How close the camera gets to a book before the page changes
const LAUNCH_DISTANCE = 2.3;

const { damp, degToRad } = THREE.MathUtils;

// Distance at which the shelf exactly fills the canvas, top to bottom
const homeDistance = (worldHeight: number) => worldHeight / 2 / Math.tan(degToRad(FOV / 2));

interface ShelfCameraProps {
    worldHeight: number;
    target: ShelfSlot | null;
}

// Frames the whole shelf with a little pointer parallax, then dives at the chosen book
const ShelfCamera = ({ worldHeight, target }: ShelfCameraProps) => {
    const lookAt = useRef(new THREE.Vector3());

    useFrame((state, delta) => {
        const camera = state.camera;
        const speed = target ? 3.6 : 3;
        const x = target ? target.x : state.pointer.x * 0.5;
        const y = target ? target.y : state.pointer.y * 0.25;
        const z = target ? LAUNCH_DISTANCE : homeDistance(worldHeight);

        camera.position.x = damp(camera.position.x, x, speed, delta);
        camera.position.y = damp(camera.position.y, y, speed, delta);
        camera.position.z = damp(camera.position.z, z, speed, delta);

        lookAt.current.x = damp(lookAt.current.x, target ? target.x : 0, speed, delta);
        lookAt.current.y = damp(lookAt.current.y, target ? target.y : 0, speed, delta);
        camera.lookAt(lookAt.current);
    });

    return null;
};

interface ShelfBookProps {
    slot: ShelfSlot;
    active: boolean;
    onHover: (index: number, entered: boolean) => void;
    onSelect: (index: number) => void;
}

const ShelfBookMesh = ({ slot, active, onHover, onSelect }: ShelfBookProps) => {
    const group = useRef<THREE.Group>(null);

    useFrame((state, delta) => {
        if (!group.current) return;

        const idleSway = Math.sin(state.clock.elapsedTime * 0.7 + slot.index) * 0.04;
        group.current.rotation.y = damp(group.current.rotation.y, active ? 0 : REST_TURN + idleSway, 7, delta);
        group.current.position.x = slot.x;
        group.current.position.z = damp(group.current.position.z, active ? PULL_OUT : 0, 7, delta);
        group.current.position.y = damp(group.current.position.y, slot.y + (active ? 0.08 : 0), 7, delta);
        group.current.scale.setScalar(damp(group.current.scale.x, active ? 1.06 : 1, 7, delta));
    });

    return (
        <group
            ref={group}
            position={[slot.x, slot.y, 0]}
            rotation={[0, REST_TURN, 0]}
            onPointerOver={(event) => {
                event.stopPropagation();
                onHover(slot.index, true);
            }}
            onPointerOut={() => onHover(slot.index, false)}
            onClick={(event) => {
                event.stopPropagation();
                onSelect(slot.index);
            }}
        >
            <Book3D coverURL={slot.book.coverURL} />
        </group>
    );
};

export interface ShelfSceneProps {
    books: ShelfBook[];
    columns: number;
    hovered: number | null;
    launching: number | null;
    onHover: (index: number, entered: boolean) => void;
    onSelect: (index: number) => void;
}

const ShelfScene = ({ books, columns, hovered, launching, onHover, onSelect }: ShelfSceneProps) => {
    const { width, height, slots, plankHeights } = layoutShelf(books, columns);
    const target = launching === null ? null : slots[launching] ?? null;

    useCursor(hovered !== null && launching === null);

    return (
        <Canvas
            dpr={[1, 1.75]}
            camera={{ fov: FOV, near: 0.1, far: 500, position: [0, 0, homeDistance(height)] }}
            fallback={<p className="stage-fallback">3D view is not supported on this device.</p>}
        >
            <color attach="background" args={[BACKDROP]} />

            {/* Kept soft so pale covers stay readable instead of blooming white */}
            <ambientLight intensity={0.55} />
            <directionalLight position={[2, 4, 8]} intensity={0.9} />
            <directionalLight position={[-6, 2, 4]} intensity={0.5} color={AI_COLOR} />
            <directionalLight position={[6, 2, 4]} intensity={0.5} color={USER_COLOR} />

            <Environment resolution={128}>
                <Lightformer form="rect" intensity={0.9} position={[0, 6, 2]} rotation={[Math.PI / 2, 0, 0]} scale={[12, 5, 1]} />
                <Lightformer form="rect" intensity={0.6} position={[0, 0, 8]} rotation={[0, Math.PI, 0]} scale={[12, 6, 1]} />
            </Environment>

            <ShelfCamera worldHeight={height} target={target} />

            {plankHeights.map((plankY, row) => (
                <group key={row} position={[0, plankY, 0]}>
                    <mesh>
                        <boxGeometry args={[width - 0.4, PLANK_THICKNESS, 1.2]} />
                        <meshStandardMaterial color="#141d38" metalness={0.8} roughness={0.35} />
                    </mesh>
                    <mesh position={[0, 0, 0.61]}>
                        <boxGeometry args={[width - 0.4, 0.028, 0.02]} />
                        <meshStandardMaterial
                            color="#05070d"
                            emissive={row % 2 === 0 ? AI_COLOR : USER_COLOR}
                            emissiveIntensity={2.4}
                            toneMapped={false}
                        />
                    </mesh>
                </group>
            ))}

            {slots.map((slot) => (
                <ShelfBookMesh
                    key={slot.book.id}
                    slot={slot}
                    active={launching === null ? hovered === slot.index : launching === slot.index}
                    onHover={onHover}
                    onSelect={onSelect}
                />
            ))}

            <Sparkles
                count={Math.round(width * height * 1.2)}
                scale={[width, height, 2]}
                position={[0, 0, -0.4]}
                size={2}
                speed={0.25}
                color="#9fdcff"
            />

            <EffectComposer>
                <Bloom mipmapBlur intensity={0.8} luminanceThreshold={1} luminanceSmoothing={0.25} />
                <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
            </EffectComposer>
        </Canvas>
    );
};

export default ShelfScene;

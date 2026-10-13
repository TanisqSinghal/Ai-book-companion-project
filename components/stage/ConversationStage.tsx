'use client';

import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, Lightformer, Sparkles, Stars } from '@react-three/drei';
import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';

import type { CallStatus } from '@/hooks/useVapi';
import Robot, { AI_COLOR } from '@/components/stage/Robot';
import Human, { USER_COLOR } from '@/components/stage/Human';

const BACKDROP = '#060914';
const CHARACTER_OFFSET = 2.4;
const CHARACTER_TURN = 0.55;
const PEDESTAL_HEIGHT = 0.14;
const CAMERA_DISTANCE = 10.4;
const CAMERA_HEIGHT = 2.2;
const LOOK_AT_HEIGHT = 2.2;
// Below this aspect ratio the camera pulls back so both characters stay in frame
const MIN_FRAMED_ASPECT = 1.5;
const USER_TALKING_LEVEL = 0.08;
const STREAM_COUNT = 40;

const { damp } = THREE.MathUtils;

const streamStart = new THREE.Vector3(-1.95, 2.55, 0.45);
const streamPeak = new THREE.Vector3(0, 3.7, 0.7);
const streamEnd = new THREE.Vector3(1.95, 2.25, 0.4);
const streamDummy = new THREE.Object3D();
const aiColor = new THREE.Color(AI_COLOR);
const userColor = new THREE.Color(USER_COLOR);

export interface ConversationStageProps {
    status: CallStatus;
    aiLevel: RefObject<number>;
    userLevel: RefObject<number>;
    userSpeaking: boolean;
    coverURL?: string;
}

type SpeakerProps = Pick<ConversationStageProps, 'status' | 'aiLevel' | 'userLevel' | 'userSpeaking'>;

const isUserTalking = ({ status, userLevel, userSpeaking }: Omit<SpeakerProps, 'aiLevel'>) =>
    status === 'listening' && (userSpeaking || userLevel.current > USER_TALKING_LEVEL);

// Drifts toward whoever is talking and follows the pointer for parallax depth
const CameraRig = ({ status, userLevel, userSpeaking }: Omit<SpeakerProps, 'aiLevel'>) => {
    const focus = useRef(0);

    useFrame((state, delta) => {
        const aspect = state.size.width / state.size.height;
        const distance = CAMERA_DISTANCE * Math.max(1, MIN_FRAMED_ASPECT / aspect);
        const target = status === 'speaking' ? -1 : isUserTalking({ status, userLevel, userSpeaking }) ? 1 : 0;
        focus.current = damp(focus.current, target, 1.6, delta);

        const camera = state.camera;
        camera.position.x = damp(camera.position.x, focus.current * 0.9 + state.pointer.x * 0.8, 3, delta);
        camera.position.y = damp(camera.position.y, CAMERA_HEIGHT + state.pointer.y * 0.4, 3, delta);
        camera.position.z = damp(camera.position.z, distance - Math.abs(focus.current) * 0.4, 3, delta);
        camera.lookAt(focus.current * 0.45, LOOK_AT_HEIGHT, 0);
    });

    return null;
};

interface PedestalProps {
    color: string;
    level: RefObject<number>;
    active: boolean;
}

const Pedestal = ({ color, level, active }: PedestalProps) => {
    const ring = useRef<THREE.MeshStandardMaterial>(null);
    const light = useRef<THREE.PointLight>(null);

    useFrame((_, delta) => {
        const boost = active ? 1 + level.current * 2 : 0;
        if (ring.current) {
            ring.current.emissiveIntensity = damp(ring.current.emissiveIntensity, 1.3 + boost * 1.6, 8, delta);
        }
        if (light.current) {
            light.current.intensity = damp(light.current.intensity, 5 + boost * 1.5, 8, delta);
        }
    });

    return (
        <group>
            <mesh position={[0, PEDESTAL_HEIGHT / 2, 0]}>
                <cylinderGeometry args={[1.05, 1.15, PEDESTAL_HEIGHT, 64]} />
                <meshStandardMaterial color="#0f1730" metalness={0.85} roughness={0.3} />
            </mesh>
            <mesh position={[0, PEDESTAL_HEIGHT + 0.005, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.98, 0.022, 12, 96]} />
                <meshStandardMaterial
                    ref={ring}
                    color="#05070d"
                    emissive={color}
                    emissiveIntensity={1.3}
                    toneMapped={false}
                />
            </mesh>
            <pointLight ref={light} color={color} intensity={5} distance={7} position={[0, 2.7, 1.6]} />
        </group>
    );
};

// Glowing beads that travel from the speaker to the listener
const SpeechStream = ({ status, aiLevel, userLevel, userSpeaking }: SpeakerProps) => {
    const beads = useRef<THREE.InstancedMesh>(null);
    const material = useRef<THREE.MeshBasicMaterial>(null);
    const activity = useRef(0);
    const direction = useRef(1);
    const offset = useRef(0);

    useFrame((state, delta) => {
        if (!beads.current || !material.current) return;

        const t = state.clock.elapsedTime;
        const aiTalking = status === 'speaking';
        const userTalking = isUserTalking({ status, userLevel, userSpeaking });
        if (aiTalking) direction.current = 1;
        else if (userTalking) direction.current = -1;

        activity.current = damp(activity.current, aiTalking || userTalking ? 1 : 0, 5, delta);
        offset.current += delta * 0.32 * direction.current;

        const loudness = direction.current > 0 ? Math.max(0.3, aiLevel.current) : Math.max(0.3, userLevel.current);
        material.current.color.lerp(direction.current > 0 ? aiColor : userColor, 1 - Math.exp(-delta * 6));

        for (let i = 0; i < STREAM_COUNT; i++) {
            const u = (((i / STREAM_COUNT + offset.current) % 1) + 1) % 1;
            const inverse = 1 - u;
            const a = inverse * inverse;
            const b = 2 * inverse * u;
            const c = u * u;
            const ripple = Math.sin(u * 22 - t * 7) * 0.07 * loudness;

            streamDummy.position.set(
                a * streamStart.x + b * streamPeak.x + c * streamEnd.x,
                a * streamStart.y + b * streamPeak.y + c * streamEnd.y + ripple,
                a * streamStart.z + b * streamPeak.z + c * streamEnd.z,
            );
            streamDummy.scale.setScalar(Math.sin(Math.PI * u) * (0.03 + loudness * 0.045) * activity.current);
            streamDummy.updateMatrix();
            beads.current.setMatrixAt(i, streamDummy.matrix);
        }
        beads.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={beads} args={[undefined, undefined, STREAM_COUNT]} frustumCulled={false}>
            <sphereGeometry args={[1, 12, 12]} />
            <meshBasicMaterial ref={material} color={[1.6, 3.2, 3.6]} toneMapped={false} />
        </instancedMesh>
    );
};

const useCoverTexture = (coverURL?: string) => {
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

// The book the two of them are talking about, projected between them
const FloatingBook = ({ coverURL }: { coverURL?: string }) => {
    const book = useRef<THREE.Group>(null);
    const cover = useCoverTexture(coverURL);

    useFrame((state) => {
        if (book.current) {
            book.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.55;
        }
    });

    return (
        <group position={[0, 0, -0.9]}>
            <mesh position={[0, PEDESTAL_HEIGHT / 2, 0]}>
                <cylinderGeometry args={[0.5, 0.58, PEDESTAL_HEIGHT, 48]} />
                <meshStandardMaterial color="#0f1730" metalness={0.85} roughness={0.3} />
            </mesh>
            <mesh position={[0, PEDESTAL_HEIGHT + 0.005, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.42, 0.018, 12, 64]} />
                <meshStandardMaterial color="#0d0a04" emissive="#ffd9a0" emissiveIntensity={2} toneMapped={false} />
            </mesh>
            <mesh position={[0, PEDESTAL_HEIGHT + 0.85, 0]} rotation={[Math.PI, 0, 0]}>
                <coneGeometry args={[0.95, 1.7, 48, 1, true]} />
                <meshBasicMaterial
                    color="#ffd9a0"
                    transparent
                    opacity={0.05}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                    blending={THREE.AdditiveBlending}
                />
            </mesh>

            <Float speed={2} rotationIntensity={0.25} floatIntensity={0.7}>
                <group ref={book} position={[0, 2.05, 0]}>
                    <mesh>
                        <boxGeometry args={[1, 1.46, 0.18]} />
                        <meshStandardMaterial color="#663820" roughness={0.6} />
                    </mesh>
                    <mesh position={[0.025, 0, 0]}>
                        <boxGeometry args={[0.97, 1.4, 0.14]} />
                        <meshStandardMaterial color="#f3e4c7" roughness={0.9} />
                    </mesh>
                    <mesh position={[0, 0, 0.092]}>
                        <planeGeometry args={[1, 1.46]} />
                        <meshStandardMaterial
                            key={cover ? 'cover' : 'plain'}
                            map={cover}
                            color={cover ? '#ffffff' : '#7a4528'}
                            roughness={0.55}
                        />
                    </mesh>
                </group>
            </Float>
            <Sparkles count={36} scale={[2, 2.6, 1.4]} position={[0, 1.9, 0]} size={3} speed={0.35} color="#ffd9a0" />
        </group>
    );
};

const ConversationStage = ({ status, aiLevel, userLevel, userSpeaking, coverURL }: ConversationStageProps) => (
    <Canvas
        dpr={[1, 1.75]}
        camera={{ fov: 35, near: 0.1, far: 90, position: [0, CAMERA_HEIGHT, CAMERA_DISTANCE] }}
        fallback={<p className="stage-fallback">3D view is not supported on this device.</p>}
    >
        <color attach="background" args={[BACKDROP]} />
        <fog attach="fog" args={[BACKDROP, 13, 34]} />

        <ambientLight intensity={0.45} />
        <directionalLight position={[2, 7, 6]} intensity={1.5} />
        <directionalLight position={[-5, 4, -5]} intensity={1.4} color={AI_COLOR} />
        <directionalLight position={[5, 4, -5]} intensity={1.4} color={USER_COLOR} />

        {/* Built in code so reflections work without downloading an HDR file */}
        <Environment resolution={256}>
            <Lightformer form="rect" intensity={2.2} position={[0, 6, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[12, 5, 1]} />
            <Lightformer form="rect" intensity={3} color={AI_COLOR} position={[-7, 2, 2]} rotation={[0, Math.PI / 2, 0]} scale={[6, 3, 1]} />
            <Lightformer form="rect" intensity={3} color={USER_COLOR} position={[7, 2, 2]} rotation={[0, -Math.PI / 2, 0]} scale={[6, 3, 1]} />
            <Lightformer form="rect" intensity={1.2} position={[0, 2, 8]} rotation={[0, Math.PI, 0]} scale={[10, 4, 1]} />
        </Environment>

        <CameraRig status={status} userLevel={userLevel} userSpeaking={userSpeaking} />

        <group position={[-CHARACTER_OFFSET, 0, 0]} rotation={[0, CHARACTER_TURN, 0]}>
            <Pedestal color={AI_COLOR} level={aiLevel} active={status === 'speaking'} />
            <group position={[0, PEDESTAL_HEIGHT, 0]}>
                <Robot status={status} level={aiLevel} />
            </group>
        </group>

        <group position={[CHARACTER_OFFSET, 0, 0]} rotation={[0, -CHARACTER_TURN, 0]}>
            <Pedestal color={USER_COLOR} level={userLevel} active={status === 'listening'} />
            <group position={[0, PEDESTAL_HEIGHT, 0]}>
                <Human status={status} level={userLevel} speakingHint={userSpeaking} />
            </group>
        </group>

        <FloatingBook coverURL={coverURL} />
        <SpeechStream status={status} aiLevel={aiLevel} userLevel={userLevel} userSpeaking={userSpeaking} />

        {/* Floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[30, 64]} />
            <meshStandardMaterial color="#0a1022" metalness={0.7} roughness={0.42} />
        </mesh>
        <gridHelper args={[60, 60, '#22335a', '#141d36']} position={[0, 0.004, 0]} />

        <Stars radius={45} depth={30} count={1400} factor={3.2} fade speed={0.6} />
        <Sparkles count={70} scale={[13, 5, 6]} position={[0, 2.6, -1]} size={2.2} speed={0.25} color="#9fdcff" />

        <EffectComposer>
            <Bloom mipmapBlur intensity={0.95} luminanceThreshold={1} luminanceSmoothing={0.25} />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
    </Canvas>
);

export default ConversationStage;

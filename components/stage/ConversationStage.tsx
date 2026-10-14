'use client';

import { Component, Suspense, useMemo, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, Lightformer, Sparkles, Stars } from '@react-three/drei';
import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';

import type { CallStatus } from '@/hooks/useVapi';
import type { Mood } from '@/lib/mood';
import Robot, { AI_COLOR } from '@/components/stage/Robot';
import Human, { USER_COLOR } from '@/components/stage/Human';
import AvatarHuman from '@/components/stage/AvatarHuman';
import Book3D from '@/components/stage/Book3D';
import AdaptiveDpr, { MAX_DPR } from '@/components/stage/AdaptiveDpr';
import {
    ENTRANCE_LENGTH,
    RING_ON_AT,
    RING_STAGGER,
    flicker,
    sequenceTime,
} from '@/components/stage/sequence';
import type { EnergyRef, SequenceRef } from '@/components/stage/sequence';

const BACKDROP = '#060914';
const CHARACTER_OFFSET = 2.4;
const CHARACTER_TURN = 0.55;
const PEDESTAL_HEIGHT = 0.14;
const CAMERA_DISTANCE = 10.4;
const CAMERA_HEIGHT = 2.2;
const LOOK_AT_HEIGHT = 2.2;
// Where the camera starts before it sweeps in
const CAMERA_ENTRANCE: [number, number, number] = [-8, 7, 25];
// Below this aspect ratio the camera pulls back so both characters stay in frame
const MIN_FRAMED_ASPECT = 1.5;
const USER_TALKING_LEVEL = 0.08;
// Loudness used when someone has the floor but no volume reading has arrived yet
const MIN_ENERGY = 0.3;
const STREAM_COUNT = 40;
const DUST_COUNT = 240;
const DUST_HEIGHT = 6;

const { damp } = THREE.MathUtils;

const streamStart = new THREE.Vector3(-1.95, 2.55, 0.45);
const streamPeak = new THREE.Vector3(0, 4.1, 0.7);
const streamEnd = new THREE.Vector3(2.15, 3.15, 0.45);
const streamDummy = new THREE.Object3D();
const aiColor = new THREE.Color(AI_COLOR);
const userColor = new THREE.Color(USER_COLOR);

// Fixed-seed random numbers, so the dust is laid out the same on every render
const seededRandom = (seed: number) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
};

const dustPositions = new Float32Array(DUST_COUNT * 3);
const dustSeeds = new Float32Array(DUST_COUNT);
{
    const random = seededRandom(7);
    for (let i = 0; i < DUST_COUNT; i++) {
        dustPositions[i * 3] = (random() - 0.5) * 16;
        dustPositions[i * 3 + 1] = random() * DUST_HEIGHT;
        dustPositions[i * 3 + 2] = (random() - 0.5) * 9 - 1;
        dustSeeds[i] = random();
    }
}

export interface ConversationStageProps {
    status: CallStatus;
    aiLevel: RefObject<number>;
    userLevel: RefObject<number>;
    userSpeaking: boolean;
    coverURL?: string;
    aiMood?: Mood;
    userMood?: Mood;
    // False while the stage is scrolled out of view, so it stops rendering frames
    active?: boolean;
}

type SpeakerProps = Pick<ConversationStageProps, 'status' | 'aiLevel' | 'userLevel' | 'userSpeaking'>;

interface StageRefs {
    sequenceRef: SequenceRef;
    energyRef: EnergyRef;
    dollyRef: RefObject<number>;
}

// Runs first each frame: owns the entrance clock and the shared loudness values
const StageDriver = ({ status, aiLevel, userLevel, userSpeaking, sequenceRef, energyRef, dollyRef }: SpeakerProps & StageRefs) => {
    const previousStatus = useRef(status);

    useFrame((state, delta) => {
        const t = state.clock.elapsedTime;
        if (sequenceRef.current === null) sequenceRef.current = t;

        // A call starting replays the entrance: lights restart and the camera pulls back to push in again
        if (previousStatus.current === 'idle' && status !== 'idle') {
            sequenceRef.current = t;
            dollyRef.current = 1;
        }
        previousStatus.current = status;
        dollyRef.current = damp(dollyRef.current, 0, 1.2, delta);

        const userTalking = status === 'listening' && (userSpeaking || userLevel.current > USER_TALKING_LEVEL);
        const energy = energyRef.current;
        energy.ai = damp(energy.ai, status === 'speaking' ? Math.max(MIN_ENERGY, aiLevel.current) : 0, 9, delta);
        energy.user = damp(energy.user, userTalking ? Math.max(MIN_ENERGY, userLevel.current) : 0, 9, delta);
    });

    return null;
};

// Sweeps in on entry, then drifts toward whoever is talking and follows the pointer for parallax
const CameraRig = ({ sequenceRef, energyRef, dollyRef }: StageRefs) => {
    const focus = useRef(0);

    useFrame((state, delta) => {
        const entering = sequenceTime(sequenceRef, state.clock.elapsedTime) < ENTRANCE_LENGTH;
        const aspect = state.size.width / state.size.height;
        const distance = CAMERA_DISTANCE * Math.max(1, MIN_FRAMED_ASPECT / aspect);
        const { ai, user } = energyRef.current;
        const target = entering ? 0 : ai > 0.1 ? -1 : user > 0.1 ? 1 : 0;
        focus.current = damp(focus.current, target, 1.6, delta);

        const speed = entering ? 1.15 : 3;
        const dolly = dollyRef.current;
        const camera = state.camera;
        camera.position.x = damp(camera.position.x, focus.current * 0.9 + state.pointer.x * 0.8, speed, delta);
        camera.position.y = damp(
            camera.position.y,
            CAMERA_HEIGHT + state.pointer.y * 0.4 + dolly * 1.6,
            speed,
            delta,
        );
        camera.position.z = damp(
            camera.position.z,
            distance - Math.abs(focus.current) * 0.4 + dolly * 5.5,
            speed,
            delta,
        );
        camera.lookAt(focus.current * 0.45, LOOK_AT_HEIGHT, 0);
    });

    return null;
};

interface PedestalProps {
    color: string;
    speaker: 'ai' | 'user';
    order: number;
    sequenceRef: SequenceRef;
    energyRef: EnergyRef;
}

const Pedestal = ({ color, speaker, order, sequenceRef, energyRef }: PedestalProps) => {
    const ring = useRef<THREE.MeshStandardMaterial>(null);
    const light = useRef<THREE.PointLight>(null);

    useFrame((state, delta) => {
        const lit = flicker(sequenceTime(sequenceRef, state.clock.elapsedTime), RING_ON_AT + order * RING_STAGGER);
        const boost = energyRef.current[speaker] * 3;
        if (ring.current) {
            ring.current.emissiveIntensity = lit === 1
                ? damp(ring.current.emissiveIntensity, 1.3 + boost * 1.6, 8, delta)
                : lit * 2.4;
        }
        if (light.current) {
            light.current.intensity = damp(light.current.intensity, (5 + boost * 1.5) * lit, 8, delta);
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
                    emissiveIntensity={0}
                    toneMapped={false}
                />
            </mesh>
            <pointLight ref={light} color={color} intensity={0} distance={7} position={[0, 2.7, 1.6]} />
        </group>
    );
};

// Glowing beads that travel from the speaker to the listener
const SpeechStream = ({ energyRef }: Pick<StageRefs, 'energyRef'>) => {
    const beads = useRef<THREE.InstancedMesh>(null);
    const material = useRef<THREE.MeshBasicMaterial>(null);
    const direction = useRef(1);
    const offset = useRef(0);

    useFrame((state, delta) => {
        if (!beads.current || !material.current) return;

        const t = state.clock.elapsedTime;
        const { ai, user } = energyRef.current;
        if (ai > user + 0.02) direction.current = 1;
        else if (user > ai + 0.02) direction.current = -1;

        const loudness = Math.max(ai, user);
        const activity = Math.min(1, loudness / MIN_ENERGY);
        offset.current += delta * 0.32 * direction.current;
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
            streamDummy.scale.setScalar(Math.sin(Math.PI * u) * (0.03 + loudness * 0.045) * activity);
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

const FLOOR_VERTEX = /* glsl */ `
    varying vec3 vWorld;

    void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
    }
`;

// A grid floor where each voice sends rings rippling out from its speaker
const FLOOR_FRAGMENT = /* glsl */ `
    uniform float uTime;
    uniform float uAi;
    uniform float uUser;
    uniform vec2 uAiPosition;
    uniform vec2 uUserPosition;
    uniform vec3 uAiColor;
    uniform vec3 uUserColor;
    uniform vec3 uBackdrop;
    varying vec3 vWorld;

    float gridLine(vec2 point) {
        vec2 cell = abs(fract(point - 0.5) - 0.5) / fwidth(point);
        return 1.0 - min(min(cell.x, cell.y), 1.0);
    }

    vec3 voice(vec2 point, vec2 origin, vec3 color, float energy, float line) {
        float distanceFromSpeaker = length(point - origin);
        float rings = pow(sin(distanceFromSpeaker * 3.0 - uTime * 5.5) * 0.5 + 0.5, 5.0);
        float reach = exp(-distanceFromSpeaker * 0.3);
        vec3 ripple = color * rings * reach * energy * (0.3 + line * 1.6);
        vec3 pool = color * exp(-distanceFromSpeaker * distanceFromSpeaker * 0.4) * (0.05 + energy * 0.22);
        return ripple + pool;
    }

    void main() {
        vec2 point = vWorld.xz;
        float line = gridLine(point);

        vec3 color = vec3(0.004, 0.006, 0.016) + vec3(0.02, 0.035, 0.08) * line;
        color += voice(point, uAiPosition, uAiColor, uAi, line);
        color += voice(point, uUserPosition, uUserColor, uUser, line);

        float haze = smoothstep(11.0, 30.0, distance(vWorld, cameraPosition));
        gl_FragColor = vec4(mix(color, uBackdrop, haze), 1.0);
    }
`;

const ReactiveFloor = ({ energyRef }: Pick<StageRefs, 'energyRef'>) => {
    const material = useRef<THREE.ShaderMaterial>(null);
    const uniforms = useMemo(
        () => ({
            uTime: { value: 0 },
            uAi: { value: 0 },
            uUser: { value: 0 },
            uAiPosition: { value: new THREE.Vector2(-CHARACTER_OFFSET, 0) },
            uUserPosition: { value: new THREE.Vector2(CHARACTER_OFFSET, 0) },
            uAiColor: { value: new THREE.Color(AI_COLOR) },
            uUserColor: { value: new THREE.Color(USER_COLOR) },
            uBackdrop: { value: new THREE.Color(BACKDROP) },
        }),
        [],
    );

    useFrame((state) => {
        if (!material.current) return;
        material.current.uniforms.uTime.value = state.clock.elapsedTime;
        material.current.uniforms.uAi.value = energyRef.current.ai;
        material.current.uniforms.uUser.value = energyRef.current.user;
    });

    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[90, 90]} />
            <shaderMaterial ref={material} uniforms={uniforms} vertexShader={FLOOR_VERTEX} fragmentShader={FLOOR_FRAGMENT} />
        </mesh>
    );
};

const DUST_VERTEX = /* glsl */ `
    attribute float aSeed;
    uniform float uTime;
    uniform float uAi;
    uniform float uUser;
    uniform float uPixelRatio;
    varying float vSide;
    varying float vPulse;

    void main() {
        vec3 point = position;
        point.y = mod(point.y + uTime * (0.08 + aSeed * 0.14), ${DUST_HEIGHT.toFixed(1)}) + 0.15;
        point.x += sin(uTime * 0.5 + aSeed * 40.0) * 0.25;

        // Dust on the robot's side pulses with its voice, dust on the reader's side with theirs
        vSide = smoothstep(-2.5, 2.5, point.x);
        vPulse = mix(uAi, uUser, vSide) * (0.6 + 0.4 * sin(uTime * 12.0 + aSeed * 30.0));

        vec4 viewPoint = modelViewMatrix * vec4(point, 1.0);
        gl_Position = projectionMatrix * viewPoint;
        gl_PointSize = (22.0 + aSeed * 36.0) * (1.0 + vPulse * 1.2) * uPixelRatio / -viewPoint.z;
    }
`;

const DUST_FRAGMENT = /* glsl */ `
    uniform vec3 uAiColor;
    uniform vec3 uUserColor;
    varying float vSide;
    varying float vPulse;

    void main() {
        float glow = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5));
        vec3 color = mix(uAiColor, uUserColor, vSide) * (0.7 + vPulse * 2.6);
        gl_FragColor = vec4(color, glow * glow * (0.4 + vPulse * 0.5));
    }
`;

// Floating motes that swell and brighten with whoever is speaking
const ReactiveDust = ({ energyRef }: Pick<StageRefs, 'energyRef'>) => {
    const material = useRef<THREE.ShaderMaterial>(null);
    const uniforms = useMemo(
        () => ({
            uTime: { value: 0 },
            uAi: { value: 0 },
            uUser: { value: 0 },
            uPixelRatio: { value: 1 },
            uAiColor: { value: new THREE.Color(AI_COLOR) },
            uUserColor: { value: new THREE.Color(USER_COLOR) },
        }),
        [],
    );

    useFrame((state) => {
        if (!material.current) return;
        material.current.uniforms.uTime.value = state.clock.elapsedTime;
        material.current.uniforms.uAi.value = energyRef.current.ai;
        material.current.uniforms.uUser.value = energyRef.current.user;
        material.current.uniforms.uPixelRatio.value = state.viewport.dpr;
    });

    return (
        <points frustumCulled={false}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[dustPositions, 3]} />
                <bufferAttribute attach="attributes-aSeed" args={[dustSeeds, 1]} />
            </bufferGeometry>
            <shaderMaterial
                ref={material}
                uniforms={uniforms}
                vertexShader={DUST_VERTEX}
                fragmentShader={DUST_FRAGMENT}
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
};

// The book the two of them are talking about, projected between them
const FloatingBook = ({ coverURL, sequenceRef }: { coverURL?: string } & Pick<StageRefs, 'sequenceRef'>) => {
    const book = useRef<THREE.Group>(null);
    const ring = useRef<THREE.MeshStandardMaterial>(null);
    const beam = useRef<THREE.MeshBasicMaterial>(null);

    useFrame((state) => {
        const lit = flicker(sequenceTime(sequenceRef, state.clock.elapsedTime), RING_ON_AT + RING_STAGGER);
        if (book.current) {
            book.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.55;
        }
        if (ring.current) ring.current.emissiveIntensity = 2 * lit;
        if (beam.current) beam.current.opacity = 0.05 * lit;
    });

    return (
        <group position={[0, 0, -0.9]}>
            <mesh position={[0, PEDESTAL_HEIGHT / 2, 0]}>
                <cylinderGeometry args={[0.5, 0.58, PEDESTAL_HEIGHT, 48]} />
                <meshStandardMaterial color="#0f1730" metalness={0.85} roughness={0.3} />
            </mesh>
            <mesh position={[0, PEDESTAL_HEIGHT + 0.005, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.42, 0.018, 12, 64]} />
                <meshStandardMaterial
                    ref={ring}
                    color="#0d0a04"
                    emissive="#ffd9a0"
                    emissiveIntensity={0}
                    toneMapped={false}
                />
            </mesh>
            <mesh position={[0, PEDESTAL_HEIGHT + 0.85, 0]} rotation={[Math.PI, 0, 0]}>
                <coneGeometry args={[0.95, 1.7, 48, 1, true]} />
                <meshBasicMaterial
                    ref={beam}
                    color="#ffd9a0"
                    transparent
                    opacity={0}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                    blending={THREE.AdditiveBlending}
                />
            </mesh>

            <Float speed={2} rotationIntensity={0.25} floatIntensity={0.7}>
                <group ref={book} position={[0, 2.05, 0]}>
                    <Book3D coverURL={coverURL} />
                </group>
            </Float>
            <Sparkles count={36} scale={[2, 2.6, 1.4]} position={[0, 1.9, 0]} size={3} speed={0.35} color="#ffd9a0" />
        </group>
    );
};

// Shows the simple built-in figure if the detailed avatar file cannot be loaded
class AvatarBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
    state = { failed: false };

    static getDerivedStateFromError() {
        return { failed: true };
    }

    render() {
        return this.state.failed ? this.props.fallback : this.props.children;
    }
}

const ConversationStage = ({
    status,
    aiLevel,
    userLevel,
    userSpeaking,
    coverURL,
    aiMood = 'neutral',
    userMood = 'neutral',
    active = true,
}: ConversationStageProps) => {
    const [dpr, setDpr] = useState<number | [number, number]>(MAX_DPR);
    const sequenceRef = useRef<number | null>(null);
    const energyRef = useRef({ ai: 0, user: 0 });
    const dollyRef = useRef(0);

    const simpleHuman = <Human status={status} level={userLevel} speakingHint={userSpeaking} />;

    return (
        <Canvas
            dpr={dpr}
            frameloop={active ? 'always' : 'never'}
            // The composer does its own anti-aliasing, so the default framebuffer doesn't need it
            gl={{ antialias: false, powerPreference: 'high-performance' }}
            camera={{ fov: 35, near: 0.1, far: 90, position: CAMERA_ENTRANCE }}
            fallback={<p className="stage-fallback">3D view is not supported on this device.</p>}
        >
            <AdaptiveDpr onChange={setDpr} />
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

            <StageDriver
                status={status}
                aiLevel={aiLevel}
                userLevel={userLevel}
                userSpeaking={userSpeaking}
                sequenceRef={sequenceRef}
                energyRef={energyRef}
                dollyRef={dollyRef}
            />
            <CameraRig sequenceRef={sequenceRef} energyRef={energyRef} dollyRef={dollyRef} />

            <group position={[-CHARACTER_OFFSET, 0, 0]} rotation={[0, CHARACTER_TURN, 0]}>
                <Pedestal color={AI_COLOR} speaker="ai" order={0} sequenceRef={sequenceRef} energyRef={energyRef} />
                <group position={[0, PEDESTAL_HEIGHT, 0]}>
                    <Robot status={status} level={aiLevel} mood={aiMood} sequence={sequenceRef} />
                </group>
            </group>

            <group position={[CHARACTER_OFFSET, 0, 0]} rotation={[0, -CHARACTER_TURN, 0]}>
                <Pedestal color={USER_COLOR} speaker="user" order={2} sequenceRef={sequenceRef} energyRef={energyRef} />
                <group position={[0, PEDESTAL_HEIGHT, 0]}>
                    <AvatarBoundary fallback={simpleHuman}>
                        <Suspense fallback={simpleHuman}>
                            <AvatarHuman
                                status={status}
                                level={userLevel}
                                speakingHint={userSpeaking}
                                mood={userMood}
                            />
                        </Suspense>
                    </AvatarBoundary>
                </group>
            </group>

            <FloatingBook coverURL={coverURL} sequenceRef={sequenceRef} />
            <SpeechStream energyRef={energyRef} />

            <ReactiveFloor energyRef={energyRef} />
            <ReactiveDust energyRef={energyRef} />
            <Stars radius={45} depth={30} count={1400} factor={3.2} fade speed={0.6} />

            <EffectComposer multisampling={4}>
                <Bloom mipmapBlur intensity={0.95} luminanceThreshold={1} luminanceSmoothing={0.25} />
                <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
            </EffectComposer>
        </Canvas>
    );
};

export default ConversationStage;

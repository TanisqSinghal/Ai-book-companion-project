'use client';

import { useRef } from 'react';
import type { RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

import type { CallStatus } from '@/hooks/useVapi';
import type { Mood } from '@/lib/mood';
import { POWER_ON_AT, flicker, sequenceTime } from '@/components/stage/sequence';
import type { SequenceRef } from '@/components/stage/sequence';

export const AI_COLOR = '#5ee7ff';

const SHELL = '#e8edf5';
const JOINT = '#2a3550';
const VISOR = '#060a14';
const MOUTH_BARS = [-0.2, -0.1, 0, 0.1, 0.2];
const BLINK_EVERY = 4.2;
const BLINK_LENGTH = 0.12;
// Vapi volume events can lag the speech-start event; keep the mouth moving meanwhile
const MIN_SPEAKING_LEVEL = 0.3;

// How each mood reshapes the visor: per-eye size, a smile curve for the mouth, and a head pose
const MOODS: Record<Mood, { left: [number, number]; right: [number, number]; smile: number; grin: number; tilt: number; nod: number }> = {
    neutral: { left: [1, 1], right: [1, 1], smile: 0, grin: 0, tilt: 0, nod: 0 },
    happy: { left: [1.1, 1], right: [1.1, 1], smile: 1, grin: 1, tilt: 0, nod: 0.04 },
    curious: { left: [1.25, 1.25], right: [0.85, 0.65], smile: 0.2, grin: 0, tilt: 0.16, nod: 0 },
    surprised: { left: [1.25, 1.5], right: [1.25, 1.5], smile: -0.4, grin: 0, tilt: 0, nod: -0.13 },
};

const { damp } = THREE.MathUtils;

interface RobotProps {
    status: CallStatus;
    level: RefObject<number>;
    mood: Mood;
    sequence: SequenceRef;
}

const Robot = ({ status, level, mood, sequence }: RobotProps) => {
    const root = useRef<THREE.Group>(null);
    const head = useRef<THREE.Group>(null);
    const eyes = useRef<THREE.Group>(null);
    const lids = useRef<THREE.Group>(null);
    const mouth = useRef<THREE.Group>(null);
    const armLeft = useRef<THREE.Group>(null);
    const armRight = useRef<THREE.Group>(null);
    const foreLeft = useRef<THREE.Group>(null);
    const foreRight = useRef<THREE.Group>(null);
    const spinner = useRef<THREE.Mesh>(null);
    const core = useRef<THREE.MeshStandardMaterial>(null);
    const antenna = useRef<THREE.MeshStandardMaterial>(null);
    const thruster = useRef<THREE.MeshStandardMaterial>(null);
    const voice = useRef(0);
    const smile = useRef(0);

    useFrame((state, delta) => {
        const t = state.clock.elapsedTime;
        // Dark until the entrance sequence boots it, flickering as the power catches
        const power = flicker(sequenceTime(sequence, t), POWER_ON_AT);
        const powered = power > 0;

        const speaking = powered && status === 'speaking';
        const thinking = powered && status === 'thinking';
        const listening = powered && status === 'listening';
        const waking = powered && (status === 'connecting' || status === 'starting');
        const awake = powered && status !== 'idle';
        const look = MOODS[thinking || !powered ? 'neutral' : mood];

        voice.current = damp(
            voice.current,
            speaking ? Math.max(MIN_SPEAKING_LEVEL, level.current) : 0,
            14,
            delta,
        );
        const v = voice.current;

        if (root.current) {
            const hover = powered ? 0.5 + Math.sin(t * 1.4) * 0.07 : 0.34;
            root.current.position.y = damp(root.current.position.y, hover, 3, delta);
            root.current.rotation.z = powered ? Math.sin(t * 0.9) * 0.02 : 0;
        }

        if (head.current) {
            const turn = !powered ? 0 : listening ? 0.28 : thinking ? -0.25 : Math.sin(t * 0.5) * 0.12;
            const nod = !powered
                ? 0.42
                : thinking
                  ? -0.2
                  : (speaking ? Math.sin(t * 7) * 0.06 * v : listening ? 0.07 : 0) + look.nod;
            const tilt = (listening ? -0.13 : thinking ? 0.12 : 0) + look.tilt;
            head.current.rotation.y = damp(head.current.rotation.y, turn, 4, delta);
            head.current.rotation.x = damp(head.current.rotation.x, nod, 5, delta);
            head.current.rotation.z = damp(head.current.rotation.z, tilt, 4, delta);
        }

        if (eyes.current) {
            const blink = t % BLINK_EVERY < BLINK_LENGTH ? 0.1 : 1;
            const openness = blink * (thinking ? 0.5 : awake ? 1 : 0.7);
            eyes.current.position.x = damp(
                eyes.current.position.x,
                thinking ? Math.sin(t * 3) * 0.06 : 0,
                8,
                delta,
            );

            const glow = (waking ? 2 + Math.sin(t * 7) * 1.2 : awake ? 3 + v * 2.5 : 1.4) * power;
            eyes.current.children.forEach((eye, index) => {
                const [width, height] = index === 0 ? look.left : look.right;
                eye.scale.x = damp(eye.scale.x, width, 10, delta);
                eye.scale.y = damp(eye.scale.y, height * openness, 22, delta);

                const material = (eye as THREE.Mesh).material as THREE.MeshStandardMaterial;
                material.emissiveIntensity = powered ? damp(material.emissiveIntensity, glow, 12, delta) : 0;
            });
        }

        // Lower lids rise over the eyes to turn them into smiling arcs
        if (lids.current) {
            lids.current.children.forEach((lid) => {
                lid.scale.setScalar(damp(lid.scale.x, look.grin, 10, delta));
            });
        }

        if (mouth.current) {
            smile.current = damp(smile.current, look.smile, 8, delta);
            mouth.current.scale.x = damp(mouth.current.scale.x, mood === 'surprised' && powered ? 0.6 : 1, 8, delta);
            mouth.current.children.forEach((bar, index) => {
                const x = MOUTH_BARS[index];
                const wave = 0.5 + 0.5 * Math.abs(Math.sin(t * 13 + index * 1.3));
                bar.scale.y = 0.16 + v * wave * 2.4;
                bar.position.y = smile.current * ((x * x) / 0.04 - 0.5) * 0.06;
                ((bar as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = 2.6 * power;
            });
        }

        // Talk with the hands while speaking, rest them otherwise
        const lift = speaking ? 0.35 + v * 0.3 : 0.05;
        const bend = speaking ? 1 + v * 0.5 : thinking ? 0.5 : 0.15;
        if (armRight.current && foreRight.current) {
            armRight.current.rotation.x = damp(armRight.current.rotation.x, -lift, 5, delta);
            foreRight.current.rotation.x = damp(
                foreRight.current.rotation.x,
                -(bend + (speaking ? Math.sin(t * 3.2) * 0.3 : 0)),
                6,
                delta,
            );
        }
        if (armLeft.current && foreLeft.current) {
            armLeft.current.rotation.x = damp(armLeft.current.rotation.x, -lift * 0.7, 5, delta);
            foreLeft.current.rotation.x = damp(
                foreLeft.current.rotation.x,
                -(bend * 0.8 + (speaking ? Math.sin(t * 3.2 + 2) * 0.3 : 0)),
                6,
                delta,
            );
        }

        if (spinner.current) {
            spinner.current.rotation.z -= delta * (thinking ? 7 : waking ? 3 : 0.6) * power;
            (spinner.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 2 * power;
        }
        if (core.current) {
            const pulse = thinking ? 3 + Math.sin(t * 9) * 1.5 : awake ? 2.5 + v * 3 : 1.2 + Math.sin(t * 2) * 0.3;
            core.current.emissiveIntensity = powered ? damp(core.current.emissiveIntensity, pulse * power, 12, delta) : 0;
        }
        if (antenna.current) {
            const beacon = waking ? 2.5 + Math.sin(t * 10) * 2.5 : mood === 'surprised' ? 5 : awake ? 3 : 1;
            antenna.current.emissiveIntensity = beacon * power;
        }
        if (thruster.current) {
            thruster.current.emissiveIntensity = (2.2 + Math.sin(t * 5) * 0.5 + v) * Math.max(power, 0.25);
        }
    });

    return (
        <group ref={root} position={[0, 0.34, 0]}>
            {/* Hover thruster */}
            <mesh position={[0, 0.5, 0]}>
                <cylinderGeometry args={[0.36, 0.14, 0.42, 32]} />
                <meshStandardMaterial color={JOINT} metalness={0.8} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.2, 0.035, 16, 48]} />
                <meshStandardMaterial
                    ref={thruster}
                    color="#02131a"
                    emissive={AI_COLOR}
                    emissiveIntensity={0.5}
                    toneMapped={false}
                />
            </mesh>

            {/* Torso */}
            <RoundedBox args={[0.98, 0.92, 0.64]} radius={0.24} smoothness={6} position={[0, 1.15, 0]}>
                <meshStandardMaterial color={SHELL} metalness={0.55} roughness={0.22} />
            </RoundedBox>
            <mesh position={[0, 1.2, 0.325]}>
                <circleGeometry args={[0.13, 40]} />
                <meshStandardMaterial
                    ref={core}
                    color="#02131a"
                    emissive={AI_COLOR}
                    emissiveIntensity={0}
                    toneMapped={false}
                />
            </mesh>
            <mesh ref={spinner} position={[0, 1.2, 0.33]}>
                <torusGeometry args={[0.2, 0.018, 12, 48, Math.PI * 1.4]} />
                <meshStandardMaterial color="#02131a" emissive={AI_COLOR} emissiveIntensity={0} toneMapped={false} />
            </mesh>

            {/* Neck */}
            <mesh position={[0, 1.68, 0]}>
                <cylinderGeometry args={[0.12, 0.15, 0.2, 24]} />
                <meshStandardMaterial color={JOINT} metalness={0.8} roughness={0.3} />
            </mesh>

            {/* Head */}
            <group ref={head} position={[0, 2.15, 0]} rotation={[0.42, 0, 0]}>
                <RoundedBox args={[1.08, 0.82, 0.78]} radius={0.3} smoothness={6}>
                    <meshStandardMaterial color={SHELL} metalness={0.55} roughness={0.22} />
                </RoundedBox>
                <RoundedBox args={[0.86, 0.52, 0.12]} radius={0.06} smoothness={4} position={[0, 0, 0.36]}>
                    <meshStandardMaterial color={VISOR} metalness={0.9} roughness={0.12} />
                </RoundedBox>

                <group ref={eyes} position={[0, 0.07, 0.425]}>
                    <mesh position={[-0.2, 0, 0]}>
                        <capsuleGeometry args={[0.055, 0.07, 8, 16]} />
                        <meshStandardMaterial
                            color="#02131a"
                            emissive={AI_COLOR}
                            emissiveIntensity={0}
                            toneMapped={false}
                        />
                    </mesh>
                    <mesh position={[0.2, 0, 0]}>
                        <capsuleGeometry args={[0.055, 0.07, 8, 16]} />
                        <meshStandardMaterial
                            color="#02131a"
                            emissive={AI_COLOR}
                            emissiveIntensity={0}
                            toneMapped={false}
                        />
                    </mesh>
                </group>
                <group ref={lids} position={[0, -0.07, 0.495]}>
                    <mesh position={[-0.2, 0, 0]} scale={0}>
                        <circleGeometry args={[0.13, 32]} />
                        <meshBasicMaterial color={VISOR} />
                    </mesh>
                    <mesh position={[0.2, 0, 0]} scale={0}>
                        <circleGeometry args={[0.13, 32]} />
                        <meshBasicMaterial color={VISOR} />
                    </mesh>
                </group>

                <group ref={mouth} position={[0, -0.15, 0.425]}>
                    {MOUTH_BARS.map((x) => (
                        <mesh key={x} position={[x, 0, 0]} scale={[1, 0.16, 1]}>
                            <boxGeometry args={[0.055, 0.1, 0.02]} />
                            <meshStandardMaterial
                                color="#02131a"
                                emissive={AI_COLOR}
                                emissiveIntensity={0}
                                toneMapped={false}
                            />
                        </mesh>
                    ))}
                </group>

                {/* Ear discs */}
                {[-1, 1].map((side) => (
                    <mesh key={side} position={[side * 0.56, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                        <cylinderGeometry args={[0.17, 0.17, 0.08, 32]} />
                        <meshStandardMaterial color={JOINT} metalness={0.8} roughness={0.3} />
                    </mesh>
                ))}

                {/* Antenna */}
                <mesh position={[0, 0.52, 0]}>
                    <cylinderGeometry args={[0.018, 0.018, 0.26, 12]} />
                    <meshStandardMaterial color={JOINT} metalness={0.8} roughness={0.3} />
                </mesh>
                <mesh position={[0, 0.68, 0]}>
                    <sphereGeometry args={[0.06, 24, 24]} />
                    <meshStandardMaterial
                        ref={antenna}
                        color="#02131a"
                        emissive={AI_COLOR}
                        emissiveIntensity={0}
                        toneMapped={false}
                    />
                </mesh>
            </group>

            {/* Arms */}
            <group ref={armLeft} position={[-0.64, 1.42, 0]} rotation={[0, 0, -0.16]}>
                <mesh>
                    <sphereGeometry args={[0.15, 24, 24]} />
                    <meshStandardMaterial color={JOINT} metalness={0.8} roughness={0.3} />
                </mesh>
                <mesh position={[0, -0.26, 0]}>
                    <capsuleGeometry args={[0.095, 0.26, 8, 16]} />
                    <meshStandardMaterial color={SHELL} metalness={0.55} roughness={0.22} />
                </mesh>
                <group ref={foreLeft} position={[0, -0.5, 0]}>
                    <mesh position={[0, -0.2, 0]}>
                        <capsuleGeometry args={[0.085, 0.24, 8, 16]} />
                        <meshStandardMaterial color={SHELL} metalness={0.55} roughness={0.22} />
                    </mesh>
                    <mesh position={[0, -0.45, 0]}>
                        <sphereGeometry args={[0.115, 24, 24]} />
                        <meshStandardMaterial color={JOINT} metalness={0.8} roughness={0.3} />
                    </mesh>
                </group>
            </group>
            <group ref={armRight} position={[0.64, 1.42, 0]} rotation={[0, 0, 0.16]}>
                <mesh>
                    <sphereGeometry args={[0.15, 24, 24]} />
                    <meshStandardMaterial color={JOINT} metalness={0.8} roughness={0.3} />
                </mesh>
                <mesh position={[0, -0.26, 0]}>
                    <capsuleGeometry args={[0.095, 0.26, 8, 16]} />
                    <meshStandardMaterial color={SHELL} metalness={0.55} roughness={0.22} />
                </mesh>
                <group ref={foreRight} position={[0, -0.5, 0]}>
                    <mesh position={[0, -0.2, 0]}>
                        <capsuleGeometry args={[0.085, 0.24, 8, 16]} />
                        <meshStandardMaterial color={SHELL} metalness={0.55} roughness={0.22} />
                    </mesh>
                    <mesh position={[0, -0.45, 0]}>
                        <sphereGeometry args={[0.115, 24, 24]} />
                        <meshStandardMaterial color={JOINT} metalness={0.8} roughness={0.3} />
                    </mesh>
                </group>
            </group>
        </group>
    );
};

export default Robot;

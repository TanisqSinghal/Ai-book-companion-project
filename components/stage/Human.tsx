'use client';

import { useRef } from 'react';
import type { RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

import type { CallStatus } from '@/hooks/useVapi';

export const USER_COLOR = '#ffb454';

const SKIN = '#f0c39c';
const HAIR = '#2a1b14';
const SWEATER = '#d9772b';
const TROUSERS = '#1f2a44';
const SHOES = '#f4f1ea';
const HEADSET = '#161c2b';
const BLINK_EVERY = 3.6;
const BLINK_LENGTH = 0.13;
// Used when a live transcript is arriving but the mic level could not be measured
const HINTED_LEVEL = 0.35;

const { damp } = THREE.MathUtils;

const BOOM_FROM = new THREE.Vector3(0.44, -0.1, 0.1);
const BOOM_TO = new THREE.Vector3(0.17, -0.24, 0.41);
const BOOM_LENGTH = BOOM_FROM.distanceTo(BOOM_TO);
const BOOM_CENTER = BOOM_FROM.clone().lerp(BOOM_TO, 0.5);
const BOOM_ROTATION = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    BOOM_TO.clone().sub(BOOM_FROM).normalize(),
);

interface HumanProps {
    status: CallStatus;
    level: RefObject<number>;
    speakingHint: boolean;
}

const Human = ({ status, level, speakingHint }: HumanProps) => {
    const root = useRef<THREE.Group>(null);
    const torso = useRef<THREE.Group>(null);
    const head = useRef<THREE.Group>(null);
    const eyes = useRef<THREE.Group>(null);
    const mouth = useRef<THREE.Mesh>(null);
    const armLeft = useRef<THREE.Group>(null);
    const armRight = useRef<THREE.Group>(null);
    const foreLeft = useRef<THREE.Group>(null);
    const foreRight = useRef<THREE.Group>(null);
    const micTip = useRef<THREE.MeshStandardMaterial>(null);
    const voice = useRef(0);

    useFrame((state, delta) => {
        const t = state.clock.elapsedTime;
        const listening = status === 'listening';
        const aiSpeaking = status === 'speaking';

        const heard = listening ? Math.max(level.current, speakingHint ? HINTED_LEVEL : 0) : 0;
        voice.current = damp(voice.current, heard, 14, delta);
        const v = voice.current;
        const talking = v > 0.08;

        if (root.current) {
            root.current.rotation.z = Math.sin(t * 0.8 + 1) * 0.012;
        }
        if (torso.current) {
            const breath = 1 + Math.sin(t * 1.6) * 0.012;
            torso.current.scale.set(1, breath, breath);
        }

        if (head.current) {
            // Look across at the robot while it talks, nod along
            const turn = aiSpeaking ? -0.28 : talking ? -0.1 : Math.sin(t * 0.45 + 2) * 0.1;
            const nod = aiSpeaking ? 0.04 + Math.sin(t * 2.2) * 0.05 : talking ? Math.sin(t * 6) * 0.05 * v : 0;
            const tilt = aiSpeaking ? 0.08 : 0;
            head.current.rotation.y = damp(head.current.rotation.y, turn, 4, delta);
            head.current.rotation.x = damp(head.current.rotation.x, nod, 6, delta);
            head.current.rotation.z = damp(head.current.rotation.z, tilt, 4, delta);
        }

        if (eyes.current) {
            const blink = (t + 1.3) % BLINK_EVERY < BLINK_LENGTH ? 0.1 : 1;
            eyes.current.scale.y = damp(eyes.current.scale.y, blink, 28, delta);
        }

        if (mouth.current) {
            mouth.current.scale.y = damp(mouth.current.scale.y, 0.22 + v * 2.2, 22, delta);
            mouth.current.scale.x = damp(mouth.current.scale.x, 1 - v * 0.25, 22, delta);
        }

        const lift = talking ? 0.3 + v * 0.35 : 0.04;
        const bend = talking ? 0.95 + v * 0.5 : 0.12;
        if (armLeft.current && foreLeft.current) {
            armLeft.current.rotation.x = damp(armLeft.current.rotation.x, -lift, 5, delta);
            foreLeft.current.rotation.x = damp(
                foreLeft.current.rotation.x,
                -(bend + (talking ? Math.sin(t * 3.4) * 0.3 : 0)),
                6,
                delta,
            );
        }
        if (armRight.current && foreRight.current) {
            armRight.current.rotation.x = damp(armRight.current.rotation.x, -lift * 0.7, 5, delta);
            foreRight.current.rotation.x = damp(
                foreRight.current.rotation.x,
                -(bend * 0.8 + (talking ? Math.sin(t * 3.4 + 2) * 0.3 : 0)),
                6,
                delta,
            );
        }

        if (micTip.current) {
            micTip.current.emissiveIntensity = damp(
                micTip.current.emissiveIntensity,
                listening ? 1.8 + v * 4 : 0.3,
                10,
                delta,
            );
        }
    });

    return (
        <group ref={root}>
            {/* Legs */}
            {[-1, 1].map((side) => (
                <group key={side} position={[side * 0.21, 0, 0]}>
                    <mesh position={[0, 0.44, 0]}>
                        <capsuleGeometry args={[0.15, 0.5, 8, 16]} />
                        <meshStandardMaterial color={TROUSERS} roughness={0.8} />
                    </mesh>
                    <RoundedBox args={[0.27, 0.15, 0.44]} radius={0.065} smoothness={4} position={[0, 0.075, 0.08]}>
                        <meshStandardMaterial color={SHOES} roughness={0.6} />
                    </RoundedBox>
                </group>
            ))}
            <RoundedBox args={[0.84, 0.38, 0.5]} radius={0.17} smoothness={5} position={[0, 0.93, 0]}>
                <meshStandardMaterial color={TROUSERS} roughness={0.8} />
            </RoundedBox>

            {/* Torso */}
            <group ref={torso} position={[0, 1.43, 0]}>
                <RoundedBox args={[0.96, 0.9, 0.54]} radius={0.25} smoothness={6}>
                    <meshStandardMaterial color={SWEATER} roughness={0.85} />
                </RoundedBox>
                <mesh position={[0, 0.44, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[0.15, 0.05, 12, 32]} />
                    <meshStandardMaterial color={SWEATER} roughness={0.85} />
                </mesh>
            </group>

            {/* Neck */}
            <mesh position={[0, 1.94, 0]}>
                <cylinderGeometry args={[0.11, 0.12, 0.18, 24]} />
                <meshStandardMaterial color={SKIN} roughness={0.65} />
            </mesh>

            {/* Head */}
            <group ref={head} position={[0, 2.38, 0]}>
                <mesh scale={[1, 1.08, 1]}>
                    <sphereGeometry args={[0.42, 48, 48]} />
                    <meshStandardMaterial color={SKIN} roughness={0.65} />
                </mesh>
                <mesh position={[0, 0.04, -0.01]} rotation={[-0.5, 0, 0]} scale={[1, 1.06, 1]}>
                    <sphereGeometry args={[0.45, 48, 32, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
                    <meshStandardMaterial color={HAIR} roughness={0.9} side={THREE.DoubleSide} />
                </mesh>

                <group ref={eyes} position={[0, 0.05, 0.385]}>
                    <mesh position={[-0.15, 0, 0]}>
                        <sphereGeometry args={[0.046, 20, 20]} />
                        <meshStandardMaterial color="#1a1412" roughness={0.3} />
                    </mesh>
                    <mesh position={[0.15, 0, 0]}>
                        <sphereGeometry args={[0.046, 20, 20]} />
                        <meshStandardMaterial color="#1a1412" roughness={0.3} />
                    </mesh>
                </group>
                {[-1, 1].map((side) => (
                    <mesh key={side} position={[side * 0.15, 0.155, 0.385]} rotation={[0, 0, side * -0.12]}>
                        <boxGeometry args={[0.12, 0.024, 0.03]} />
                        <meshStandardMaterial color={HAIR} roughness={0.9} />
                    </mesh>
                ))}
                <mesh position={[0, -0.04, 0.42]}>
                    <sphereGeometry args={[0.042, 20, 20]} />
                    <meshStandardMaterial color="#e3ae84" roughness={0.65} />
                </mesh>
                <mesh ref={mouth} position={[0, -0.19, 0.38]} scale={[1, 0.22, 0.35]}>
                    <sphereGeometry args={[0.075, 24, 24]} />
                    <meshStandardMaterial color="#5a1f1f" roughness={0.5} />
                </mesh>

                {/* Headset */}
                <mesh>
                    <torusGeometry args={[0.475, 0.035, 12, 48, Math.PI]} />
                    <meshStandardMaterial color={HEADSET} metalness={0.6} roughness={0.35} />
                </mesh>
                {[-1, 1].map((side) => (
                    <group key={side} position={[side * 0.46, -0.02, 0]}>
                        <mesh rotation={[0, 0, Math.PI / 2]}>
                            <cylinderGeometry args={[0.15, 0.15, 0.12, 32]} />
                            <meshStandardMaterial color={HEADSET} metalness={0.6} roughness={0.35} />
                        </mesh>
                        <mesh position={[side * 0.065, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                            <torusGeometry args={[0.095, 0.014, 12, 40]} />
                            <meshStandardMaterial
                                color="#1a0f02"
                                emissive={USER_COLOR}
                                emissiveIntensity={2.2}
                                toneMapped={false}
                            />
                        </mesh>
                    </group>
                ))}
                <mesh position={BOOM_CENTER} quaternion={BOOM_ROTATION}>
                    <cylinderGeometry args={[0.012, 0.012, BOOM_LENGTH, 8]} />
                    <meshStandardMaterial color={HEADSET} metalness={0.6} roughness={0.35} />
                </mesh>
                <mesh position={BOOM_TO}>
                    <sphereGeometry args={[0.04, 16, 16]} />
                    <meshStandardMaterial
                        ref={micTip}
                        color="#1a0f02"
                        emissive={USER_COLOR}
                        emissiveIntensity={0.3}
                        toneMapped={false}
                    />
                </mesh>
            </group>

            {/* Arms */}
            <group ref={armLeft} position={[-0.6, 1.7, 0]} rotation={[0, 0, -0.14]}>
                <mesh>
                    <sphereGeometry args={[0.15, 24, 24]} />
                    <meshStandardMaterial color={SWEATER} roughness={0.85} />
                </mesh>
                <mesh position={[0, -0.26, 0]}>
                    <capsuleGeometry args={[0.105, 0.26, 8, 16]} />
                    <meshStandardMaterial color={SWEATER} roughness={0.85} />
                </mesh>
                <group ref={foreLeft} position={[0, -0.5, 0]}>
                    <mesh position={[0, -0.2, 0]}>
                        <capsuleGeometry args={[0.095, 0.24, 8, 16]} />
                        <meshStandardMaterial color={SWEATER} roughness={0.85} />
                    </mesh>
                    <mesh position={[0, -0.45, 0]}>
                        <sphereGeometry args={[0.105, 24, 24]} />
                        <meshStandardMaterial color={SKIN} roughness={0.65} />
                    </mesh>
                </group>
            </group>
            <group ref={armRight} position={[0.6, 1.7, 0]} rotation={[0, 0, 0.14]}>
                <mesh>
                    <sphereGeometry args={[0.15, 24, 24]} />
                    <meshStandardMaterial color={SWEATER} roughness={0.85} />
                </mesh>
                <mesh position={[0, -0.26, 0]}>
                    <capsuleGeometry args={[0.105, 0.26, 8, 16]} />
                    <meshStandardMaterial color={SWEATER} roughness={0.85} />
                </mesh>
                <group ref={foreRight} position={[0, -0.5, 0]}>
                    <mesh position={[0, -0.2, 0]}>
                        <capsuleGeometry args={[0.095, 0.24, 8, 16]} />
                        <meshStandardMaterial color={SWEATER} roughness={0.85} />
                    </mesh>
                    <mesh position={[0, -0.45, 0]}>
                        <sphereGeometry args={[0.105, 24, 24]} />
                        <meshStandardMaterial color={SKIN} roughness={0.65} />
                    </mesh>
                </group>
            </group>
        </group>
    );
};

export default Human;

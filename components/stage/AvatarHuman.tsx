'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';

import type { CallStatus } from '@/hooks/useVapi';
import type { Mood } from '@/lib/mood';

// CC0 character made with MakeHuman/MPFB, from the TalkingHead project's sample avatars
const MODEL_URL = '/assets/models/avatar.glb';
// Matches the robot's height on the stage
const TARGET_HEIGHT = 3.3;
const BLINK_EVERY = 3.6;
const BLINK_LENGTH = 0.16;
// Used when a live transcript is arriving but the mic level could not be measured
const HINTED_LEVEL = 0.35;

const POSED_BONES = [
    'Spine',
    'Spine2',
    'Neck',
    'Head',
    'LeftArm',
    'RightArm',
    'LeftForeArm',
    'RightForeArm',
] as const;
type BoneName = (typeof POSED_BONES)[number];

interface Rig {
    bones: Partial<Record<BoneName, THREE.Bone>>;
    rest: Partial<Record<BoneName, THREE.Quaternion>>;
    faces: THREE.Mesh[];
    weights: Record<string, number>;
}

const { damp } = THREE.MathUtils;
const offsetEuler = new THREE.Euler();
const offsetQuaternion = new THREE.Quaternion();
const targetQuaternion = new THREE.Quaternion();

// Bone offsets (radians) from the model's arms-out rest pose, tuned by eye for this rig.
// Left-side values; the right side mirrors them with the sign flipped.
const ARM_DROP = 0.68;
// Brings the elbows in against the body (same sign on both sides)
const ARM_TUCK = 0.3;
const FOREARM_DROP = 0.3;
const ARM_FORWARD = 0.3;
const FOREARM_BEND = 0.9;
const GESTURE_SWAY = 0.35;

// Sizes the model to the stage, stands it on the floor and collects what gets animated
const buildRig = (model: THREE.Object3D): Rig => {
    const rig: Rig = { bones: {}, rest: {}, faces: [], weights: {} };

    model.scale.setScalar(1);
    model.position.set(0, 0, 0);
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const scale = TARGET_HEIGHT / (bounds.max.y - bounds.min.y);
    model.scale.setScalar(scale);
    model.position.y = -bounds.min.y * scale;

    model.traverse((child) => {
        const bone = child as THREE.Bone;
        if (bone.isBone && (POSED_BONES as readonly string[]).includes(bone.name)) {
            const name = bone.name as BoneName;
            rig.bones[name] = bone;
            rig.rest[name] = bone.quaternion.clone();
        }

        const mesh = child as THREE.Mesh;
        if (mesh.isMesh) {
            // Skinned bounds do not follow the pose, so never cull the character
            mesh.frustumCulled = false;
            if (mesh.morphTargetDictionary) rig.faces.push(mesh);
        }
    });

    return rig;
};

// Rotates a bone away from its rest pose (radians, in the bone's own axes)
const turnBone = (rig: Rig, name: BoneName, x: number, y: number, z: number, lambda: number, delta: number) => {
    const bone = rig.bones[name];
    const rest = rig.rest[name];
    if (!bone || !rest) return;

    offsetQuaternion.setFromEuler(offsetEuler.set(x, y, z));
    targetQuaternion.copy(rest).multiply(offsetQuaternion);
    bone.quaternion.slerp(targetQuaternion, 1 - Math.exp(-lambda * delta));
};

// Eases a facial blend shape toward a weight on every mesh that has it (face, lashes, brows, teeth)
const setShape = (rig: Rig, name: string, target: number, lambda: number, delta: number) => {
    const weight = damp(rig.weights[name] ?? 0, target, lambda, delta);
    rig.weights[name] = weight;

    for (const face of rig.faces) {
        const index = face.morphTargetDictionary?.[name];
        if (index !== undefined && face.morphTargetInfluences) face.morphTargetInfluences[index] = weight;
    }
};

interface AvatarHumanProps {
    status: CallStatus;
    level: RefObject<number>;
    speakingHint: boolean;
    mood: Mood;
}

const AvatarHuman = ({ status, level, speakingHint, mood }: AvatarHumanProps) => {
    const { scene } = useGLTF(MODEL_URL);
    const model = useMemo(() => clone(scene), [scene]);
    const rig = useRef<Rig | null>(null);
    const voice = useRef(0);

    useEffect(() => {
        rig.current = buildRig(model);
    }, [model]);

    useFrame((state, delta) => {
        const body = rig.current;
        if (!body) return;

        const t = state.clock.elapsedTime;
        const listening = status === 'listening';
        const aiSpeaking = status === 'speaking';

        const heard = listening ? Math.max(level.current, speakingHint ? HINTED_LEVEL : 0) : 0;
        voice.current = damp(voice.current, heard, 14, delta);
        const v = voice.current;
        const talking = v > 0.08;

        // Mouth shapes cycle with loudness; this follows volume, not individual phonemes
        setShape(body, 'jawOpen', v * (0.18 + 0.16 * Math.abs(Math.sin(t * 9))), 24, delta);
        setShape(body, 'viseme_aa', v * 0.45 * Math.abs(Math.sin(t * 10.3)), 24, delta);
        setShape(body, 'viseme_O', v * 0.4 * Math.abs(Math.sin(t * 6.1 + 1)), 24, delta);
        setShape(body, 'viseme_E', v * 0.3 * Math.abs(Math.sin(t * 8.2 + 2)), 24, delta);

        const blink = (t + 1.3) % BLINK_EVERY < BLINK_LENGTH ? 1 : 0;
        setShape(body, 'eyeBlinkLeft', blink, 30, delta);
        setShape(body, 'eyeBlinkRight', blink, 30, delta);

        const smile = mood === 'happy' ? 0.75 : aiSpeaking ? 0.3 : 0.15;
        setShape(body, 'mouthSmileLeft', smile, 6, delta);
        setShape(body, 'mouthSmileRight', smile, 6, delta);
        setShape(body, 'cheekSquintLeft', mood === 'happy' ? 0.4 : 0, 6, delta);
        setShape(body, 'cheekSquintRight', mood === 'happy' ? 0.4 : 0, 6, delta);

        const surprised = mood === 'surprised' ? 1 : 0;
        const curious = mood === 'curious' ? 1 : 0;
        setShape(body, 'browInnerUp', surprised * 0.8 + curious * 0.35, 8, delta);
        setShape(body, 'browOuterUpLeft', surprised * 0.7, 8, delta);
        setShape(body, 'browOuterUpRight', surprised * 0.7 + curious * 0.7, 8, delta);
        setShape(body, 'browDownLeft', curious * 0.5, 8, delta);
        setShape(body, 'eyeWideLeft', surprised * 0.7, 8, delta);
        setShape(body, 'eyeWideRight', surprised * 0.7, 8, delta);

        // Lean in and look across at the robot while it talks; settle back otherwise
        const lean = aiSpeaking ? 0.1 : talking ? 0.04 : 0;
        turnBone(body, 'Spine', lean, 0, 0, 3, delta);
        turnBone(body, 'Spine2', Math.sin(t * 1.6) * 0.012, 0, 0, 6, delta);

        const turn = aiSpeaking ? -0.3 : talking ? -0.12 : Math.sin(t * 0.45 + 2) * 0.08;
        const nod = aiSpeaking ? 0.03 + Math.sin(t * 2.2) * 0.05 : talking ? Math.sin(t * 6) * 0.04 * v : 0;
        const tilt = (aiSpeaking ? 0.07 : 0) + curious * 0.12;
        turnBone(body, 'Neck', nod * 0.4, turn * 0.4, 0, 4, delta);
        turnBone(body, 'Head', nod - surprised * 0.08, turn * 0.6, tilt, 4, delta);

        // Arms hang at rest; while talking the hands come up in front and open and close with the words
        const gesture = talking ? 1 : 0;
        const leftOpen = gesture * (0.5 + 0.5 * Math.sin(t * 3.4)) * GESTURE_SWAY;
        const rightOpen = gesture * (0.5 + 0.5 * Math.sin(t * 3.4 + 1.7)) * GESTURE_SWAY;
        turnBone(body, 'LeftArm', ARM_TUCK, ARM_DROP, gesture * ARM_FORWARD, 5, delta);
        turnBone(body, 'RightArm', ARM_TUCK, -ARM_DROP, -gesture * ARM_FORWARD, 5, delta);
        turnBone(body, 'LeftForeArm', 0, FOREARM_DROP, gesture * FOREARM_BEND - leftOpen, 5, delta);
        turnBone(body, 'RightForeArm', 0, -FOREARM_DROP, -(gesture * FOREARM_BEND - rightOpen), 5, delta);
    });

    return <primitive object={model} />;
};

export default AvatarHuman;

'use client';

import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';

const BEATS_PER_SECOND = 1.1;
const SPIN_SPEED = 0.9;

// Classic bezier heart outline, extruded and bevelled so it catches the light
const createHeartGeometry = () => {
    const shape = new THREE.Shape();
    shape.moveTo(0.5, 0.5);
    shape.bezierCurveTo(0.5, 0.5, 0.4, 0, 0, 0);
    shape.bezierCurveTo(-0.6, 0, -0.6, 0.7, -0.6, 0.7);
    shape.bezierCurveTo(-0.6, 1.1, -0.3, 1.54, 0.5, 1.9);
    shape.bezierCurveTo(1.2, 1.54, 1.6, 1.1, 1.6, 0.7);
    shape.bezierCurveTo(1.6, 0.7, 1.6, 0, 1.0, 0);
    shape.bezierCurveTo(0.7, 0, 0.5, 0.5, 0.5, 0.5);

    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: 0.35,
        bevelEnabled: true,
        bevelThickness: 0.28,
        bevelSize: 0.22,
        bevelSegments: 12,
        curveSegments: 48,
    });
    geometry.center();
    // The outline is drawn point-up; flip it so the heart sits the right way round
    geometry.rotateZ(Math.PI);
    return geometry;
};

const Heart = () => {
    const mesh = useRef<THREE.Mesh>(null);
    const geometry = useMemo(() => createHeartGeometry(), []);

    useFrame(({ clock }) => {
        if (!mesh.current) return;
        const t = clock.getElapsedTime();
        // Two quick pulses per beat, like a real heartbeat
        const phase = (t * BEATS_PER_SECOND) % 1;
        const pulse = Math.exp(-Math.pow((phase - 0.1) * 14, 2)) * 0.09 + Math.exp(-Math.pow((phase - 0.32) * 14, 2)) * 0.05;
        mesh.current.scale.setScalar(1 + pulse);
        mesh.current.rotation.y = Math.sin(t * SPIN_SPEED) * 0.6;
        mesh.current.rotation.x = Math.sin(t * 0.7) * 0.12;
    });

    return (
        <mesh ref={mesh} geometry={geometry} scale={1}>
            <meshPhysicalMaterial
                color="#ff2d55"
                emissive="#7a0020"
                emissiveIntensity={0.35}
                metalness={0.35}
                roughness={0.12}
                clearcoat={1}
                clearcoatRoughness={0.04}
                sheen={1}
                sheenColor="#ff9ab0"
            />
        </mesh>
    );
};

// A small spinning, beating, glossy 3D heart
const ShinyHeart = () => (
    <Canvas
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true }}
        camera={{ position: [0, 0, 4.2], fov: 40 }}
        style={{ background: 'transparent' }}
    >
        <ambientLight intensity={0.4} />
        <pointLight position={[3, 3, 4]} intensity={30} color="#ffffff" />
        <pointLight position={[-3, -1, 3]} intensity={18} color="#ff7aa2" />
        <Heart />
        {/* Light panels for reflections, built in code so nothing is fetched at runtime */}
        <Environment resolution={64}>
            <Lightformer form="rect" intensity={3} position={[0, 2, 3]} scale={[4, 1.2, 1]} />
            <Lightformer form="rect" intensity={1.5} color="#5ee7ff" position={[-3, 0, 1]} scale={[1, 3, 1]} />
            <Lightformer form="ring" intensity={2} color="#ffb454" position={[3, -1, 2]} scale={1.5} />
        </Environment>
    </Canvas>
);

export default ShinyHeart;

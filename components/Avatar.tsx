
import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AssistantState, Emotion, Gender } from '../types';

interface AssistantHeadProps {
  state: AssistantState;
  emotion: Emotion;
  volume: number;
  cameraActive: boolean;
  gender: Gender;
}

const AIHumanHead: React.FC<AssistantHeadProps> = ({ state, emotion, volume, cameraActive, gender }) => {
  const headGroupRef = useRef<THREE.Group>(null);
  const lipUpperRef = useRef<THREE.Mesh>(null);
  const lipLowerRef = useRef<THREE.Mesh>(null);
  const eyeLeftRef = useRef<THREE.Mesh>(null);
  const eyeRightRef = useRef<THREE.Mesh>(null);
  const hairRef = useRef<THREE.Group>(null);
  const shellRef = useRef<THREE.Mesh>(null);

  const targetJawOpen = useRef(0);
  const targetEyeOpen = useRef(1);
  const targetHeadRot = useRef(new THREE.Euler());

  const hairStrands = useMemo(() => {
    const strands = [];
    const count = gender === 'FEMALE' ? 50 : 20;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      strands.push({
        radius: 1.02,
        angle,
        speed: 0.4 + Math.random() * 0.8,
        length: gender === 'FEMALE' ? 1.8 + Math.random() : 0.4 + Math.random(),
        thickness: 0.01 + Math.random() * 0.01
      });
    }
    return strands;
  }, [gender]);

  useFrame((stateCtx) => {
    const t = stateCtx.clock.getElapsedTime();

    if (headGroupRef.current) {
      // Audio2Face Organic Sway
      const swayX = Math.sin(t * 0.5) * 0.06;
      const swayY = Math.cos(t * 0.4) * 0.04;
      
      if (state === AssistantState.SPEAKING) {
        const intensity = 0.15 + volume * 0.6;
        targetHeadRot.current.set(
          Math.sin(t * 12) * intensity * 0.15,
          Math.cos(t * 8) * intensity * 0.2,
          Math.sin(t * 5) * 0.04
        );
      } else if (state === AssistantState.LISTENING) {
        targetHeadRot.current.set(0.12, Math.sin(t * 0.6) * 0.15, 0);
      } else if (state === AssistantState.THINKING) {
        targetHeadRot.current.set(-0.2, 0.4, 0.1);
      } else {
        targetHeadRot.current.set(0, 0, 0);
      }

      headGroupRef.current.rotation.x = THREE.MathUtils.lerp(headGroupRef.current.rotation.x, targetHeadRot.current.x + swayX, 0.12);
      headGroupRef.current.rotation.y = THREE.MathUtils.lerp(headGroupRef.current.rotation.y, targetHeadRot.current.y, 0.12);
      headGroupRef.current.position.y = THREE.MathUtils.lerp(headGroupRef.current.position.y, swayY, 0.08);
    }

    // Advanced Lip Sync logic
    if (state === AssistantState.SPEAKING) {
      targetJawOpen.current = volume * 1.8;
    } else {
      targetJawOpen.current = emotion === 'HAPPY' ? 0.25 : 0;
    }

    // Move lower lip based on audio volume to simulate speaking
    if (lipLowerRef.current) lipLowerRef.current.position.y = THREE.MathUtils.lerp(lipLowerRef.current.position.y, -0.41 - targetJawOpen.current * 0.18, 0.45);
    
    // Blinking & Expressions
    let blink = (t % 5) > 4.85 || (t % 8 > 7.7) ? 0.02 : 1;
    if (emotion === 'SURPRISED') blink = 1.6;
    targetEyeOpen.current = blink;

    if (eyeLeftRef.current) eyeLeftRef.current.scale.y = THREE.MathUtils.lerp(eyeLeftRef.current.scale.y, targetEyeOpen.current, 0.4);
    if (eyeRightRef.current) eyeRightRef.current.scale.y = THREE.MathUtils.lerp(eyeRightRef.current.scale.y, targetEyeOpen.current, 0.4);

    // Hair Physics
    if (hairRef.current) {
      hairRef.current.children.forEach((strand, i) => {
        const config = hairStrands[i];
        strand.rotation.z = Math.sin(t * config.speed + i) * 0.15;
        strand.rotation.x = Math.cos(t * config.speed) * 0.1;
      });
    }

    // Emissive Core Pulse
    const themeColor = gender === 'FEMALE' ? 0xff0088 : 0x00ddee;
    if (shellRef.current) {
      const mat = shellRef.current.material as THREE.MeshStandardMaterial;
      mat.emissive.setHex(themeColor);
      mat.emissiveIntensity = state === AssistantState.SPEAKING ? 0.5 + volume * 3.5 : 0.1;
    }
  });

  const skinColor = "#010206";
  const glowColor = gender === 'FEMALE' ? "#ff0088" : "#00ddee";

  return (
    <group ref={headGroupRef}>
      {/* Bio-Digital Shell */}
      <mesh ref={shellRef}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial color={skinColor} metalness={1} roughness={0.02} />
      </mesh>

      {/* Cyber Eyes */}
      <mesh ref={eyeLeftRef} position={[-0.35, 0.26, 0.91]}>
        <sphereGeometry args={[0.095, 32, 32]} />
        <meshBasicMaterial color={glowColor} />
      </mesh>
      <mesh ref={eyeRightRef} position={[0.35, 0.26, 0.91]}>
        <sphereGeometry args={[0.095, 32, 32]} />
        <meshBasicMaterial color={glowColor} />
      </mesh>

      {/* Reactive Lips */}
      <mesh ref={lipUpperRef} position={[0, -0.36, 0.97]}>
        <boxGeometry args={[0.42, 0.025, 0.02]} />
        <meshBasicMaterial color={glowColor} />
      </mesh>
      <mesh ref={lipLowerRef} position={[0, -0.41, 0.97]}>
        <boxGeometry args={[0.42, 0.025, 0.02]} />
        <meshBasicMaterial color={glowColor} />
      </mesh>

      {/* Neural Tendrils (Hair) */}
      <group ref={hairRef}>
        {hairStrands.map((s, i) => (
          <mesh key={i} position={[
            Math.cos(s.angle) * s.radius,
            0.6,
            Math.sin(s.angle) * s.radius * 0.7
          ]}>
            <boxGeometry args={[s.thickness, s.length, 0.01]} />
            <meshStandardMaterial color={glowColor} transparent opacity={0.4} />
          </mesh>
        ))}
      </group>

      {/* Data Ring */}
      <mesh rotation={[Math.PI / 2.05, 0, 0]} position={[0, 0, 0]}>
        <torusGeometry args={[1.45, 0.003, 16, 120]} />
        <meshBasicMaterial color={glowColor} transparent opacity={0.15} />
      </mesh>
    </group>
  );
};

export const Avatar: React.FC<{ state: AssistantState; emotion: Emotion; volume: number; cameraActive: boolean; gender: Gender }> = ({ state, emotion, volume, cameraActive, gender }) => {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas 
        camera={{ position: [0, 0, 3.2], fov: 40 }} 
        dpr={[1, 2]} 
        gl={{ alpha: true }}
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={1.5} />
        <pointLight position={[5, 5, 5]} intensity={2.5} />
        <pointLight position={[-5, -2, 5]} color={gender === 'FEMALE' ? "#ff0088" : "#00ddee"} intensity={2} />
        <spotLight position={[0, 5, 2]} angle={0.6} penumbra={1} intensity={3} />
        <AIHumanHead state={state} emotion={emotion} volume={volume} cameraActive={cameraActive} gender={gender} />
      </Canvas>
    </div>
  );
};

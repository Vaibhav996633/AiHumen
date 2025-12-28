
import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AssistantState, Emotion, Gender } from '../../types';

interface AssistantHeadProps {
  state: AssistantState;
  emotion: Emotion;
  volume: number;
  cameraActive: boolean;
  gender: Gender;
}

const NeuralHumanoid: React.FC<AssistantHeadProps> = ({ state, emotion, volume, gender }) => {
  const headGroupRef = useRef<THREE.Group>(null);
  const shellRef = useRef<THREE.Mesh>(null);
  
  const lipUpperRef = useRef<THREE.Group>(null);
  const lipLowerRef = useRef<THREE.Group>(null);
  
  const eyeLRef = useRef<THREE.Group>(null);
  const eyeRRef = useRef<THREE.Group>(null);
  const pupilLRef = useRef<THREE.Mesh>(null);
  const pupilRRef = useRef<THREE.Mesh>(null);
  
  const browLRef = useRef<THREE.Mesh>(null);
  const browRRef = useRef<THREE.Mesh>(null);
  const hairGroupRef = useRef<THREE.Group>(null);

  const accentColor = gender === 'FEMALE' ? "#ff0088" : "#00ddee";
  const skinColor = "#020308";

  const targetJawOpen = useRef(0);
  const targetMouthWidth = useRef(1);
  const targetPupilPos = useRef(new THREE.Vector2(0, 0));

  const hairStrands = useMemo(() => {
    const strands = [];
    const count = gender === 'FEMALE' ? 120 : 40;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      strands.push({
        radius: 1.0,
        angle,
        speed: 0.1 + Math.random() * 0.3,
        length: gender === 'FEMALE' ? 2.5 : 0.6,
        thickness: 0.005 + Math.random() * 0.005,
        yPos: gender === 'FEMALE' ? 0.35 : 0.65
      });
    }
    return strands;
  }, [gender]);

  useFrame((stateCtx) => {
    const t = stateCtx.clock.getElapsedTime();

    if (headGroupRef.current) {
      const swayX = Math.sin(t * 0.4) * 0.03;
      const swayY = Math.cos(t * 0.3) * 0.02;
      
      let rotX = swayX;
      let rotY = swayY;

      if (state === AssistantState.SPEAKING) {
        rotX += Math.sin(t * 12) * volume * 0.15;
        rotY += Math.cos(t * 10) * volume * 0.18;
      } else if (state === AssistantState.LISTENING) {
        rotY += Math.sin(t * 0.5) * 0.1;
      } else if (state === AssistantState.THINKING) {
        rotX -= 0.15;
        rotY += Math.cos(t * 0.25) * 0.4;
      }

      if (emotion === 'ANGRY') {
        rotX += Math.sin(t * 25) * 0.02;
        rotY += Math.cos(t * 25) * 0.02;
      }

      headGroupRef.current.rotation.x = THREE.MathUtils.lerp(headGroupRef.current.rotation.x, rotX, 0.1);
      headGroupRef.current.rotation.y = THREE.MathUtils.lerp(headGroupRef.current.rotation.y, rotY, 0.1);
      headGroupRef.current.position.y = THREE.MathUtils.lerp(headGroupRef.current.position.y, Math.sin(t * 0.5) * 0.05, 0.05);
    }

    targetMouthWidth.current = 1.0;
    if (emotion === 'HAPPY') targetMouthWidth.current = 1.3;
    if (emotion === 'ANGRY') targetMouthWidth.current = 0.85;

    if (state === AssistantState.SPEAKING) {
      targetJawOpen.current = volume * 2.5;
      targetMouthWidth.current = 1.0 - (volume * 0.3); 
    } else {
      targetJawOpen.current = emotion === 'HAPPY' ? 0.15 : (emotion === 'ANGRY' ? 0.05 : 0);
    }

    if (lipLowerRef.current) {
      lipLowerRef.current.position.y = THREE.MathUtils.lerp(lipLowerRef.current.position.y, -0.42 - targetJawOpen.current * 0.18, 0.3);
      lipLowerRef.current.scale.x = THREE.MathUtils.lerp(lipLowerRef.current.scale.x, targetMouthWidth.current, 0.2);
    }
    if (lipUpperRef.current) {
      lipUpperRef.current.scale.x = THREE.MathUtils.lerp(lipUpperRef.current.scale.x, targetMouthWidth.current, 0.2);
    }

    if (t % 3 > 2.8) {
      targetPupilPos.current.set((Math.random() - 0.5) * 0.04, (Math.random() - 0.5) * 0.04);
    }
    if (pupilLRef.current) {
      pupilLRef.current.position.x = THREE.MathUtils.lerp(pupilLRef.current.position.x, targetPupilPos.current.x, 0.1);
      pupilLRef.current.position.y = THREE.MathUtils.lerp(pupilLRef.current.position.y, targetPupilPos.current.y, 0.1);
    }
    if (pupilRRef.current) {
      pupilRRef.current.position.x = THREE.MathUtils.lerp(pupilRRef.current.position.x, targetPupilPos.current.x, 0.1);
      pupilRRef.current.position.y = THREE.MathUtils.lerp(pupilRRef.current.position.y, targetPupilPos.current.y, 0.1);
    }

    const isBlinking = (t % 5 > 4.88) || (t % 9.2 > 9.1);
    let eyeScaleY = isBlinking ? 0.01 : 1.0;
    if (emotion === 'ANGRY') eyeScaleY *= 0.75;

    if (eyeLRef.current) eyeLRef.current.scale.y = THREE.MathUtils.lerp(eyeLRef.current.scale.y, eyeScaleY, 0.4);
    if (eyeRRef.current) eyeRRef.current.scale.y = THREE.MathUtils.lerp(eyeRRef.current.scale.y, eyeScaleY, 0.4);

    let browY = 0.48;
    let browRotZ = gender === 'MALE' ? -0.05 : 0.05;

    if (emotion === 'HAPPY') browY = 0.55;
    if (emotion === 'SAD') browY = 0.44;
    if (emotion === 'SURPRISED') browY = 0.65;
    if (state === AssistantState.THINKING) browY = 0.45;
    
    if (emotion === 'ANGRY') {
      browY = 0.42;
      browRotZ = gender === 'MALE' ? 0.15 : -0.15;
    }

    if (browLRef.current) {
      browLRef.current.position.y = THREE.MathUtils.lerp(browLRef.current.position.y, browY, 0.1);
      browLRef.current.rotation.z = THREE.MathUtils.lerp(browLRef.current.rotation.z, browRotZ, 0.1);
    }
    if (browRRef.current) {
      browRRef.current.position.y = THREE.MathUtils.lerp(browRRef.current.position.y, browY, 0.1);
      browRRef.current.rotation.z = THREE.MathUtils.lerp(browRRef.current.rotation.z, -browRotZ, 0.1);
    }

    if (shellRef.current) {
      const mat = shellRef.current.material as THREE.MeshStandardMaterial;
      const baseEmissive = emotion === 'ANGRY' ? 0.15 : 0.05;
      mat.emissiveIntensity = state === AssistantState.SPEAKING ? 0.2 + volume * 2.5 : baseEmissive;
    }
  });

  return (
    <group ref={headGroupRef}>
      <mesh position={[0, -1.3, -0.15]}>
        <cylinderGeometry args={[0.38, 0.52, 1, 32]} />
        <meshStandardMaterial color={skinColor} metalness={0.9} roughness={0.3} />
      </mesh>

      <mesh ref={shellRef} scale={[1, 1.25, 0.95]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial 
          color={skinColor} 
          metalness={0.6} 
          roughness={0.2} 
          emissive={accentColor}
          emissiveIntensity={0.05}
        />
      </mesh>

      <mesh ref={browLRef} position={[-0.35, 0.48, 0.9]}>
        <boxGeometry args={[0.32, 0.025, 0.05]} />
        <meshBasicMaterial color={accentColor} />
      </mesh>
      <mesh ref={browRRef} position={[0.35, 0.48, 0.9]}>
        <boxGeometry args={[0.32, 0.025, 0.05]} />
        <meshBasicMaterial color={accentColor} />
      </mesh>

      <group ref={eyeLRef} position={[-0.35, 0.28, 0.92]}>
        <mesh>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color="#fff" roughness={0.1} />
        </mesh>
        <mesh ref={pupilLRef} position={[0, 0, 0.08]}>
          <sphereGeometry args={[0.045, 16, 16]} />
          <meshBasicMaterial color={accentColor} />
        </mesh>
      </group>
      <group ref={eyeRRef} position={[0.35, 0.28, 0.92]}>
        <mesh>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color="#fff" roughness={0.1} />
        </mesh>
        <mesh ref={pupilRRef} position={[0, 0, 0.08]}>
          <sphereGeometry args={[0.045, 16, 16]} />
          <meshBasicMaterial color={accentColor} />
        </mesh>
      </group>

      <group ref={lipUpperRef} position={[0, -0.38, 0.98]}>
         <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.18, 0.012, 8, 32, Math.PI]} />
            <meshBasicMaterial color={accentColor} />
         </mesh>
      </group>
      <group ref={lipLowerRef} position={[0, -0.42, 0.98]}>
         <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.18, 0.012, 8, 32, Math.PI]} />
            <meshBasicMaterial color={accentColor} />
         </mesh>
      </group>

      <group ref={hairGroupRef} position={[0, 0.4, -0.1]}>
        {hairStrands.map((s, i) => (
          <mesh key={i} position={[
            Math.cos(s.angle) * s.radius,
            s.yPos,
            Math.sin(s.angle) * s.radius * 0.85
          ]} rotation={[0, 0, s.angle]}>
            <boxGeometry args={[s.thickness, s.length, 0.012]} />
            <meshStandardMaterial 
              color={accentColor} 
              transparent 
              opacity={0.35} 
            />
          </mesh>
        ))}
      </group>

      <group rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        {[...Array(3)].map((_, i) => (
          <mesh key={i} position={[0, 0, i * -0.4]}>
            <torusGeometry args={[1.5 + i * 0.3, 0.004, 8, 64]} />
            <meshBasicMaterial color={accentColor} transparent opacity={0.15 - i * 0.03} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

export const Avatar3D: React.FC<{ state: AssistantState; emotion: Emotion; volume: number; cameraActive: boolean; gender: Gender }> = (props) => {
  const accentColor = props.gender === 'FEMALE' ? "#ff0088" : "#00ddee";
  
  return (
    <div className="absolute inset-0 z-0 bg-[#010206]">
      <Canvas 
        camera={{ position: [0, 0.2, 3.8], fov: 36 }} 
        dpr={[1, 2]} 
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{ width: '100%', height: '100%' }}
      >
        <color attach="background" args={["#010206"]} />
        <ambientLight intensity={1.0} />
        <directionalLight position={[0, 5, 5]} intensity={1.5} />
        <pointLight position={[-5, 2, 5]} color={accentColor} intensity={2.0} />
        <NeuralHumanoid {...props} />
      </Canvas>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[120vw] rounded-full blur-[140px] pointer-events-none opacity-20" 
           style={{ background: `radial-gradient(circle, ${accentColor}44 0%, transparent 70%)` }} />
    </div>
  );
};

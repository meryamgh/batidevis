// Window.tsx
import React from 'react';
import { MeshProps } from '@react-three/fiber';

interface WindowProps extends MeshProps {
  height: number;
  width: number;
  numSashes: number;
  sashType: string;
}

const Window: React.FC<WindowProps> = ({ height, width, numSashes }) => {
  // Conversion des dimensions en mètres
  const height_m = height / 1000;
  const width_m = width / 1000;
  const depth_m = 0.05; // Profondeur fixe de 50 mm

  // Épaisseurs
  const frameThickness = 0.05;
  const glassThickness = 0.01;
  const barThickness = 0.02;

  // Calcul des dimensions internes
  const glassWidth = width_m - 2 * frameThickness;
  const glassHeight = height_m - 2 * frameThickness;

  return (
    <group>
      {/* Cadre de la fenêtre */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[width_m, depth_m, height_m]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>

      {/* Vitrage */}
      <mesh position={[0, (glassThickness - depth_m) / 2, 0]}>
        <boxGeometry args={[glassWidth, glassThickness, glassHeight]} />
        <meshStandardMaterial color="#87CEEB" transparent opacity={0.7} />
      </mesh>

      {/* Montant central si nécessaire */}
      {numSashes === 2 && (
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[barThickness, depth_m, glassHeight]} />
          <meshStandardMaterial color="#8B4513" />
        </mesh>
      )}
    </group>
  );
};

export default Window;

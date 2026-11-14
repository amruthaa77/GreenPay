import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import {
  createCanopyMaterial,
  createChassisMaterial,
  createElevatedChassisMaterial,
  createSteelMaterial,
  createScalePlateMaterial,
  createPlinthMaterial,
  createLimeEmissiveMaterial,
  createSoftWhiteMaterial,
  createLaserLineMaterial,
  createAcrylicGlassMaterial,
  createOledScreenMaterial,
  createAluminiumCompartmentMaterial,
  createPETCompartmentMaterial,
  createPlasticsCompartmentMaterial,
  createNewspaperCompartmentMaterial,
  createCardboardCompartmentMaterial,
  createGlassCompartmentMaterial,
  createTextilesCompartmentMaterial,
  createMixedPaperCompartmentMaterial,
} from './StationMaterials';

export interface StationAnimationData {
  stationRotY: number;
  categoryHighlight: number;     // 0 -> 1 (glow on 8 compartment badges)
  segregationProgress: number;   // 0 -> 1 (3D recyclables moving into chutes)
  scaleWeightProgress: number;   // 0 -> 1 (digital scale activation)
  cardScanProgress: number;      // 0 -> 1 (citizen QR card approach)
  laserScanY: number;            // -0.15 -> 0.15 (scanner sweep)
  laserScanOpacity: number;      // 0 -> 1
  qrVerifiedGlow: number;        // 0 -> 1 (scanner success bezel)
  gpCalculationProgress: number; // 0 -> 1 (points display math)
  gpCoinScale: number;           // 0 -> 1 (3D Green Points coin expansion)
  gpCoinRotY: number;            // 0 -> Math.PI * 4
  gpCoinLift: number;            // 0 -> 0.6
  reassemblyProgress: number;    // 0 -> 1 (monolithic lock)
  camX: number;
  camY: number;
  camZ: number;
  targetX: number;
  targetY: number;
  targetZ: number;
}

interface ModularStationProps {
  animRef: React.MutableRefObject<StationAnimationData>;
  isMobile?: boolean;
}

// Helper to create crisp procedural canvas text textures for realistic hardware labels
function createLabelTexture(
  category: string,
  rate: string,
  accentColor: string,
  subtext: string = 'DRY RECYCLABLE'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = '#062B20';
  ctx.fillRect(0, 0, 512, 192);

  // Border & Accent bar
  ctx.fillStyle = accentColor;
  ctx.fillRect(0, 0, 16, 192);
  ctx.fillRect(0, 184, 512, 8);

  // Subtle grid line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  ctx.strokeRect(16, 0, 496, 184);

  // Subtext
  ctx.font = 'bold 20px "JetBrains Mono", monospace';
  ctx.fillStyle = '#A7B9A8';
  ctx.fillText(subtext.toUpperCase(), 36, 42);

  // Main Category Name
  ctx.font = 'bold 36px "Inter", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(category, 36, 95);

  // Official Earning Rate Badge
  ctx.fillStyle = '#D7FF35';
  ctx.font = 'bold 32px "JetBrains Mono", monospace';
  ctx.fillText(rate, 36, 150);

  // Checkmark / Verification Icon circle
  ctx.strokeStyle = '#D7FF35';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(450, 95, 24, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#D7FF35';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('✓', 442, 103);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  return tex;
}

export const ModularStation: React.FC<ModularStationProps> = ({ animRef, isMobile = false }) => {
  // Memoize materials once per component lifecycle
  const materials = useMemo(
    () => ({
      plinth: createPlinthMaterial(),
      canopy: createCanopyMaterial(),
      chassis: createChassisMaterial(),
      elevated: createElevatedChassisMaterial(),
      steel: createSteelMaterial(),
      scalePlate: createScalePlateMaterial(),
      limeEmissive: createLimeEmissiveMaterial(2.5),
      limeSubtle: createLimeEmissiveMaterial(1.0),
      softWhite: createSoftWhiteMaterial(),
      laser: createLaserLineMaterial(),
      acrylic: createAcrylicGlassMaterial(),
      oled: createOledScreenMaterial(),
      aluminium: createAluminiumCompartmentMaterial(),
      pet: createPETCompartmentMaterial(),
      plastics: createPlasticsCompartmentMaterial(),
      newspaper: createNewspaperCompartmentMaterial(),
      cardboard: createCardboardCompartmentMaterial(),
      glass: createGlassCompartmentMaterial(),
      textiles: createTextilesCompartmentMaterial(),
      mixedPaper: createMixedPaperCompartmentMaterial(),
    }),
    []
  );

  // Generate crisp procedural labels for the 8 official dry categories
  const labelTextures = useMemo(() => {
    if (typeof document === 'undefined') return [];
    return [
      createLabelTexture('Aluminium & Metal', '22 GP / kg', '#94A3B8'),
      createLabelTexture('PET Bottles', '18 GP / kg', '#0284C7'),
      createLabelTexture('Other Recyclable Plastics', '15 GP / kg', '#0D9488'),
      createLabelTexture('Newspapers & Magazines', '10 GP / kg', '#64748B'),
      createLabelTexture('Cardboard', '10 GP / kg', '#B45309'),
      createLabelTexture('Glass Bottles', '8 GP / kg', '#059669'),
      createLabelTexture('Textiles', '8 GP / kg', '#6366F1'),
      createLabelTexture('Mixed Paper', '7 GP / kg', '#78716C'),
    ];
  }, []);

  // Clean up materials & textures on unmount
  useEffect(() => {
    return () => {
      Object.values(materials).forEach((m) => m.dispose());
      labelTextures.forEach((t) => t.dispose());
    };
  }, [materials, labelTextures]);

  // Direct Scene Graph Node References for frame-by-frame zero-overhead mutation
  const stationRootRef = useRef<THREE.Group>(null);
  const canopyRef = useRef<THREE.Group>(null);
  const consoleRef = useRef<THREE.Group>(null);
  const scalePlateRef = useRef<THREE.Mesh>(null);
  const scaleWeightTextRef = useRef<THREE.Group>(null);
  const qrCardRef = useRef<THREE.Group>(null);
  const laserMeshRef = useRef<THREE.Mesh>(null);
  const scannerBezelRef = useRef<THREE.Mesh>(null);
  const oledDisplayGroupRef = useRef<THREE.Group>(null);
  const oledCalculationTextRef = useRef<THREE.Group>(null);
  const gpCoinGroupRef = useRef<THREE.Group>(null);

  // 3D Recyclable item refs (Scene 3)
  const canItemRef = useRef<THREE.Group>(null);
  const bottleItemRef = useRef<THREE.Group>(null);
  const boxItemRef = useRef<THREE.Group>(null);
  const newspaperItemRef = useRef<THREE.Group>(null);
  const glassItemRef = useRef<THREE.Group>(null);

  // Category highlight light refs
  const highlightSpotLightRef = useRef<THREE.SpotLight>(null);

  useFrame(() => {
    const a = animRef.current;

    // Station gentle aesthetic rotation
    if (stationRootRef.current) {
      stationRootRef.current.rotation.y = a.stationRotY;
    }

    // Scene 2: Category highlight lighting
    if (highlightSpotLightRef.current) {
      highlightSpotLightRef.current.intensity = a.categoryHighlight * 3.5;
    }

    // Scene 3: Representative 3D Recyclables Segregation trajectories
    const p3 = a.segregationProgress;
    if (canItemRef.current) {
      // Moves toward Aluminium slot (x = -1.72, y = 1.25, z = 0.45)
      canItemRef.current.position.set(
        -1.72 * p3,
        1.1 + Math.sin(p3 * Math.PI) * 0.4 - p3 * 0.2,
        1.4 - p3 * 0.95
      );
      canItemRef.current.rotation.x = p3 * 2;
      canItemRef.current.rotation.z = p3 * 1.5;
      canItemRef.current.scale.setScalar(Math.max(0.001, 1 - p3 * 0.4));
    }
    if (bottleItemRef.current) {
      // Moves toward PET slot (x = -1.72, y = 0.45, z = 0.45)
      bottleItemRef.current.position.set(
        -1.0 * p3 - 0.72 * (p3 * p3),
        0.8 + Math.sin(p3 * Math.PI) * 0.3 - p3 * 0.35,
        1.3 - p3 * 0.85
      );
      bottleItemRef.current.rotation.y = p3 * 3;
      bottleItemRef.current.scale.setScalar(Math.max(0.001, 1 - p3 * 0.4));
    }
    if (boxItemRef.current) {
      // Moves toward Cardboard slot (x = -0.86, y = 0.45, z = 0.45)
      boxItemRef.current.position.set(
        -0.86 * p3,
        0.9 + Math.sin(p3 * Math.PI) * 0.3 - p3 * 0.45,
        1.5 - p3 * 1.05
      );
      boxItemRef.current.rotation.y = p3 * 1.5;
      boxItemRef.current.scale.setScalar(Math.max(0.001, 1 - p3 * 0.4));
    }
    if (newspaperItemRef.current) {
      // Moves toward Newspaper slot (x = 0.86, y = 1.25, z = 0.45)
      newspaperItemRef.current.position.set(
        0.86 * p3,
        1.3 + Math.sin(p3 * Math.PI) * 0.25 - p3 * 0.2,
        1.2 - p3 * 0.75
      );
      newspaperItemRef.current.rotation.x = p3 * 1.2;
      newspaperItemRef.current.scale.setScalar(Math.max(0.001, 1 - p3 * 0.4));
    }
    if (glassItemRef.current) {
      // Moves toward Glass slot (x = 0.86, y = 0.45, z = 0.45)
      glassItemRef.current.position.set(
        0.86 * p3,
        0.8 + Math.sin(p3 * Math.PI) * 0.25 - p3 * 0.35,
        1.3 - p3 * 0.85
      );
      glassItemRef.current.rotation.z = p3 * 2;
      glassItemRef.current.scale.setScalar(Math.max(0.001, 1 - p3 * 0.4));
    }

    // Scene 4: Digital Scale Weighment
    if (scalePlateRef.current) {
      // Subtle platform depression under weight (0 -> -0.015m)
      scalePlateRef.current.position.y = 0.65 - a.scaleWeightProgress * 0.015;
    }
    if (scaleWeightTextRef.current) {
      scaleWeightTextRef.current.scale.setScalar(a.scaleWeightProgress);
    }

    // Scene 5: Citizen QR Card Approach & Laser Sweep
    if (qrCardRef.current) {
      // Card approaches scanner window: z from 1.6 to 0.72
      const cp = a.cardScanProgress;
      qrCardRef.current.position.set(0.0, 1.05 - (1 - cp) * 0.2, 0.72 + (1 - cp) * 0.9);
      qrCardRef.current.rotation.x = (1 - cp) * 0.3;
      qrCardRef.current.scale.setScalar(cp > 0.01 ? 1 : 0.001);
    }
    if (laserMeshRef.current) {
      laserMeshRef.current.position.y = 1.15 + a.laserScanY;
      laserMeshRef.current.scale.y = a.laserScanOpacity > 0.05 ? 1 : 0.001;
      (materials.laser as THREE.MeshBasicMaterial).opacity = a.laserScanOpacity;
    }
    if (scannerBezelRef.current) {
      // Bezel glows green on verification
      (scannerBezelRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        0.5 + a.qrVerifiedGlow * 2.5;
    }

    // Scene 6: Green Points OLED calculation & 3D Reward Coin
    if (oledCalculationTextRef.current) {
      oledCalculationTextRef.current.scale.setScalar(a.gpCalculationProgress);
    }
    if (gpCoinGroupRef.current) {
      gpCoinGroupRef.current.scale.setScalar(a.gpCoinScale);
      gpCoinGroupRef.current.rotation.y = a.gpCoinRotY;
      gpCoinGroupRef.current.position.y = 1.45 + a.gpCoinLift;
    }

    // Scene 7: Monolithic Lock / Reassembly
    if (canopyRef.current) {
      canopyRef.current.position.y = 2.15;
    }
  });

  // Coordinates for the 8 compartments in an architectural 5-bay layout:
  // Bay 1: x = -1.72
  // Bay 2: x = -0.86
  // Bay 3 (Center): x = 0.0 (Central Smart Tech Terminal: items 9, 10, 11)
  // Bay 4: x = +0.86
  // Bay 5: x = +1.72
  const compartmentConfigs = [
    {
      col: 0,
      row: 1,
      x: -1.72,
      y: 1.25,
      name: 'Aluminium & Metal',
      rate: '22 GP/kg',
      mat: materials.aluminium,
      texIdx: 0,
    },
    {
      col: 0,
      row: 0,
      x: -1.72,
      y: 0.45,
      name: 'PET Bottles',
      rate: '18 GP/kg',
      mat: materials.pet,
      texIdx: 1,
    },
    {
      col: 1,
      row: 1,
      x: -0.86,
      y: 1.25,
      name: 'Other Plastics',
      rate: '15 GP/kg',
      mat: materials.plastics,
      texIdx: 2,
    },
    {
      col: 1,
      row: 0,
      x: -0.86,
      y: 0.45,
      name: 'Cardboard',
      rate: '10 GP/kg',
      mat: materials.cardboard,
      texIdx: 4,
    },
    {
      col: 3,
      row: 1,
      x: 0.86,
      y: 1.25,
      name: 'Newspapers',
      rate: '10 GP/kg',
      mat: materials.newspaper,
      texIdx: 3,
    },
    {
      col: 3,
      row: 0,
      x: 0.86,
      y: 0.45,
      name: 'Glass Bottles',
      rate: '8 GP/kg',
      mat: materials.glass,
      texIdx: 5,
    },
    {
      col: 4,
      row: 1,
      x: 1.72,
      y: 1.25,
      name: 'Textiles',
      rate: '8 GP/kg',
      mat: materials.textiles,
      texIdx: 6,
    },
    {
      col: 4,
      row: 0,
      x: 1.72,
      y: 0.45,
      name: 'Mixed Paper',
      rate: '7 GP/kg',
      mat: materials.mixedPaper,
      texIdx: 7,
    },
  ];

  return (
    <group
      ref={stationRootRef}
      position={[isMobile ? 0 : 1.9, isMobile ? -0.95 : -0.65, 0]}
      scale={isMobile ? 0.46 : 0.62}
    >
      {/* =================================================================== */}
      {/* 1. ARCHITECTURAL BASE & FOUNDATION PLINTH                           */}
      {/* =================================================================== */}
      {/* Main Ground Plinth with chamfered profile */}
      <mesh position={[0, -0.06, 0]} material={materials.plinth} receiveShadow>
        <boxGeometry args={[4.6, 0.12, 1.35]} />
      </mesh>
      {/* Secondary Recessed Shadow Step */}
      <mesh position={[0, 0.02, 0]} material={materials.plinth}>
        <boxGeometry args={[4.35, 0.05, 1.2]} />
      </mesh>
      {/* Perimeter Signal Lime Ground Guidance Inset */}
      <mesh position={[0, 0.046, 0.58]} material={materials.limeEmissive}>
        <boxGeometry args={[4.3, 0.008, 0.02]} />
      </mesh>

      {/* =================================================================== */}
      {/* 2. MAIN STRUCTURAL HOUSING (BACK CHASSIS & DIVIDERS)                */}
      {/* =================================================================== */}
      {/* Rear Structural Spine */}
      <mesh position={[0, 0.85, -0.45]} material={materials.chassis} castShadow receiveShadow>
        <boxGeometry args={[4.35, 1.65, 0.2]} />
      </mesh>
      {/* Left End Column */}
      <mesh position={[-2.22, 0.85, 0]} material={materials.chassis} castShadow receiveShadow>
        <boxGeometry args={[0.12, 1.65, 1.05]} />
      </mesh>
      {/* Right End Column */}
      <mesh position={[2.22, 0.85, 0]} material={materials.chassis} castShadow receiveShadow>
        <boxGeometry args={[0.12, 1.65, 1.05]} />
      </mesh>
      {/* Horizontal Mid-tier Structural Divider */}
      <mesh position={[0, 0.85, 0]} material={materials.steel} castShadow receiveShadow>
        <boxGeometry args={[4.32, 0.06, 0.95]} />
      </mesh>

      {/* =================================================================== */}
      {/* 3. THE 8 DRY RECYCLABLE COMPARTMENTS                                */}
      {/* =================================================================== */}
      {compartmentConfigs.map((cfg, idx) => (
        <group key={idx} position={[cfg.x, cfg.y, 0]}>
          {/* Main Compartment Box Shell */}
          <mesh material={materials.elevated} castShadow receiveShadow>
            <boxGeometry args={[0.78, 0.72, 0.88]} />
          </mesh>

          {/* Front Beveled Access Panel */}
          <mesh position={[0, 0, 0.445]} material={cfg.mat} castShadow>
            <boxGeometry args={[0.74, 0.68, 0.02]} />
          </mesh>

          {/* Recessed Chute Inset Slot / Flap */}
          <mesh position={[0, 0.16, 0.44]} material={materials.steel}>
            <boxGeometry args={[0.64, 0.16, 0.04]} />
          </mesh>

          {/* Compartment Chute Opening (Rubber Trim) */}
          <mesh position={[0, 0.16, 0.465]} material={materials.plinth}>
            <boxGeometry args={[0.58, 0.1, 0.02]} />
          </mesh>

          {/* Internal Acrylic Sight / Level Window */}
          <mesh position={[0, -0.06, 0.456]} material={materials.acrylic}>
            <boxGeometry args={[0.52, 0.14, 0.015]} />
          </mesh>

          {/* Hardware Label Faceplate with Crisp Canvas Texture */}
          {labelTextures[cfg.texIdx] && (
            <mesh position={[0, -0.22, 0.458]}>
              <planeGeometry args={[0.66, 0.14]} />
              <meshBasicMaterial
                map={labelTextures[cfg.texIdx]}
                toneMapped={false}
              />
            </mesh>
          )}

          {/* Lower Maintenance Service Lock Bolt */}
          <mesh position={[0.28, -0.28, 0.46]} material={materials.steel}>
            <cylinderGeometry args={[0.015, 0.015, 0.01, 16]} />
          </mesh>

          {/* LED Sensor Readiness Dot */}
          <mesh position={[-0.3, 0.28, 0.46]} material={materials.limeEmissive}>
            <sphereGeometry args={[0.012, 16, 16]} />
          </mesh>
        </group>
      ))}

      {/* =================================================================== */}
      {/* 4. CENTRAL INTEGRATED TECH TERMINAL (ITEMS 9, 10, 11, 12)           */}
      {/* =================================================================== */}
      <group ref={consoleRef} position={[0, 0.85, 0.35]}>
        {/* Terminal Pedestal Column */}
        <mesh position={[0, -0.2, 0]} material={materials.elevated} castShadow>
          <boxGeometry args={[0.76, 0.9, 0.42]} />
        </mesh>

        {/* --- ITEM 10: DIGITAL WEIGHING INTERFACE PLATFORM --- */}
        <group position={[0, 0.25, 0.05]}>
          {/* Base load-cell frame */}
          <mesh material={materials.steel} position={[0, -0.04, 0]}>
            <boxGeometry args={[0.74, 0.04, 0.42]} />
          </mesh>
          {/* Calibrated stainless steel weighing plate */}
          <mesh
            ref={scalePlateRef}
            position={[0, 0, 0]}
            material={materials.scalePlate}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[0.70, 0.03, 0.38]} />
          </mesh>
          {/* Scale Active Sensor Perimeter Ring */}
          <mesh position={[0, -0.01, 0.2]} material={materials.limeEmissive}>
            <boxGeometry args={[0.66, 0.008, 0.012]} />
          </mesh>

          {/* Digital Scale LED Weight Readout */}
          <group ref={scaleWeightTextRef} position={[0, 0.03, 0.16]} scale={[0, 0, 0]}>
            <mesh position={[0, 0, 0]} material={materials.oled}>
              <boxGeometry args={[0.34, 0.05, 0.04]} />
            </mesh>
            {/* Live Weight Readout text box */}
            <mesh position={[0, 0.026, 0.01]}>
              <planeGeometry args={[0.32, 0.04]} />
              <meshBasicMaterial color="#D7FF35" />
            </mesh>
          </group>
        </group>

        {/* --- ITEM 9: INTEGRATED QR VERIFICATION SCANNER --- */}
        <group position={[0, 0.65, -0.05]}>
          {/* Scanner Console Housing */}
          <mesh material={materials.chassis} castShadow>
            <boxGeometry args={[0.76, 0.65, 0.32]} />
          </mesh>

          {/* Scanner Optical Inset Bevel */}
          <mesh
            ref={scannerBezelRef}
            position={[0, 0.02, 0.165]}
            material={materials.limeSubtle}
          >
            <boxGeometry args={[0.38, 0.26, 0.02]} />
          </mesh>

          {/* Dark Glass Optical Scanning Window */}
          <mesh position={[0, 0.02, 0.176]} material={materials.acrylic}>
            <boxGeometry args={[0.34, 0.22, 0.01]} />
          </mesh>

          {/* Laser Scanning Line Sweep Beam */}
          <mesh
            ref={laserMeshRef}
            position={[0, 0.02, 0.185]}
            material={materials.laser}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.004, 0.004, 0.32, 8]} />
          </mesh>

          {/* --- ITEM 11: OLED GREEN POINTS DISPLAY --- */}
          <group ref={oledDisplayGroupRef} position={[0, 0.22, 0.165]}>
            <mesh material={materials.oled}>
              <boxGeometry args={[0.70, 0.14, 0.015]} />
            </mesh>
            {/* Ambient status border */}
            <mesh position={[0, 0, 0.009]} material={materials.limeSubtle}>
              <boxGeometry args={[0.72, 0.155, 0.002]} />
            </mesh>
          </group>

          {/* OLED Calculation Dynamic Readout (Scene 6) */}
          <group
            ref={oledCalculationTextRef}
            position={[0, 0.22, 0.178]}
            scale={[0, 0, 0]}
          >
            <mesh>
              <planeGeometry args={[0.66, 0.11]} />
              <meshBasicMaterial color="#D7FF35" toneMapped={false} />
            </mesh>
          </group>
        </group>
      </group>

      {/* =================================================================== */}
      {/* 5. CITIZEN 3D QR CARD (SCENE 5 SCAN ANIMATION)                      */}
      {/* =================================================================== */}
      <group ref={qrCardRef} position={[0, 1.05, 1.8]} scale={[0.001, 0.001, 0.001]}>
        {/* Card Body */}
        <mesh material={materials.elevated} castShadow>
          <boxGeometry args={[0.22, 0.32, 0.006]} />
        </mesh>
        {/* Card Bevel Trim */}
        <mesh position={[0, 0, 0.004]} material={materials.limeSubtle}>
          <boxGeometry args={[0.21, 0.31, 0.002]} />
        </mesh>
        {/* QR Code White Tile */}
        <mesh position={[0, 0.03, 0.006]}>
          <planeGeometry args={[0.16, 0.16]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
        {/* QR Pattern Geometry Inset */}
        <mesh position={[0, 0.03, 0.007]}>
          <planeGeometry args={[0.13, 0.13]} />
          <meshBasicMaterial color="#041B15" />
        </mesh>
        {/* Permanent Citizen ID string badge */}
        <mesh position={[0, -0.09, 0.006]}>
          <planeGeometry args={[0.16, 0.035]} />
          <meshBasicMaterial color="#D7FF35" />
        </mesh>
      </group>

      {/* =================================================================== */}
      {/* 6. GREEN POINTS REWARD COIN / CREST (SCENE 6)                       */}
      {/* =================================================================== */}
      <group ref={gpCoinGroupRef} position={[0, 1.45, 0.6]} scale={[0, 0, 0]}>
        {/* Metallic Gold / Signal Lime Double Rim Coin */}
        <mesh
          material={materials.limeEmissive}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        >
          <cylinderGeometry args={[0.22, 0.22, 0.04, 32]} />
        </mesh>
        <mesh
          material={materials.steel}
          position={[0, 0, 0.021]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.19, 0.19, 0.005, 32]} />
        </mesh>
        <mesh
          material={materials.chassis}
          position={[0, 0, -0.021]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.19, 0.19, 0.005, 32]} />
        </mesh>
      </group>

      {/* =================================================================== */}
      {/* 7. REPRESENTATIVE 3D RECYCLABLES (SCENE 3 SEGREGATION TRAJECTORIES) */}
      {/* =================================================================== */}
      {/* 1. Aluminium Beverage Can */}
      <group ref={canItemRef} position={[-1.72, 1.25, 0.45]}>
        <mesh material={materials.aluminium} castShadow>
          <cylinderGeometry args={[0.045, 0.045, 0.14, 24]} />
        </mesh>
        <mesh position={[0, 0.071, 0]} material={materials.steel}>
          <cylinderGeometry args={[0.04, 0.04, 0.004, 24]} />
        </mesh>
      </group>

      {/* 2. PET Water Bottle */}
      <group ref={bottleItemRef} position={[-1.72, 0.45, 0.45]}>
        <mesh material={materials.pet} castShadow>
          <cylinderGeometry args={[0.04, 0.045, 0.18, 24]} />
        </mesh>
        <mesh position={[0, 0.095, 0]} material={materials.plastics}>
          <cylinderGeometry args={[0.016, 0.016, 0.02, 16]} />
        </mesh>
      </group>

      {/* 3. Folded Cardboard Carton */}
      <group ref={boxItemRef} position={[-0.86, 0.45, 0.45]}>
        <mesh material={materials.cardboard} castShadow>
          <boxGeometry args={[0.18, 0.14, 0.22]} />
        </mesh>
        {/* Sealing Tape */}
        <mesh position={[0, 0.071, 0]} material={materials.plinth}>
          <boxGeometry args={[0.03, 0.002, 0.222]} />
        </mesh>
      </group>

      {/* 4. Newspaper / Periodical Stack */}
      <group ref={newspaperItemRef} position={[0.86, 1.25, 0.45]}>
        <mesh material={materials.newspaper} castShadow>
          <boxGeometry args={[0.22, 0.06, 0.16]} />
        </mesh>
      </group>

      {/* 5. Emerald Glass Beverage Bottle */}
      <group ref={glassItemRef} position={[0.86, 0.45, 0.45]}>
        <mesh material={materials.glass} castShadow>
          <cylinderGeometry args={[0.035, 0.04, 0.2, 24]} />
        </mesh>
      </group>

      {/* =================================================================== */}
      {/* 8. ARCHITECTURAL CANOPY & GREENPAY BRANDING (ITEM 12)               */}
      {/* =================================================================== */}
      <group ref={canopyRef} position={[0, 2.15, 0]}>
        {/* Main Cantilevered Roof Slab */}
        <mesh material={materials.canopy} castShadow>
          <boxGeometry args={[4.65, 0.14, 1.35]} />
        </mesh>

        {/* Downward LED Guidance Light Channel */}
        <mesh position={[0, -0.071, 0.45]} material={materials.limeEmissive}>
          <boxGeometry args={[4.45, 0.01, 0.03]} />
        </mesh>

        {/* --- ITEM 12: GREENPAY BRANDING FASCIA --- */}
        <group position={[0, 0, 0.68]}>
          {/* Fascia Plate */}
          <mesh material={materials.elevated}>
            <boxGeometry args={[2.2, 0.14, 0.015]} />
          </mesh>
          {/* Signal Lime Accent Line */}
          <mesh position={[0, -0.05, 0.01]} material={materials.limeEmissive}>
            <boxGeometry args={[2.1, 0.008, 0.004]} />
          </mesh>
          {/* GreenPay Logo Icon Badge */}
          <mesh position={[-0.85, 0, 0.01]} material={materials.limeEmissive}>
            <boxGeometry args={[0.07, 0.07, 0.008]} />
          </mesh>
          {/* White Typography Bar (Simulating Crisp "GREENPAY / BLR") */}
          <mesh position={[0.1, 0.01, 0.01]} material={materials.softWhite}>
            <boxGeometry args={[1.4, 0.038, 0.004]} />
          </mesh>
          <mesh position={[0.1, -0.025, 0.01]} material={materials.limeEmissive}>
            <boxGeometry args={[1.4, 0.016, 0.004]} />
          </mesh>
        </group>
      </group>

      {/* Controlled SpotLight for Scene 2 Category Introductions */}
      <spotLight
        ref={highlightSpotLightRef}
        position={[0, 3.5, 2.5]}
        target={stationRootRef.current || undefined}
        angle={0.65}
        penumbra={0.5}
        intensity={0}
        color="#D7FF35"
      />
    </group>
  );
};

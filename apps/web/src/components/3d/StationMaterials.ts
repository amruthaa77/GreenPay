import * as THREE from 'three';

/**
 * GreenPay 2.0 PBR Materials Library
 * Exclusively designed for the 8-Category Modular Dry-Recyclables Smart Station.
 * Palette: Deep Forest Green (#062B20), Dark Forest (#041B15), Emerald (#0D4935),
 * Rich Emerald (#14543D), Brushed Stainless Steel, Soft White, and Signal Lime (#D7FF35).
 */

// 1. Structural Plinth (Dark Forest Granite / Matte Basalt #041B15)
export const createPlinthMaterial = () =>
  new THREE.MeshStandardMaterial({
    color: new THREE.Color('#041B15'),
    metalness: 0.35,
    roughness: 0.75,
  });

// 2. Anodized Canopy (Deep Forest Green #062B20)
export const createCanopyMaterial = () =>
  new THREE.MeshStandardMaterial({
    color: new THREE.Color('#062B20'),
    metalness: 0.75,
    roughness: 0.28,
    envMapIntensity: 1.1,
  });

// 3. Main Outer Chassis (Emerald #0D4935)
export const createChassisMaterial = () =>
  new THREE.MeshStandardMaterial({
    color: new THREE.Color('#0D4935'),
    metalness: 0.6,
    roughness: 0.35,
    envMapIntensity: 1.0,
  });

// 4. Elevated Access Panels & Doors (Rich Emerald #14543D)
export const createElevatedChassisMaterial = () =>
  new THREE.MeshStandardMaterial({
    color: new THREE.Color('#14543D'),
    metalness: 0.55,
    roughness: 0.38,
    envMapIntensity: 0.9,
  });

// 5. Brushed Stainless Steel (Scales, Chute Openings, Pistons & Locks)
export const createSteelMaterial = () =>
  new THREE.MeshStandardMaterial({
    color: new THREE.Color('#CBD5E1'),
    metalness: 0.92,
    roughness: 0.18,
    envMapIntensity: 1.4,
  });

// 6. Calibrated Scale Weighing Platform
export const createScalePlateMaterial = () =>
  new THREE.MeshStandardMaterial({
    color: new THREE.Color('#E2E8F0'),
    metalness: 0.95,
    roughness: 0.22,
    envMapIntensity: 1.5,
  });

// 7. Category Compartment Materials (8 Dry Recyclable Streams)
export const createAluminiumCompartmentMaterial = () =>
  new THREE.MeshStandardMaterial({
    color: new THREE.Color('#94A3B8'), // Slate silver
    metalness: 0.85,
    roughness: 0.25,
  });

export const createPETCompartmentMaterial = () =>
  new THREE.MeshStandardMaterial({
    color: new THREE.Color('#0284C7'), // Technical ocean blue
    metalness: 0.45,
    roughness: 0.3,
  });

export const createPlasticsCompartmentMaterial = () =>
  new THREE.MeshStandardMaterial({
    color: new THREE.Color('#0D9488'), // Clean teal-cyan
    metalness: 0.4,
    roughness: 0.35,
  });

export const createNewspaperCompartmentMaterial = () =>
  new THREE.MeshStandardMaterial({
    color: new THREE.Color('#64748B'), // Newsprint slate
    metalness: 0.3,
    roughness: 0.5,
  });

export const createCardboardCompartmentMaterial = () =>
  new THREE.MeshStandardMaterial({
    color: new THREE.Color('#B45309'), // Kraft brown-amber
    metalness: 0.2,
    roughness: 0.65,
  });

export const createGlassCompartmentMaterial = () =>
  new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#059669'), // Bottle emerald glass
    transmission: 0.7,
    opacity: 0.9,
    transparent: true,
    roughness: 0.15,
    ior: 1.52,
    thickness: 0.6,
  });

export const createTextilesCompartmentMaterial = () =>
  new THREE.MeshStandardMaterial({
    color: new THREE.Color('#6366F1'), // Recycled fiber indigo
    metalness: 0.25,
    roughness: 0.6,
  });

export const createMixedPaperCompartmentMaterial = () =>
  new THREE.MeshStandardMaterial({
    color: new THREE.Color('#78716C'), // Fiber stone
    metalness: 0.3,
    roughness: 0.55,
  });

// 8. Signal Lime LED Illumination & Accents (#D7FF35)
export const createLimeEmissiveMaterial = (intensity = 2.4) =>
  new THREE.MeshStandardMaterial({
    color: new THREE.Color('#D7FF35'),
    emissive: new THREE.Color('#D7FF35'),
    emissiveIntensity: intensity,
    toneMapped: false,
  });

// 9. Soft White Architectural Accent
export const createSoftWhiteMaterial = () =>
  new THREE.MeshStandardMaterial({
    color: new THREE.Color('#F4F7F0'),
    metalness: 0.2,
    roughness: 0.4,
  });

// 10. QR Scanner Laser Beam Line
export const createLaserLineMaterial = () =>
  new THREE.MeshBasicMaterial({
    color: new THREE.Color('#D7FF35'),
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  });

// 11. Acrylic Glass Viewing Windows
export const createAcrylicGlassMaterial = () =>
  new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#062B20'),
    transmission: 0.85,
    opacity: 0.95,
    transparent: true,
    roughness: 0.08,
    ior: 1.49,
    thickness: 0.4,
  });

// 12. OLED Telemetry & Points Display
export const createOledScreenMaterial = () =>
  new THREE.MeshStandardMaterial({
    color: new THREE.Color('#020D0A'),
    roughness: 0.12,
    metalness: 0.85,
  });

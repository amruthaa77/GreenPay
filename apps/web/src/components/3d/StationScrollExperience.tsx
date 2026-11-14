import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, Sparkles, CheckCircle2, ChevronDown, Scale, QrCode, ShoppingBag, ShieldCheck } from 'lucide-react';
import { ModularStation, StationAnimationData } from './ModularStation';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface CameraRigProps {
  animRef: React.MutableRefObject<StationAnimationData>;
}

const CameraRig: React.FC<CameraRigProps> = ({ animRef }) => {
  const { camera } = useThree();
  const targetVec = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const a = animRef.current;
    camera.position.set(a.camX, a.camY, a.camZ);
    targetVec.set(a.targetX, a.targetY, a.targetZ);
    camera.lookAt(targetVec);
  });

  return null;
};

interface StationScrollExperienceProps {
  navigate: (path: string) => void;
}

export const StationScrollExperience: React.FC<StationScrollExperienceProps> = ({ navigate }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);

  // Active scene state: ONLY updated when crossing scene thresholds (7 times total), preventing React re-renders while scrolling
  const [activeScene, setActiveScene] = useState<number>(1);
  const currentSceneRef = useRef<number>(1);
  const [webGLSupported, setWebGLSupported] = useState<boolean>(true);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // Shared authoritative animation object mutated directly by GSAP ScrollTrigger
  const animRef = useRef<StationAnimationData>({
    stationRotY: 0.18,
    categoryHighlight: 0,
    segregationProgress: 0,
    scaleWeightProgress: 0,
    cardScanProgress: 0,
    laserScanY: -0.12,
    laserScanOpacity: 0,
    qrVerifiedGlow: 0,
    gpCalculationProgress: 0,
    gpCoinScale: 0,
    gpCoinRotY: 0,
    gpCoinLift: 0,
    reassemblyProgress: 0,
    camX: 0.0,
    camY: 0.85,
    camZ: 5.6,
    targetX: 0.0,
    targetY: 0.2,
    targetZ: 0.0,
  });

  useEffect(() => {
    // Check WebGL availability
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) setWebGLSupported(false);
    } catch {
      setWebGLSupported(false);
    }

    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        animRef.current.camX = 0.0;
        animRef.current.camY = 0.3;
        animRef.current.camZ = 6.0;
        animRef.current.targetX = 0.0;
        animRef.current.targetY = -0.25;
        animRef.current.targetZ = 0.0;
        animRef.current.stationRotY = 0.15;
      } else {
        animRef.current.camX = 0.0;
        animRef.current.camY = 0.85;
        animRef.current.camZ = 5.6;
        animRef.current.targetX = 0.0;
        animRef.current.targetY = 0.2;
        animRef.current.targetZ = 0.0;
        animRef.current.stationRotY = 0.18;
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      return () => window.removeEventListener('resize', checkMobile);
    }

    const ctx = gsap.context(() => {
      const t = animRef.current;
      const mobile = window.innerWidth < 768;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.6,
          pin: stickyRef.current,
          pinSpacing: false,
          onUpdate: (self) => {
            const p = self.progress;
            let nextScene = 1;
            if (p < 0.14) nextScene = 1;
            else if (p < 0.28) nextScene = 2;
            else if (p < 0.44) nextScene = 3;
            else if (p < 0.58) nextScene = 4;
            else if (p < 0.72) nextScene = 5;
            else if (p < 0.86) nextScene = 6;
            else nextScene = 7;

            if (nextScene !== currentSceneRef.current) {
              currentSceneRef.current = nextScene;
              setActiveScene(nextScene);
            }
          },
        },
      });

      // SCENE 01 -> SCENE 02: CATEGORY INTRODUCTION (14% - 28%)
      tl.to(
        t,
        {
          stationRotY: 0.12,
          categoryHighlight: 1.0,
          segregationProgress: 0,
          scaleWeightProgress: 0,
          cardScanProgress: 0,
          camX: mobile ? 0.0 : 0.3,
          camY: mobile ? 0.35 : 0.85,
          camZ: mobile ? 5.2 : 4.8,
          targetX: mobile ? 0.0 : 0.4,
          targetY: mobile ? -0.2 : 0.2,
          targetZ: 0.0,
          duration: 1.5,
          ease: 'power2.inOut',
        },
        'scene2'
      );

      // SCENE 02 -> SCENE 03: MATERIAL SEGREGATION TRAJECTORIES (28% - 44%)
      tl.to(
        t,
        {
          stationRotY: 0.15,
          categoryHighlight: 0.3,
          segregationProgress: 1.0,
          scaleWeightProgress: 0,
          cardScanProgress: 0,
          camX: mobile ? 0.0 : 0.2,
          camY: mobile ? 0.4 : 0.90,
          camZ: mobile ? 5.4 : 5.0,
          targetX: mobile ? 0.0 : 0.3,
          targetY: mobile ? -0.15 : 0.25,
          targetZ: 0.1,
          duration: 2.0,
          ease: 'power2.inOut',
        },
        'scene3'
      );

      // SCENE 03 -> SCENE 04: WEIGHMENT ON DIGITAL SCALE (44% - 58%)
      tl.to(
        t,
        {
          stationRotY: 0.02,
          segregationProgress: 0,
          scaleWeightProgress: 1.0,
          cardScanProgress: 0,
          laserScanOpacity: 0,
          camX: mobile ? 0.0 : 0.4,
          camY: mobile ? 0.25 : 0.55,
          camZ: mobile ? 3.4 : 3.8,
          targetX: mobile ? 0.0 : 0.7,
          targetY: mobile ? 0.05 : 0.1,
          targetZ: 0.2,
          duration: 1.8,
          ease: 'power2.inOut',
        },
        'scene4'
      );

      // SCENE 04 -> SCENE 05: QR VERIFICATION & LASER SWEEP (58% - 72%)
      tl.to(
        t,
        {
          stationRotY: 0.0,
          scaleWeightProgress: 0.8,
          cardScanProgress: 1.0,
          laserScanOpacity: 1.0,
          laserScanY: 0.12,
          qrVerifiedGlow: 1.0,
          gpCalculationProgress: 0,
          camX: mobile ? 0.0 : 0.45,
          camY: mobile ? 0.3 : 0.65,
          camZ: mobile ? 3.2 : 3.6,
          targetX: mobile ? 0.0 : 0.7,
          targetY: mobile ? 0.15 : 0.25,
          targetZ: 0.3,
          duration: 1.8,
          ease: 'power2.inOut',
        },
        'scene5'
      );

      // SCENE 05 -> SCENE 06: GREEN POINTS CALCULATION & REWARD COIN (72% - 86%)
      tl.to(
        t,
        {
          stationRotY: -0.04,
          cardScanProgress: 0.3,
          laserScanOpacity: 0.0,
          qrVerifiedGlow: 0.4,
          gpCalculationProgress: 1.0,
          gpCoinScale: 1.0,
          gpCoinRotY: Math.PI * 4,
          gpCoinLift: 0.5,
          camX: mobile ? 0.0 : 0.45,
          camY: mobile ? 0.35 : 0.75,
          camZ: mobile ? 3.5 : 3.8,
          targetX: mobile ? 0.0 : 0.7,
          targetY: mobile ? 0.25 : 0.35,
          targetZ: 0.3,
          duration: 1.8,
          ease: 'back.out(1.4)',
        },
        'scene6'
      );

      // SCENE 06 -> SCENE 07: REASSEMBLY & FINAL MONOLITHIC SHOWCASE (86% - 100%)
      tl.to(
        t,
        {
          stationRotY: 0.18,
          categoryHighlight: 0.5,
          segregationProgress: 0,
          scaleWeightProgress: 0,
          cardScanProgress: 0,
          laserScanOpacity: 0,
          qrVerifiedGlow: 0,
          gpCalculationProgress: 0,
          gpCoinScale: 0,
          reassemblyProgress: 1.0,
          camX: mobile ? 0.0 : 0.0,
          camY: mobile ? 0.3 : 0.85,
          camZ: mobile ? 6.0 : 5.6,
          targetX: mobile ? 0.0 : 0.0,
          targetY: mobile ? -0.25 : 0.2,
          targetZ: 0.0,
          duration: 2.2,
          ease: 'power2.inOut',
        },
        'scene7'
      );
    }, containerRef);

    return () => {
      window.removeEventListener('resize', checkMobile);
      ctx.revert();
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-[600vh] bg-[#041B15]">
      {/* ================================================================= */}
      {/* STICKY FULL-VIEWPORT 3D CANVAS                                    */}
      {/* ================================================================= */}
      <div ref={stickyRef} className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center">
        {/* Deep Forest Studio Backdrop */}
        <div className="absolute inset-0 bg-radial-gradient from-[#0D4935]/40 via-[#062B20]/70 to-[#041B15] pointer-events-none" />

        {/* Ambient Overhead Glow */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[750px] h-[350px] bg-[#D7FF35]/5 blur-[120px] rounded-full pointer-events-none" />

        {/* Real-time WebGL 3D Canvas */}
        {webGLSupported ? (
          <Canvas
            shadows
            camera={{ position: [2.8, 1.25, 4.8], fov: 38, near: 0.1, far: 50 }}
            dpr={[1, 1.5]}
            gl={{
              antialias: true,
              alpha: true,
              powerPreference: 'high-performance',
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1.15,
            }}
          >
            <CameraRig animRef={animRef} />

            {/* Cinematic Studio Lighting */}
            <ambientLight intensity={0.7} />
            <directionalLight
              position={[5, 8, 5]}
              intensity={1.6}
              castShadow
              shadow-mapSize={[1024, 1024]}
              shadow-camera-near={0.5}
              shadow-camera-far={20}
              shadow-camera-left={-4}
              shadow-camera-right={4}
              shadow-camera-top={4}
              shadow-camera-bottom={-4}
              shadow-bias={-0.0005}
            />
            {/* Soft Cool Emerald Rim Light */}
            <directionalLight position={[-6, 4, -4]} intensity={0.9} color="#10B981" />
            {/* Subtle Signal Lime Front Kick Light */}
            <directionalLight position={[2, 1, 4]} intensity={0.5} color="#D7FF35" />

            {/* The 8-Compartment Modular Smart Dry Recyclables Collection Station */}
            <ModularStation animRef={animRef} isMobile={isMobile} />
          </Canvas>
        ) : (
          /* Reduced-Motion & WebGL Fallback */
          <div className="flex flex-col items-center justify-center p-8 text-center max-w-lg z-10">
            <div className="w-16 h-16 rounded-2xl bg-[#0D4935] border border-[#D7FF35]/40 flex items-center justify-center text-[#D7FF35] mb-4">
              <Scale className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-light text-white mb-2">
              GreenPay Smart Collection Station
            </h2>
            <p className="text-sm text-[#A7B9A8] leading-relaxed">
              Exclusively engineered for 8 dry recyclable streams. Segregate dry recyclables, get them weighed, earn Green Points, and redeem essential groceries.
            </p>
          </div>
        )}

        {/* =============================================================== */}
        {/* EDITORIAL STORY OVERLAY HUD (PINNED OVER 3D)                    */}
        {/* =============================================================== */}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 sm:p-12 lg:p-16 max-w-7xl mx-auto z-10">
          {/* Top Pilot Ward Tracker */}
          <div className="flex items-center justify-between text-xs font-mono text-[#A7B9A8] pt-12 sm:pt-4">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#D7FF35] animate-ping" />
              <span>BENGALURU DRY RECYCLABLES PROTOCOL</span>
            </span>
            <span className="hidden sm:inline-block text-[#D7FF35]/80 font-bold">
              SCENE 0{activeScene} &bull; 07
            </span>
          </div>

          {/* Dynamic Scene Story Overlays (Left Column on Desktop for Zero 3D Overlap) */}
          <div className="my-auto max-w-md lg:max-w-[460px] space-y-6">
            {/* SCENE 01: PRODUCT REVEAL */}
            {activeScene === 1 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500 pointer-events-auto">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0D4935]/80 border border-[#D7FF35]/30 text-xs font-mono text-[#D7FF35]">
                  <Sparkles className="w-3.5 h-3.5 text-[#D7FF35]" />
                  <span>Dry Recyclables Collection & Reward Platform</span>
                </div>

                <h1 className="text-3xl sm:text-5xl font-light text-white tracking-tight leading-[1.1]">
                  Segregate Dry Recyclables.<br />
                  <span className="font-normal text-transparent bg-clip-text bg-gradient-to-r from-white via-[#F4F7F0] to-[#D7FF35]">
                    Earn Green Points.
                  </span><br />
                  Redeem Groceries.
                </h1>

                <p className="text-sm sm:text-base text-[#A7B9A8] font-light leading-relaxed max-w-lg">
                  GreenPay makes dry recyclable waste collection rewarding. Hand over verified dry recyclables to authorised collection staff and exchange earned Green Points for essential household groceries.
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => navigate('/register')}
                    className="px-7 py-3.5 rounded-xl bg-[#D7FF35] hover:bg-[#c4f020] text-[#041B15] font-mono text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-glow-lime flex items-center justify-center gap-2 group"
                  >
                    <span>Get Your QR Card</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('dry-recyclables-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white font-mono text-xs uppercase tracking-wider transition"
                  >
                    What Can You Give Us?
                  </button>
                </div>
              </div>
            )}

            {/* SCENE 02: CATEGORY INTRODUCTION */}
            {activeScene === 2 && (
              <div className="space-y-3 animate-in fade-in slide-in-from-left-4 duration-500">
                <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#D7FF35] font-bold">
                  8 APPROVED DRY CATEGORIES
                </span>
                <h2 className="text-3xl sm:text-5xl font-light text-white tracking-tight leading-tight">
                  Dedicated Category Compartments.
                </h2>
                <p className="text-xs sm:text-sm text-[#A7B9A8] leading-relaxed max-w-md">
                  The modular station features eight precision-engineered intake compartments: Aluminium & Metal (22 GP/kg), PET Bottles (18 GP/kg), Other Plastics (15 GP/kg), Newspapers (10 GP/kg), Cardboard (10 GP/kg), Glass Bottles (8 GP/kg), Textiles (8 GP/kg), and Mixed Paper (7 GP/kg).
                </p>
                <div className="pt-2">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#0D4935] border border-white/10 text-xs font-mono text-[#D7FF35]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D7FF35]" />
                    Exclusively Dry Recyclables &bull; No Wet or Organic Waste
                  </span>
                </div>
              </div>
            )}

            {/* SCENE 03: MATERIAL SEGREGATION */}
            {activeScene === 3 && (
              <div className="space-y-3 animate-in fade-in slide-in-from-left-4 duration-500">
                <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#D7FF35] font-bold">
                  PRECISION SEGREGATION
                </span>
                <h2 className="text-3xl sm:text-5xl font-light text-white tracking-tight leading-tight">
                  Directed Into Isolated Streams.
                </h2>
                <p className="text-xs sm:text-sm text-[#A7B9A8] leading-relaxed max-w-md">
                  Clean recyclables enter material-specific intake chutes. Strict stream isolation preserves high recovery value for secondary recycling and keeps dry materials 100% uncontaminated.
                </p>
                <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] font-mono text-neutral-300">
                  <div className="p-2 rounded bg-[#041B15] border border-white/5">✓ Clean Cans & Metals</div>
                  <div className="p-2 rounded bg-[#041B15] border border-white/5">✓ Pure Resin PET</div>
                  <div className="p-2 rounded bg-[#041B15] border border-white/5">✓ Flattened Cartons</div>
                  <div className="p-2 rounded bg-[#041B15] border border-white/5">✓ Glass & Textiles</div>
                </div>
              </div>
            )}

            {/* SCENE 04: WEIGHMENT */}
            {activeScene === 4 && (
              <div className="space-y-3 animate-in fade-in slide-in-from-left-4 duration-500">
                <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#D7FF35] font-bold">
                  CERTIFIED DIGITAL SCALE
                </span>
                <h2 className="text-3xl sm:text-5xl font-light text-white tracking-tight leading-tight">
                  Calibrated Doorstep Weighment.
                </h2>
                <p className="text-xs sm:text-sm text-[#A7B9A8] leading-relaxed max-w-md">
                  The integrated industrial weighing platform activates. Authorised staff measure each segregated category weight with precision load cells, guaranteeing transparent municipal data.
                </p>
                <div className="p-3.5 rounded-xl bg-[#0D4935]/60 border border-[#D7FF35]/30 max-w-xs space-y-1">
                  <div className="text-[10px] font-mono uppercase text-[#A7B9A8]">Measured Sample</div>
                  <div className="font-mono text-xl font-bold text-[#D7FF35]">3.50 kg Aluminium</div>
                  <div className="text-[10px] font-mono text-[#A7B9A8]">Calibrated Load-Cell &bull; Tare Verified</div>
                </div>
              </div>
            )}

            {/* SCENE 05: QR VERIFICATION */}
            {activeScene === 5 && (
              <div className="space-y-3 animate-in fade-in slide-in-from-left-4 duration-500">
                <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#D7FF35] font-bold">
                  CRYPTOGRAPHIC IDENTITY BINDING
                </span>
                <h2 className="text-3xl sm:text-5xl font-light text-white tracking-tight leading-tight">
                  Doorstep QR Identification.
                </h2>
                <p className="text-xs sm:text-sm text-[#A7B9A8] leading-relaxed max-w-md">
                  Your permanent household QR card (<code className="text-[#D7FF35]">GP-104928</code>), bound directly to your BESCOM electricity meter, is scanned by the integrated optical scanner to ensure tamper-proof accounting.
                </p>
                <div className="flex items-center gap-2 text-xs font-mono text-white pt-1">
                  <CheckCircle2 className="w-4 h-4 text-[#D7FF35]" />
                  <span>Identity Confirmed: Aarav Sharma &bull; Ward 112</span>
                </div>
              </div>
            )}

            {/* SCENE 06: GREEN POINTS CALCULATION */}
            {activeScene === 6 && (
              <div className="space-y-3 animate-in fade-in slide-in-from-left-4 duration-500">
                <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#D7FF35] font-bold">
                  DETERMINISTIC FORMULA
                </span>
                <h2 className="text-3xl sm:text-5xl font-light text-white tracking-tight leading-tight">
                  Transparent Green Points Credit.
                </h2>
                <p className="text-xs sm:text-sm text-[#A7B9A8] leading-relaxed max-w-md">
                  Green Points are calculated strictly using the verified material category and measured weight:
                </p>
                <div className="p-4 rounded-2xl bg-[#062B20] border border-[#D7FF35]/40 max-w-sm space-y-2 font-mono text-xs">
                  <div className="flex justify-between text-[#A7B9A8]">
                    <span>Category:</span>
                    <span className="text-white font-bold">Aluminium & Metal</span>
                  </div>
                  <div className="flex justify-between text-[#A7B9A8]">
                    <span>Verified Weight:</span>
                    <span className="text-white font-bold">3.50 kg</span>
                  </div>
                  <div className="flex justify-between text-[#A7B9A8]">
                    <span>Official Rate:</span>
                    <span className="text-white font-bold">22 GP / kg</span>
                  </div>
                  <div className="pt-2 border-t border-white/10 flex justify-between items-center text-sm">
                    <span className="text-white">Credited:</span>
                    <span className="text-[#D7FF35] font-black text-base">+77.0 GP</span>
                  </div>
                </div>
              </div>
            )}

            {/* SCENE 07: REASSEMBLY & FINAL SHOWCASE */}
            {activeScene === 7 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500 pointer-events-auto">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D7FF35]/15 border border-[#D7FF35]/30 text-xs font-mono text-[#D7FF35]">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Redeem For Essential Groceries</span>
                </div>

                <h2 className="text-4xl sm:text-6xl font-light text-white tracking-tight leading-tight">
                  Recycle Dry Waste.<br />
                  <span className="font-normal text-[#D7FF35]">Collect Essential Rations.</span>
                </h2>

                <p className="text-xs sm:text-sm text-[#A7B9A8] leading-relaxed max-w-md">
                  Redeem accumulated Green Points anytime for rice, toor dal, cooking oil, sugar, and salt delivered through our civic fulfillment network.
                </p>

                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('/catalog')}
                    className="px-7 py-3.5 rounded-xl bg-[#D7FF35] hover:bg-[#c4f020] text-[#041B15] font-mono text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-glow-lime flex items-center justify-center gap-2 group"
                  >
                    <span>View Grocery Catalogue</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/register')}
                    className="px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white font-mono text-xs uppercase tracking-wider transition text-center"
                  >
                    Register Household
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Scroll Progress Bar */}
          <div className="flex items-center justify-between text-xs font-mono text-[#A7B9A8]/70 pb-4">
            <span className="flex items-center gap-1.5">
              <ChevronDown className="w-4 h-4 animate-bounce text-[#D7FF35]" />
              <span>SCROLL TO EXPLORE DRY RECYCLABLES PLATFORM</span>
            </span>
            <div className="w-28 h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#D7FF35] transition-all duration-150"
                style={{ width: `${(activeScene / 7) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

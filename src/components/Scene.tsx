"use client";

import { Suspense, useRef, useEffect, useState, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { TrackballControls, Stars, Line, useTexture } from "@react-three/drei";
import * as THREE from "three";
import Planet, { getLivePlanetAngle } from "./Planet";

interface PlanetConfig {
  name: string;
  modelPath: string;
  texturePath: string;
  bumpMapPath?: string;
  ringTexturePath?: string;
  position: [number, number, number]; // Positioned in the 3D solar system
  isEmissive?: boolean;
  scale?: number;
}

// Proportional Sizes & Distances as defined in public/size-and-distance.md:
// Sizes scaled down uniformly by 10x: Sun (50.0), Mercury (2.35), Venus (3.0), Earth (6.92), Mars (3.35), Jupiter (2.75), Saturn (8.0), Uranus (3.5), Neptune (3.2)
// Distances are dynamically adjusted at runtime based on these scales to prevent planet clipping.
const PLANETS: PlanetConfig[] = [
  {
    name: "Sun",
    modelPath: "/sun/source/UnstableStar.fbx",
    texturePath: "/sun/textures/suncyl1.jpg",
    position: [0, 0, 0], // Center
    isEmissive: true,
    scale: 50.0, // Scale modified by user
  },
  {
    name: "Mercury",
    modelPath: "/planet-mercury/Mercury 1K.obj",
    texturePath: "/planet-mercury/Textures/Diffuse_1K.png",
    bumpMapPath: "/planet-mercury/Textures/Bump_1K.png",
    position: [25, 0, 0],
    scale: 2.35, // User customized scale
  },
  {
    name: "Venus",
    modelPath: "/venus/Venus_1K.obj",
    texturePath: "/venus/Textures/Diffuse_1K.png",
    bumpMapPath: "/venus/Textures/Bump_1K.png",
    position: [35, 0, 0],
    scale: 3.00, // User customized scale
  },
  {
    name: "Earth",
    modelPath: "/earth/Earth 2K.obj",
    texturePath: "/earth/Textures/Diffuse_2K.png",
    bumpMapPath: "/earth/Textures/Bump_2K.png",
    position: [50, 0, 0],
    scale: 6.92, // User customized scale
  },
  {
    name: "Mars",
    modelPath: "", // Empty path triggers the high-quality SpherePlanet fallback
    texturePath: "/mars/MARTE/TEXTURES/Marte_HD.jpg",
    bumpMapPath: "/mars/MARTE/TEXTURES/Marte_Bump.jpg",
    position: [70, 0, 0],
    scale: 3.35, // User customized scale
  },
  {
    name: "Jupiter",
    modelPath: "/jupitar/source/maya2sketchfab.fbx",
    texturePath: "/jupitar/textures/8k_jupiter.jpeg",
    position: [140, 0, 0],
    scale: 2.75, // User customized scale
  },
  {
    name: "Saturn",
    modelPath: "", // Set to empty to bypass corrupted FBX file and trigger SpherePlanet + procedural rings fallback
    texturePath: "/saturn/textures/Saturn_d.jpg",
    bumpMapPath: "/saturn/textures/Saturn_n.jpg",
    ringTexturePath: "/saturn/textures/Rings_d.jpg",
    position: [210, 0, 0],
    scale: 8.00, // User customized scale
  },
  {
    name: "Uranus",
    modelPath: "", // Bypass heavy/corrupted FBX to trigger fast SpherePlanet + procedural rings fallback
    texturePath: "/uranus/textures/Uv1_uranus1_diff.png",
    bumpMapPath: "/uranus/textures/Uv2_uranus1_bump.png",
    ringTexturePath: "/uranus/textures/Uv1_uranus2_diff.png", // Uranus ring texture
    position: [280, 0, 0],
    scale: 4.50, // Proportional scale
  },
  {
    name: "Neptune",
    modelPath: "", // Bypass FBX model to trigger fast SpherePlanet fallback
    texturePath: "/neptune/textures/2k_neptune.jpg",
    position: [350, 0, 0],
    scale: 4.20, // Proportional scale
  },
];

function Loader() {
  return (
    <mesh>
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshBasicMaterial color="#4da6ff" wireframe />
    </mesh>
  );
}

// Renders a thin orbital ring in the X-Z plane
function OrbitPath({ radius }: { radius: number }) {
  const points = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 128; i++) {
      const theta = (i / 128) * Math.PI * 2;
      pts.push([Math.cos(theta) * radius, 0, Math.sin(theta) * radius] as [number, number, number]);
    }
    return pts;
  }, [radius]);

  return (
    <Line
      points={points}
      color="#4da6ff"
      lineWidth={1}
      opacity={0.18}
      transparent
    />
  );
}

// Renders a glowing, smoky space dust cloud ring over the asteroid belt using particles
function DustRing({ innerRadius = 80, outerRadius = 100, count = 2500 }: { innerRadius?: number; outerRadius?: number; count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);

  const [positions] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const radius = innerRadius + Math.random() * (outerRadius - innerRadius);
      const theta = Math.random() * Math.PI * 2;
      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius;
      const y = (Math.random() - 0.5) * 1.8; // vertical dispersion of smoke/dust

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
    }
    return [pos];
  }, [innerRadius, outerRadius, count]);

  // Rotate the entire dust cloud slowly for extra realism
  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.getElapsedTime() * 0.015;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#54a8e6" // Cyan-blue cosmic gas color
        size={0.15}
        opacity={0.28}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// Renders the asteroid belt procedurally using instanced meshes for high performance
function AsteroidBelt({ innerRadius = 80, outerRadius = 100, count = 1800 }: { innerRadius?: number; outerRadius?: number; count?: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const texture = useTexture("/asteroid-belt/textures/asteroid2.jpeg");

  // Generate semi-random orbit parameters for each asteroid
  const asteroidData = useMemo(() => {
    const data = [];
    for (let i = 0; i < count; i++) {
      const radius = innerRadius + Math.random() * (outerRadius - innerRadius);
      const theta = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 1.2; // slight vertical scatter
      
      // Enlarged size (3x larger than before) for clear visibility
      const scale = 0.15 + Math.random() * 0.22;
      
      // Random non-spherical distortion along X, Y, Z axes for jagged, irregular shapes
      const deformX = 0.75 + Math.random() * 0.5;
      const deformY = 0.75 + Math.random() * 0.5;
      const deformZ = 0.75 + Math.random() * 0.5;

      const speed = 0.03 + Math.random() * 0.08; // orbit speed
      const rotSpeed = (Math.random() - 0.5) * 0.5;

      data.push({
        radius,
        theta,
        y,
        scale,
        deformX,
        deformY,
        deformZ,
        speed,
        rotSpeed,
        rotX: Math.random() * Math.PI,
        rotY: Math.random() * Math.PI,
        rotZ: Math.random() * Math.PI,
      });
    }
    return data;
  }, [innerRadius, outerRadius, count]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    const tempObject = new THREE.Object3D();

    asteroidData.forEach((ast, i) => {
      // Orbit rotation: update angle theta
      ast.theta += delta * ast.speed * 0.2;
      
      // Update coordinates
      const x = Math.cos(ast.theta) * ast.radius;
      const z = Math.sin(ast.theta) * ast.radius;
      tempObject.position.set(x, ast.y, z);

      // Apply randomized and deformed scales for unique oblong rock shapes
      tempObject.scale.set(ast.scale * ast.deformX, ast.scale * ast.deformY, ast.scale * ast.deformZ);

      // Rotate rock itself
      ast.rotX += delta * ast.rotSpeed;
      ast.rotY += delta * ast.rotSpeed;
      tempObject.rotation.set(ast.rotX, ast.rotY, ast.rotZ);

      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObject.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null as any, null as any, count]} castShadow receiveShadow>
      <dodecahedronGeometry args={[1, 1]} />
      <meshStandardMaterial
        map={texture}
        roughness={0.85}
        metalness={0.25}
        // Subtle grey-blue space dust glow to stand out against the background stars
        emissive={new THREE.Color("#2c3e50")}
        emissiveIntensity={0.65}
      />
    </instancedMesh>
  );
}

// Renders the Jupiter Trojan asteroid groups at Lagrange points L4 (+60 deg) and L5 (-60 deg)
// They revolve in sync around the Sun, locked to Jupiter's real-time orbital angle.
function TrojanAsteroids({ orbitRadius, count = 400 }: { orbitRadius: number; count?: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const texture = useTexture("/asteroid-belt/textures/asteroid2.jpeg");

  const asteroidData = useMemo(() => {
    const data = [];
    const halfCount = Math.floor(count / 2);

    for (let i = 0; i < count; i++) {
      const isL4 = i < halfCount;
      const baseTheta = isL4 ? Math.PI / 3 : -Math.PI / 3;

      // Random angle offset around Lagrange point
      const angleOffset = (Math.random() - 0.5) * 0.45;
      const radius = orbitRadius + (Math.random() - 0.5) * 3.5;
      const y = (Math.random() - 0.5) * 1.5;

      const scale = 0.12 + Math.random() * 0.18;
      const deformX = 0.75 + Math.random() * 0.5;
      const deformY = 0.75 + Math.random() * 0.5;
      const deformZ = 0.75 + Math.random() * 0.5;

      const rotSpeed = (Math.random() - 0.5) * 0.5;

      data.push({
        radius,
        angleOffset,
        isL4,
        y,
        scale,
        deformX,
        deformY,
        deformZ,
        rotSpeed,
        rotX: Math.random() * Math.PI,
        rotY: Math.random() * Math.PI,
        rotZ: Math.random() * Math.PI,
      });
    }
    return data;
  }, [orbitRadius, count]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    // Jupiter's current orbital angle calculated directly from real system time clock
    const jupiterTheta = getLivePlanetAngle("jupiter");

    const tempObject = new THREE.Object3D();

    asteroidData.forEach((ast, i) => {
      const baseTheta = ast.isL4 ? Math.PI / 3 : -Math.PI / 3;
      const theta = jupiterTheta + baseTheta + ast.angleOffset;

      const x = Math.cos(theta) * ast.radius;
      const z = Math.sin(theta) * ast.radius;
      tempObject.position.set(x, ast.y, z);

      tempObject.scale.set(ast.scale * ast.deformX, ast.scale * ast.deformY, ast.scale * ast.deformZ);

      ast.rotX += delta * ast.rotSpeed;
      ast.rotY += delta * ast.rotSpeed;
      tempObject.rotation.set(ast.rotX, ast.rotY, ast.rotZ);

      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObject.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null as any, null as any, count]} castShadow receiveShadow>
      <dodecahedronGeometry args={[1, 1]} />
      <meshStandardMaterial
        map={texture}
        roughness={0.85}
        metalness={0.25}
        emissive={new THREE.Color("#2c3e50")}
        emissiveIntensity={0.65}
      />
    </instancedMesh>
  );
}

// Renders soft smoky gas clouds for the Trojan asteroid arcs revolving with Jupiter in real-time
function TrojanDust({ orbitRadius, count = 800 }: { orbitRadius: number; count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);

  const asteroidData = useMemo(() => {
    const data = [];
    const halfCount = Math.floor(count / 2);

    for (let i = 0; i < count; i++) {
      const isL4 = i < halfCount;
      const baseTheta = isL4 ? Math.PI / 3 : -Math.PI / 3;
      const angleOffset = (Math.random() - 0.5) * 0.55;
      const radius = orbitRadius + (Math.random() - 0.5) * 5.5;
      const y = (Math.random() - 0.5) * 1.8;

      data.push({
        radius,
        angleOffset,
        isL4,
        y,
      });
    }
    return data;
  }, [orbitRadius, count]);

  useFrame(() => {
    if (!pointsRef.current) return;

    // Jupiter's current orbital angle calculated directly from real system time clock
    const jupiterTheta = getLivePlanetAngle("jupiter");

    const positionAttribute = pointsRef.current.geometry.getAttribute("position") as THREE.BufferAttribute;

    for (let i = 0; i < count; i++) {
      const ast = asteroidData[i];
      const baseTheta = ast.isL4 ? Math.PI / 3 : -Math.PI / 3;
      const theta = jupiterTheta + baseTheta + ast.angleOffset;

      const x = Math.cos(theta) * ast.radius;
      const z = Math.sin(theta) * ast.radius;

      positionAttribute.setXYZ(i, x, ast.y, z);
    }

    positionAttribute.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[new Float32Array(count * 3), 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#2ec4b6" // Distinct teal gas color for Trojan clouds
        size={0.16}
        opacity={0.28}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

interface CameraControllerProps {
  activePlanetIndex: number;
  planetRefs: React.RefObject<(THREE.Group | null)[]>;
  targetScale: number;
  maxSystemRadius: number;
}

function CameraController({ activePlanetIndex, planetRefs, targetScale, maxSystemRadius }: CameraControllerProps) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  
  // Track camera fly-to transition animation state
  const animationRef = useRef<{
    startTarget: THREE.Vector3;
    endTarget: THREE.Vector3;
    startCamera: THREE.Vector3;
    endCamera: THREE.Vector3;
    progress: number;
    duration: number; // duration in seconds
  } | null>(null);

  // Trigger fly-to target changes when focused planet index or scale updates
  useEffect(() => {
    const activeGroup = planetRefs.current?.[activePlanetIndex];
    if (controlsRef.current && activeGroup) {
      const currentPlanetPos = new THREE.Vector3();
      activeGroup.getWorldPosition(currentPlanetPos);

      // Find current looking direction
      const currentDir = new THREE.Vector3().subVectors(camera.position, controlsRef.current.target).normalize();
      
      // If direction is invalid, fallback to an angled view
      if (currentDir.lengthSq() === 0 || Number.isNaN(currentDir.x)) {
        currentDir.set(0, 0.5, 0.866).normalize();
      }
      
      // Proportional camera distance based on target size
      const targetDistance = 1.5 + targetScale * 2.2;
      
      // End camera position is target planet position + offset in looking direction
      const endCameraPos = new THREE.Vector3().copy(currentPlanetPos).addScaledVector(currentDir, targetDistance);

      animationRef.current = {
        startTarget: new THREE.Vector3().copy(controlsRef.current.target),
        endTarget: currentPlanetPos,
        startCamera: new THREE.Vector3().copy(camera.position),
        endCamera: endCameraPos,
        progress: 0,
        duration: 1.2, // Smooth transition
      };
    }
  }, [activePlanetIndex, targetScale, camera, planetRefs]);

  const minZoomDistance = useMemo(() => {
    const focusedPlanet = PLANETS[activePlanetIndex];
    if (!focusedPlanet) return 1.5;

    const isSaturnOrUranus = 
      focusedPlanet.ringTexturePath || 
      focusedPlanet.name.toLowerCase() === "saturn" || 
      focusedPlanet.name.toLowerCase() === "uranus";

    // Rings extend to 2.3x the radius, so we need a larger minDistance to keep them in view (increased to 3.6x)
    if (isSaturnOrUranus) {
      return targetScale * 3.6;
    }

    // Standard planet (increased to 2.2x to prevent camera clipping inside Neptune, Jupiter, and Mars)
    return targetScale * 2.2;
  }, [activePlanetIndex, targetScale]);

  // Event listeners for the Zoom HUD buttons (+ and -) in the bottom-right corner
  useEffect(() => {
    const handleZoomIn = () => {
      if (!controlsRef.current) return;
      const target = controlsRef.current.target;
      const direction = new THREE.Vector3().subVectors(camera.position, target).normalize();
      const currentDistance = camera.position.distanceTo(target);

      // Move 15% closer to the target planet
      const zoomStep = Math.max(1, currentDistance * 0.15);
      const newDistance = Math.max(minZoomDistance, currentDistance - zoomStep);

      camera.position.copy(target).addScaledVector(direction, newDistance);
      controlsRef.current.update();
    };

    const handleZoomOut = () => {
      if (!controlsRef.current) return;
      const target = controlsRef.current.target;
      const direction = new THREE.Vector3().subVectors(camera.position, target).normalize();
      const currentDistance = camera.position.distanceTo(target);

      // Move 15% further away from the target planet
      const zoomStep = Math.max(1, currentDistance * 0.15);
      const newDistance = Math.min(maxSystemRadius * 5.0, currentDistance + zoomStep);

      camera.position.copy(target).addScaledVector(direction, newDistance);
      controlsRef.current.update();
    };

    window.addEventListener("zoom-in", handleZoomIn);
    window.addEventListener("zoom-out", handleZoomOut);
    return () => {
      window.removeEventListener("zoom-in", handleZoomIn);
      window.removeEventListener("zoom-out", handleZoomOut);
    };
  }, [camera, minZoomDistance, maxSystemRadius]);

  useFrame((_, delta) => {
    if (!controlsRef.current) return;

    // Get current moving position of focused planet from forwarded refs
    const activeGroup = planetRefs.current?.[activePlanetIndex];
    if (!activeGroup) return;

    const currentPlanetPos = new THREE.Vector3();
    activeGroup.getWorldPosition(currentPlanetPos);

    if (animationRef.current) {
      const anim = animationRef.current;
      anim.progress += delta / anim.duration;

      // Dynamically update end targets to follow the moving planet in mid-flight!
      anim.endTarget.copy(currentPlanetPos);

      const currentDir = new THREE.Vector3().subVectors(camera.position, controlsRef.current.target).normalize();
      if (currentDir.lengthSq() === 0 || Number.isNaN(currentDir.x)) {
        currentDir.set(0, 0.5, 0.866).normalize();
      }
      const targetDistance = 1.5 + targetScale * 2.2;
      anim.endCamera.copy(currentPlanetPos).addScaledVector(currentDir, targetDistance);

      if (anim.progress >= 1) {
        // Animation complete: lock controls directly
        controlsRef.current.target.copy(anim.endTarget);
        camera.position.copy(anim.endCamera);
        
        controlsRef.current.update();
        animationRef.current = null; // Release controls to the user
      } else {
        // Cubic ease in-out interpolation
        const t = anim.progress;
        const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

        const newTarget = new THREE.Vector3().lerpVectors(anim.startTarget, anim.endTarget, eased);
        const newCamera = new THREE.Vector3().lerpVectors(anim.startCamera, anim.endCamera, eased);

        controlsRef.current.target.copy(newTarget);
        camera.position.copy(newCamera);
        
        controlsRef.current.update();
      }
    } else {
      // Direct tracking lock: Shift camera position with the planet's movement
      const displacement = new THREE.Vector3().subVectors(currentPlanetPos, controlsRef.current.target);
      camera.position.add(displacement);
      
      // Update camera focus point
      controlsRef.current.target.copy(currentPlanetPos);
      controlsRef.current.update();
    }

    // High-performance direct DOM mutation to update zoom percentage text in bottom right
    const target = controlsRef.current.target;
    const distance = camera.position.distanceTo(target);
    const maxZoomDistance = maxSystemRadius * 5.0;

    const range = maxZoomDistance - minZoomDistance;
    const percentage = ((maxZoomDistance - distance) / range) * 100;
    const clampedPercent = Math.max(0, Math.min(100, Math.round(percentage)));

    const textEl = document.getElementById("zoom-percentage-text");
    if (textEl) {
      textEl.innerText = `${clampedPercent}%`;
    }
  });

  return (
    <TrackballControls
      ref={controlsRef}
      noPan={false} // Allow free panning
      noZoom={false} // Allow zooming via scroll wheel
      minDistance={minZoomDistance}
      maxDistance={maxSystemRadius * 5.0} // Increased zoom out limit so you can see all planets in one screen
      staticMoving={false}
      dynamicDampingFactor={0.05}
    />
  );
}

interface SceneProps {
  activePlanetIndex: number;
  onSelectPlanet: (index: number) => void;
}

export default function Scene({ activePlanetIndex, onSelectPlanet }: SceneProps) {
  const [targetPosition, setTargetPosition] = useState(new THREE.Vector3(0, 0, 0));
  const [targetScale, setTargetScale] = useState(10.0);

  // References to all moving planet groups for camera tracking
  const planetRefs = useRef<(THREE.Group | null)[]>([]);

  // Dynamically calculate the horizontal positions and orbit paths of all bodies
  // based on planet scales to prevent clipping and overlap.
  const computedSystem = useMemo(() => {
    const bodies: PlanetConfig[] = [];
    const gaps = [
      15.0, // Sun -> Mercury
      10.0, // Mercury -> Venus
      15.0, // Venus -> Earth
      20.0, // Earth -> Mars
      10.0, // Mars -> Asteroid Belt (Inner)
      40.0, // Asteroid Belt (Outer) -> Jupiter
      65.0, // Jupiter -> Saturn
      70.0, // Saturn -> Uranus
      75.0, // Uranus -> Neptune
    ];

    // 1. Sun
    const sun = PLANETS[0];
    const sunScale = sun.scale ?? 1.0;
    bodies.push({
      ...sun,
      position: [0, 0, 0],
    });

    let currentBoundary = sunScale;

    // 2. Mercury
    const mercury = PLANETS[1];
    const mercuryScale = mercury.scale ?? 1.0;
    const mercuryDist = currentBoundary + gaps[0] + mercuryScale;
    bodies.push({
      ...mercury,
      position: [mercuryDist, 0, 0],
    });
    currentBoundary = mercuryDist + mercuryScale;

    // 3. Venus
    const venus = PLANETS[2];
    const venusScale = venus.scale ?? 1.0;
    const venusDist = currentBoundary + gaps[1] + venusScale;
    bodies.push({
      ...venus,
      position: [venusDist, 0, 0],
    });
    currentBoundary = venusDist + venusScale;

    // 4. Earth
    const earth = PLANETS[3];
    const earthScale = earth.scale ?? 1.0;
    const earthDist = currentBoundary + gaps[2] + earthScale;
    bodies.push({
      ...earth,
      position: [earthDist, 0, 0],
    });
    currentBoundary = earthDist + earthScale;

    // 5. Mars
    const mars = PLANETS[4];
    const marsScale = mars.scale ?? 1.0;
    const marsDist = currentBoundary + gaps[3] + marsScale;
    bodies.push({
      ...mars,
      position: [marsDist, 0, 0],
    });
    currentBoundary = marsDist + marsScale;

    // 6. Asteroid Belt
    const asteroidInner = currentBoundary + gaps[4];
    const asteroidOuter = asteroidInner + 20.0;
    currentBoundary = asteroidOuter;

    // 7. Jupiter
    const jupiter = PLANETS[5];
    const jupiterScale = jupiter.scale ?? 1.0;
    const jupiterDist = currentBoundary + gaps[5] + jupiterScale;
    bodies.push({
      ...jupiter,
      position: [jupiterDist, 0, 0],
    });
    currentBoundary = jupiterDist + jupiterScale;

    // 8. Saturn
    const saturn = PLANETS[6];
    const saturnScale = saturn.scale ?? 1.0;
    const saturnDist = currentBoundary + gaps[6] + saturnScale;
    bodies.push({
      ...saturn,
      position: [saturnDist, 0, 0],
    });
    currentBoundary = saturnDist + saturnScale;

    // 9. Uranus
    const uranus = PLANETS[7];
    const uranusScale = uranus.scale ?? 1.0;
    const uranusDist = currentBoundary + gaps[7] + uranusScale;
    bodies.push({
      ...uranus,
      position: [uranusDist, 0, 0],
    });
    currentBoundary = uranusDist + uranusScale;

    // 10. Neptune
    const neptune = PLANETS[8];
    const neptuneScale = neptune.scale ?? 1.0;
    const neptuneDist = currentBoundary + gaps[8] + neptuneScale;
    bodies.push({
      ...neptune,
      position: [neptuneDist, 0, 0],
    });
    currentBoundary = neptuneDist + neptuneScale;

    return {
      planets: bodies,
      asteroidBelt: {
        innerRadius: asteroidInner,
        outerRadius: asteroidOuter,
      },
      maxSystemRadius: currentBoundary,
    };
  }, [PLANETS]);

  // Sync target position & scale when active index changes (via dots/keys/clicks)
  useEffect(() => {
    const planet = computedSystem.planets[activePlanetIndex];
    if (planet) {
      // Get the current mesh from planetRefs if it is already mounted
      const activeGroup = planetRefs.current[activePlanetIndex];
      if (activeGroup) {
        const worldPos = new THREE.Vector3();
        activeGroup.getWorldPosition(worldPos);
        setTargetPosition(worldPos);
      } else {
        // Fallback for initial render using live angle calculation
        const angle = getLivePlanetAngle(planet.name);
        const orbitRadius = planet.position[0];
        if (orbitRadius > 0 && planet.name.toLowerCase() !== "sun") {
          const x = Math.cos(angle) * orbitRadius;
          const z = Math.sin(angle) * orbitRadius;
          setTargetPosition(new THREE.Vector3(x, 0, z));
        } else {
          setTargetPosition(new THREE.Vector3(...planet.position));
        }
      }
      setTargetScale(planet.scale ?? 1.0);
    }
  }, [activePlanetIndex, computedSystem]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <Canvas
        camera={{ position: [0, 15, 30], fov: 45, far: 25000 }} // Set far to 25000 to prevent clipping/disappearing at far zooms
        style={{ background: "transparent" }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        {/* Lighting */}
        <ambientLight intensity={0.38} color="#ffffff" />
        {/* Central PointLight at the Sun (0, 0, 0) emitting radial light dynamically extending past Neptune */}
        <pointLight 
          position={[0, 0, 0]} 
          intensity={4.0} 
          distance={computedSystem.maxSystemRadius * 1.5} 
          decay={0} 
          color="#ffe5b4" 
        />

        {/* Starfield */}
        <Stars
          radius={computedSystem.maxSystemRadius * 1.2}
          depth={150}
          count={5000}
          factor={4}
          saturation={0}
          fade
          speed={1}
        />

        {/* Dynamic Orbital paths matching the calculated planet distances */}
        {computedSystem.planets.map((p) => {
          if (p.name === "Sun") return null;
          return <OrbitPath key={`orbit-${p.name}`} radius={p.position[0]} />;
        })}

        {/* Smoky space gas/dust ring over the asteroid belt */}
        <DustRing 
          innerRadius={computedSystem.asteroidBelt.innerRadius} 
          outerRadius={computedSystem.asteroidBelt.outerRadius} 
          count={2500} 
        />

        {/* Asteroid Belt right after Mars */}
        <Suspense fallback={null}>
          <AsteroidBelt 
            innerRadius={computedSystem.asteroidBelt.innerRadius} 
            outerRadius={computedSystem.asteroidBelt.outerRadius} 
            count={1800} 
          />
        </Suspense>

        {/* Jupiter Trojan Asteroid Groups (L4 & L5 Lagrange points) & gas clouds */}
        <Suspense fallback={null}>
          <TrojanDust orbitRadius={computedSystem.planets[5].position[0]} count={1000} />
          <TrojanAsteroids orbitRadius={computedSystem.planets[5].position[0]} count={400} />
        </Suspense>

        {/* Solar System Ecosystem */}
        <Suspense fallback={<Loader />}>
          {computedSystem.planets.map((planet, index) => (
            <Planet
              key={planet.name}
              ref={(el) => {
                planetRefs.current[index] = el;
              }}
              name={planet.name}
              modelPath={planet.modelPath}
              texturePath={planet.texturePath}
              bumpMapPath={planet.bumpMapPath}
              ringTexturePath={planet.ringTexturePath}
              orbitRadius={planet.position[0]} // Orbital radius
              position={planet.position}
              isEmissive={planet.isEmissive}
              scale={planet.scale}
              onClick={() => onSelectPlanet(index)}
            />
          ))}
        </Suspense>

        {/* Custom Camera Pan/Zoom/Rotate Controller */}
        <CameraController 
          activePlanetIndex={activePlanetIndex}
          planetRefs={planetRefs}
          targetScale={targetScale} 
          maxSystemRadius={computedSystem.maxSystemRadius} 
        />
      </Canvas>

      {/* Premium Glassmorphic Zoom HUD with Interactive Controls (+ and -) */}
      <div style={{
        position: "absolute",
        bottom: "24px",
        right: "24px",
        background: "rgba(10, 15, 30, 0.65)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(77, 166, 255, 0.25)",
        borderRadius: "8px",
        padding: "10px 16px",
        color: "#4da6ff",
        fontFamily: "'Outfit', 'Inter', sans-serif",
        fontSize: "14px",
        fontWeight: 600,
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        gap: "14px",
        letterSpacing: "0.5px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "rgba(77, 166, 255, 0.6)", fontSize: "11px", fontWeight: 700 }}>ZOOM LEVEL</span>
          <span id="zoom-percentage-text" style={{ fontSize: "16px", color: "#ffffff", minWidth: "46px", textAlign: "right" }}>50%</span>
        </div>
        
        {/* Vertical Divider */}
        <div style={{ width: "1px", height: "20px", background: "rgba(77, 166, 255, 0.25)" }}></div>
        
        {/* Interactive Clickable Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent("zoom-out"))}
            style={{
              background: "rgba(77, 166, 255, 0.1)",
              border: "1px solid rgba(77, 166, 255, 0.3)",
              borderRadius: "4px",
              width: "28px",
              height: "28px",
              color: "#ffffff",
              fontSize: "18px",
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s ease",
              pointerEvents: "auto"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(77, 166, 255, 0.25)";
              e.currentTarget.style.borderColor = "rgba(77, 166, 255, 0.6)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(77, 166, 255, 0.1)";
              e.currentTarget.style.borderColor = "rgba(77, 166, 255, 0.3)";
            }}
          >
            -
          </button>
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent("zoom-in"))}
            style={{
              background: "rgba(77, 166, 255, 0.1)",
              border: "1px solid rgba(77, 166, 255, 0.3)",
              borderRadius: "4px",
              width: "28px",
              height: "28px",
              color: "#ffffff",
              fontSize: "18px",
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s ease",
              pointerEvents: "auto"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(77, 166, 255, 0.25)";
              e.currentTarget.style.borderColor = "rgba(77, 166, 255, 0.6)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(77, 166, 255, 0.1)";
              e.currentTarget.style.borderColor = "rgba(77, 166, 255, 0.3)";
            }}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

export { PLANETS };

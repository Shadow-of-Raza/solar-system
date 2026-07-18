"use client";

import { useRef, useMemo, forwardRef, useImperativeHandle } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import * as THREE from "three";

interface PlanetProps {
  name: string; // Dynamic planet name (used to calculate live astronomical orbit and axial positions)
  modelPath: string;
  texturePath: string;
  bumpMapPath?: string;
  ringTexturePath?: string; // Optional ring texture path (used for Saturn)
  orbitRadius?: number; // Orbital radius around the Sun
  position?: [number, number, number];
  onClick?: () => void;
  isEmissive?: boolean;
  scale?: number;
}

// Helper to calculate the live astronomical longitude angle of a planet at J2000 epoch relative to today's date/time
const getLivePlanetAngle = (planetName: string): number => {
  const J2000 = new Date(Date.UTC(2000, 0, 1, 12, 0, 0)).getTime();
  const msPerSecond = 1000;
  const elapsedSeconds = (Date.now() - J2000) / msPerSecond; // seconds elapsed since J2000.0

  let periodSeconds = 1;

  // Use the exact astronomical orbital period (in Earth seconds) from the user's table
  switch (planetName.toLowerCase()) {
    case "mercury":
      periodSeconds = 87 * 86400 + 23 * 3600 + 15 * 60 + 43; // 87 days 23 hours 15 mins 43 secs
      break;
    case "venus":
      periodSeconds = 224 * 86400 + 16 * 3600 + 49 * 60 + 15; // 224 days 16 hours 49 mins 15 secs
      break;
    case "earth":
      periodSeconds = 365 * 86400 + 6 * 3600 + 9 * 60 + 9 + 0.760; // 365 days 6 hours 9 mins 9 secs 760 ms
      break;
    case "mars":
      periodSeconds = 686 * 86400 + 23 * 3600 + 30 * 60 + 41 + 0.400; // 686 days 23 hours 30 mins 41 secs 400 ms
      break;
    case "jupiter":
      periodSeconds = 4332 * 86400 + 14 * 3600 + 2 * 60 + 9 + 0.600; // 4332 days 14 hours 2 mins 9 secs 600 ms
      break;
    case "saturn":
      periodSeconds = 10759 * 86400 + 5 * 3600 + 16 * 60 + 7 + 0.200; // 10759 days 5 hours 16 mins 7 secs 200 ms
      break;
    case "uranus":
      periodSeconds = 30688 * 86400 + 12 * 3600 + 18 * 60; // 30688 days 12 hours 18 mins 0 secs
      break;
    case "neptune":
      periodSeconds = 60182 * 86400 + 56 * 60; // 60182 days 0 hours 56 mins 0 secs
      break;
    default:
      return 0;
  }

  // Heliocentric mean longitude at epoch J2000.0 (degrees)
  let L0 = 0;
  switch (planetName.toLowerCase()) {
    case "mercury": L0 = 252.25; break;
    case "venus": L0 = 181.98; break;
    case "earth": L0 = 100.46; break;
    case "mars": L0 = 355.45; break;
    case "jupiter": L0 = 34.40; break;
    case "saturn": L0 = 50.08; break;
    case "uranus": L0 = 313.23; break;
    case "neptune": L0 = 304.88; break;
  }

  const startAngleRad = (L0 * Math.PI) / 180;
  const angularSpeed = (2 * Math.PI) / periodSeconds;
  
  // Total orbital angle = starting position + (angular speed * elapsed seconds in real-time)
  const totalAngle = startAngleRad + angularSpeed * elapsedSeconds;
  
  return totalAngle % (Math.PI * 2);
};

// Helper to calculate the live astronomical axial rotation angle of a planet around itself relative to today's date/time
const getLiveAxialAngle = (planetName: string): number => {
  const J2000 = new Date(Date.UTC(2000, 0, 1, 12, 0, 0)).getTime();
  const msPerSecond = 1000;
  const elapsedSeconds = (Date.now() - J2000) / msPerSecond; // seconds elapsed since J2000.0

  let periodSeconds = 1;
  let isRetrograde = false;

  // Use the exact astronomical rotation periods (sidereal rotation periods) from the user's table
  switch (planetName.toLowerCase()) {
    case "mercury":
      periodSeconds = 58.646225 * 86400; // 58.646225 days
      break;
    case "venus":
      periodSeconds = 243.025 * 86400; // 243.025 days
      isRetrograde = true; // Venus rotates backwards (retrograde)
      break;
    case "earth": {
      // Sync Earth's self-rotation directly to the Sun's position and the actual time of day (UTC).
      // This guarantees India (and all other regions) faces the Sun during its local daylight hours,
      // showing correct noon/midnight illumination on the 3D globe relative to the central PointLight.
      const orbitAngle = getLivePlanetAngle("earth");
      const sunAngle = orbitAngle + Math.PI; // Direction pointing to the Sun from Earth

      const now = new Date();
      const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600 + now.getUTCMilliseconds() / 3600000;

      // Prime Meridian (Greenwich) faces the Sun at exactly 12:00 UTC (noon).
      // At other hours, Earth rotates counter-clockwise (positive Y) by 15 degrees per hour.
      return (sunAngle + utcHours * (Math.PI / 12)) % (Math.PI * 2);
    }
    case "mars":
      periodSeconds = 24 * 3600 + 37 * 60 + 22.663; // 24h 37m 22.663s
      break;
    case "jupiter":
      periodSeconds = 9 * 3600 + 55 * 60 + 29.711; // 9h 55m 29.711s
      break;
    case "saturn":
      periodSeconds = 10 * 3600 + 33 * 60 + 38; // 10h 33m 38s
      break;
    case "uranus":
      periodSeconds = 17 * 3600 + 14 * 60 + 24; // 17h 14m 24s
      isRetrograde = true; // Uranus rotates backwards (retrograde)
      break;
    case "neptune":
      periodSeconds = 16 * 3600 + 6 * 60 + 36; // 16h 6m 36s
      break;
    case "sun":
      periodSeconds = 25.38 * 86400; // Sidereal equatorial rotation period of 25.38 days
      break;
    default:
      return 0;
  }

  const angularSpeed = (2 * Math.PI) / periodSeconds;
  const direction = isRetrograde ? -1 : 1;
  
  // Return the dynamic rotation angle (mod 2pi)
  return (direction * angularSpeed * elapsedSeconds) % (Math.PI * 2);
};

// Fallback sphere geometry planet with support for procedural rings (used for Saturn and Mars)
// We keep geometries at unit size and apply targetRadius as a reactive scale on the group container.
// This guarantees instant, reactive size updates when scale values change in Scene.tsx.
function SpherePlanet({ texturePath, bumpMapPath, ringTexturePath, isEmissive, targetRadius }: PlanetProps & { targetRadius: number }) {
  const texture = useTexture(texturePath);
  const bumpMap = bumpMapPath ? useTexture(bumpMapPath) : null;
  const ringTexture = ringTexturePath ? useTexture(ringTexturePath) : null;

  return (
    <group scale={[targetRadius, targetRadius, targetRadius]}>
      {/* Planet Body */}
      <mesh castShadow={!isEmissive} receiveShadow={!isEmissive}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial
          map={texture}
          bumpMap={bumpMap ?? null}
          bumpScale={bumpMap ? 0.05 : 0}
          metalness={isEmissive ? 0 : 0.1}
          roughness={isEmissive ? 0.9 : 0.7}
          emissive={isEmissive ? new THREE.Color(0xffffff) : new THREE.Color(0x000000)}
          emissiveMap={isEmissive ? texture : null}
          emissiveIntensity={isEmissive ? 1.5 : 0}
        />
      </mesh>

      {/* Saturn Rings */}
      {ringTexture && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          {/* Proportional ring radii relative to the unit sphere */}
          <ringGeometry args={[1.3, 2.3, 64]} />
          <meshStandardMaterial
            map={ringTexture}
            // Rings lie flat on X-Z plane, so they receive 0 direct light from the Sun at (0,0,0).
            // We apply emissive self-illumination mapping the ring texture to simulate sunlight scattering.
            emissiveMap={ringTexture}
            emissive={new THREE.Color("#ffffff")}
            emissiveIntensity={0.7}
            transparent
            opacity={0.85}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}

function ObjPlanet({ modelPath, texturePath, bumpMapPath, ringTexturePath, isEmissive, targetRadius }: PlanetProps & { targetRadius: number }) {
  const obj = useLoader(OBJLoader, modelPath);
  const texture = useTexture(texturePath);
  const bumpMap = bumpMapPath ? useTexture(bumpMapPath) : null;
  const ringTexture = ringTexturePath ? useTexture(ringTexturePath) : null;

  // Compute scale factor and center offset of the compound model
  const { scaleFactor, centerOffset } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(obj);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);
    const scale = 1 / (sphere.radius || 1);
    return { scaleFactor: scale, centerOffset: center.clone().multiplyScalar(-1) };
  }, [obj]);

  const model = useMemo(() => {
    const cloned = obj.clone();

    // Apply materials
    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const isRing = child.name.toLowerCase().includes("ring") && ringTexture;
        child.material = new THREE.MeshStandardMaterial({
          map: isRing ? ringTexture : texture,
          bumpMap: isRing ? null : (bumpMap ?? null),
          bumpScale: isRing ? 0 : (bumpMap ? 0.05 : 0),
          metalness: isRing ? 0 : (isEmissive ? 0 : 0.1),
          roughness: isRing ? 0.9 : (isEmissive ? 0.9 : 0.7),
          emissive: isRing ? new THREE.Color("#ffffff") : (isEmissive ? new THREE.Color(0xffffff) : new THREE.Color(0x000000)),
          emissiveMap: isRing ? ringTexture : (isEmissive ? texture : null),
          emissiveIntensity: isRing ? 0.7 : (isEmissive ? 1.5 : 0),
          transparent: !!isRing,
          opacity: isRing ? 0.85 : 1,
          side: isRing ? THREE.DoubleSide : THREE.FrontSide,
        });
        child.castShadow = !isEmissive;
        child.receiveShadow = !isEmissive;
      }
    });

    return cloned;
  }, [obj, texture, bumpMap, ringTexture, isEmissive]);

  const finalScale = scaleFactor * targetRadius;

  return (
    <group scale={[finalScale, finalScale, finalScale]}>
      <primitive object={model} position={[centerOffset.x, centerOffset.y, centerOffset.z]} />
    </group>
  );
}

function FbxPlanet({ modelPath, texturePath, bumpMapPath, ringTexturePath, isEmissive, targetRadius }: PlanetProps & { targetRadius: number }) {
  const fbx = useLoader(FBXLoader, modelPath);
  const texture = useTexture(texturePath);
  const bumpMap = bumpMapPath ? useTexture(bumpMapPath) : null;
  const ringTexture = ringTexturePath ? useTexture(ringTexturePath) : null;

  // Compute scale factor and center offset of the compound model
  const { scaleFactor, centerOffset } = useMemo(() => {
    // Clone first to strip out lights and cameras before measuring
    const cloned = fbx.clone();
    const toRemove: THREE.Object3D[] = [];
    cloned.traverse((child) => {
      if (child instanceof THREE.Light || child instanceof THREE.Camera) {
        toRemove.push(child);
      }
    });
    toRemove.forEach((child) => {
      child.parent?.remove(child);
    });

    const box = new THREE.Box3().setFromObject(cloned);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);
    const scale = 1 / (sphere.radius || 1);
    return { scaleFactor: scale, centerOffset: center.clone().multiplyScalar(-1) };
  }, [fbx]);

  const model = useMemo(() => {
    const cloned = fbx.clone();

    // Remove cameras and lights that might interfere
    const toRemove: THREE.Object3D[] = [];
    cloned.traverse((child) => {
      if (child instanceof THREE.Light || child instanceof THREE.Camera) {
        toRemove.push(child);
      }
    });
    toRemove.forEach((child) => {
      child.parent?.remove(child);
    });

    // Apply materials
    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const isRing = child.name.toLowerCase().includes("ring") && ringTexture;
        child.material = new THREE.MeshStandardMaterial({
          map: isRing ? ringTexture : texture,
          bumpMap: isRing ? null : (bumpMap ?? null),
          bumpScale: isRing ? 0 : (bumpMap ? 0.05 : 0),
          metalness: isRing ? 0 : (isEmissive ? 0 : 0.1),
          roughness: isRing ? 0.9 : (isEmissive ? 0.9 : 0.7),
          emissive: isRing ? new THREE.Color("#ffffff") : (isEmissive ? new THREE.Color(0xffffff) : new THREE.Color(0x000000)),
          emissiveMap: isRing ? ringTexture : (isEmissive ? texture : null),
          emissiveIntensity: isRing ? 0.7 : (isEmissive ? 1.5 : 0),
          transparent: !!isRing,
          opacity: isRing ? 0.85 : 1,
          side: isRing ? THREE.DoubleSide : THREE.FrontSide,
        });
        child.castShadow = !isEmissive;
        child.receiveShadow = !isEmissive;
      }
    });

    return cloned;
  }, [fbx, texture, bumpMap, ringTexture, isEmissive]);

  const finalScale = scaleFactor * targetRadius;

  return (
    <group scale={[finalScale, finalScale, finalScale]}>
      <primitive object={model} position={[centerOffset.x, centerOffset.y, centerOffset.z]} />
    </group>
  );
}

// Forward reference so the parent Scene can query the active planet's current moving position
const Planet = forwardRef<THREE.Group, PlanetProps>((props, ref) => {
  const localRef = useRef<THREE.Group>(null);
  const { name, orbitRadius = 0, position = [0, 0, 0], onClick, scale = 1.25 } = props;

  // Link forwarded ref to our local group ref
  useImperativeHandle(ref, () => localRef.current!);

  useFrame(() => {
    if (localRef.current) {
      // 1. Self axial rotation calculated directly from the live system time clock (supports retrograde rotation)
      localRef.current.rotation.y = getLiveAxialAngle(name);

      // 2. Orbital revolution around the Sun (calculate position dynamically from current system time clock)
      if (orbitRadius > 0 && name.toLowerCase() !== "sun") {
        const liveAngle = getLivePlanetAngle(name);
        const x = Math.cos(liveAngle) * orbitRadius;
        const z = Math.sin(liveAngle) * orbitRadius;
        localRef.current.position.set(x, 0, z);
      } else {
        // Fallback to initial position if stationary
        localRef.current.position.set(position[0], position[1], position[2]);
      }
    }
  });

  const isFbx = props.modelPath.toLowerCase().endsWith(".fbx");
  const isObj = props.modelPath.toLowerCase().endsWith(".obj");

  // Pre-calculate initial live coordinates for the first render
  const initialPos = useMemo(() => {
    if (orbitRadius > 0 && name.toLowerCase() !== "sun") {
      const angle = getLivePlanetAngle(name);
      return [Math.cos(angle) * orbitRadius, 0, Math.sin(angle) * orbitRadius] as [number, number, number];
    }
    return position;
  }, [name, orbitRadius, position]);

  return (
    <group
      ref={localRef}
      position={initialPos}
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick();
      }}
    >
      {isFbx ? (
        <FbxPlanet {...props} targetRadius={scale} />
      ) : isObj ? (
        <ObjPlanet {...props} targetRadius={scale} />
      ) : (
        <SpherePlanet {...props} targetRadius={scale} />
      )}
    </group>
  );
});

Planet.displayName = "Planet";

export default Planet;
export { getLivePlanetAngle, getLiveAxialAngle };

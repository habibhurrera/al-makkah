'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ease, stageById, stageProgress } from './construction-stages';
import type { Quality } from './use-quality-tier';

/**
 * A Hyderabad house, built procedurally.
 *
 * Deliberately not a downloaded model: marketplace GLBs arrive as one welded
 * mesh, which cannot be built up stage by stage. Generating the geometry means
 * every wall, column and window is a separate object whose appearance is driven
 * by scroll. The trade is realism for control, and control is the whole point
 * of this sequence.
 *
 * The proportions follow a typical 240-500 sq yd Hyderabad house: flat roof
 * with a parapet, boundary wall, gate, and a small front lawn.
 */

const PALETTE = {
  ground: '#c9c2b4',
  soil: '#a89a86',
  concrete: '#b8b3aa',
  column: '#9c968c',
  brick: '#b08968',
  plaster: '#e8e3d9',
  roof: '#8d8880',
  glass: '#7fa8c9',
  door: '#6b4f3a',
  boundary: '#d8d2c6',
  grass: '#7d9b63',
  trunk: '#6b5340',
  leaves: '#5f8a4f',
  drive: '#a9a49a',
};

/** Grows from the ground as its stage progresses. */
function Rise({
  progress,
  height,
  children,
}: {
  progress: number;
  height: number;
  children: React.ReactNode;
}) {
  const scale = Math.max(0.0001, progress);
  return (
    <group scale={[1, scale, 1]} position={[0, (-height / 2) * (1 - scale), 0]}>
      {children}
    </group>
  );
}

type SceneProps = {
  progress: number;
  quality: Quality;
  /** Camera aim point. Moving it shifts the house within the frame. */
  focusX: number;
  focusY: number;
  /** Extra distance for narrow viewports, where a portrait frame crops the
   *  horizontal field of view and makes the house fill the screen. */
  distanceScale: number;
};

export function HouseScene({
  progress,
  quality,
  focusX,
  focusY,
  distanceScale,
}: SceneProps) {
  const group = useRef<THREE.Group>(null);
  const sun = useRef<THREE.DirectionalLight>(null);

  // Stage lookups are stable; resolving them once keeps the frame loop lean.
  const stages = useMemo(
    () => ({
      preparation: stageById('preparation'),
      foundation: stageById('foundation'),
      structure: stageById('structure'),
      walls: stageById('walls'),
      roof: stageById('roof'),
      openings: stageById('openings'),
      finishing: stageById('finishing'),
      landscaping: stageById('landscaping'),
    }),
    [],
  );

  const p = {
    preparation: ease(stageProgress(progress, stages.preparation)),
    foundation: ease(stageProgress(progress, stages.foundation)),
    structure: ease(stageProgress(progress, stages.structure)),
    walls: ease(stageProgress(progress, stages.walls)),
    roof: ease(stageProgress(progress, stages.roof)),
    openings: ease(stageProgress(progress, stages.openings)),
    finishing: ease(stageProgress(progress, stages.finishing)),
    landscaping: ease(stageProgress(progress, stages.landscaping)),
  };

  /**
   * Camera and light follow scroll too: a slow orbit that closes in as the
   * house completes, and a sun that climbs from low morning light to midday.
   * Interpolating each frame rather than jumping keeps it smooth even when
   * scroll events arrive unevenly.
   */
  useFrame((state, delta) => {
    const t = Math.min(1, Math.max(0, progress));
    // Wide enough that the whole plot reads as a house rather than a wall,
    // closing in only slightly as the build completes.
    const angle = -0.85 + t * 1.5;
    const radius = (46 - t * 12) * distanceScale;
    const height = (13 - t * 4.5) * distanceScale;

    const target = new THREE.Vector3(
      Math.sin(angle) * radius,
      height,
      Math.cos(angle) * radius,
    );

    // Frame-rate independent smoothing.
    const lerp = 1 - Math.pow(0.001, delta);
    state.camera.position.lerp(target, lerp);
    // Aiming left of the house pushes it into the right half of a wide frame,
    // clear of the headline. On a phone the copy sits at the top instead, so
    // the aim point rises and the house drops into the lower half.
    state.camera.lookAt(focusX, focusY, 0);

    if (sun.current) {
      sun.current.position.set(-8 + t * 16, 10 + t * 8, 6 + t * 4);
    }
    if (group.current) {
      group.current.rotation.y = THREE.MathUtils.lerp(
        group.current.rotation.y,
        t * 0.12,
        lerp,
      );
    }
  });

  const wallHeight = 3.2;
  const plaster = p.finishing;

  return (
    <group ref={group}>
      <hemisphereLight args={['#dfe6ee', '#b9ae9c', 1.1]} />
      <directionalLight
        ref={sun}
        position={[-8, 10, 6]}
        intensity={2.1}
        castShadow={quality.shadows}
        shadow-mapSize={[1024, 1024]}
      />
      {quality.tier === 'high' && (
        <directionalLight position={[6, 6, -8]} intensity={0.4} />
      )}

      {/* ---------------------------------------------------------- the plot */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow={quality.shadows}>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color={PALETTE.ground} roughness={1} />
      </mesh>

      {/* Levelled ground, darker where the plot has been cleared. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
        receiveShadow={quality.shadows}
      >
        <planeGeometry args={[22, 26]} />
        <meshStandardMaterial
          color={PALETTE.soil}
          roughness={1}
          transparent
          opacity={p.preparation}
        />
      </mesh>

      {/* Marking pegs at the corners once the plot is set out. */}
      {p.preparation > 0.4 &&
        quality.extras &&
        [
          [-7, -9],
          [7, -9],
          [-7, 9],
          [7, 9],
        ].map(([x, z]) => (
          <mesh key={`${x}-${z}`} position={[x, 0.35, z]}>
            <cylinderGeometry args={[0.06, 0.06, 0.7, 6]} />
            <meshStandardMaterial color="#8c7b63" />
          </mesh>
        ))}

      {/* -------------------------------------------------------- foundation */}
      <group visible={p.foundation > 0}>
        <Rise progress={p.foundation} height={0.5}>
          <mesh position={[0, 0.25, 0]} castShadow={quality.shadows} receiveShadow={quality.shadows}>
            <boxGeometry args={[14, 0.5, 18]} />
            <meshStandardMaterial color={PALETTE.concrete} roughness={0.95} />
          </mesh>
        </Rise>
      </group>

      {/* --------------------------------------------------------- structure */}
      <group visible={p.structure > 0}>
        {[
          [-6.5, -8.5],
          [6.5, -8.5],
          [-6.5, 0],
          [6.5, 0],
          [-6.5, 8.5],
          [6.5, 8.5],
          [0, -8.5],
          [0, 8.5],
        ].map(([x, z]) => (
          <Rise key={`col-${x}-${z}`} progress={p.structure} height={wallHeight}>
            <mesh
              position={[x, 0.5 + wallHeight / 2, z]}
              castShadow={quality.shadows}
            >
              <boxGeometry args={[0.55, wallHeight, 0.55]} />
              <meshStandardMaterial color={PALETTE.column} roughness={0.9} />
            </mesh>
          </Rise>
        ))}

        {/* Beam ring tying the columns together. */}
        <group visible={p.structure > 0.7}>
          {[
            { pos: [0, 0.5 + wallHeight, -8.5] as const, size: [13.5, 0.45, 0.5] as const },
            { pos: [0, 0.5 + wallHeight, 8.5] as const, size: [13.5, 0.45, 0.5] as const },
            { pos: [-6.5, 0.5 + wallHeight, 0] as const, size: [0.5, 0.45, 17.5] as const },
            { pos: [6.5, 0.5 + wallHeight, 0] as const, size: [0.5, 0.45, 17.5] as const },
          ].map((beam, index) => (
            <mesh key={index} position={beam.pos} castShadow={quality.shadows}>
              <boxGeometry args={beam.size} />
              <meshStandardMaterial color={PALETTE.column} roughness={0.9} />
            </mesh>
          ))}
        </group>
      </group>

      {/* ------------------------------------------------------------- walls
          Built as segments with gaps, so window and door openings are real
          holes rather than textures painted on a solid box. */}
      <group visible={p.walls > 0}>
        {[
          // Front wall, split around the door and two windows.
          { pos: [-4.6, -8.5] as const, size: [4.3, 0.35] as const },
          { pos: [0, -8.5] as const, size: [2.2, 0.35] as const },
          { pos: [4.6, -8.5] as const, size: [4.3, 0.35] as const },
          // Back wall.
          { pos: [-3.5, 8.5] as const, size: [6.5, 0.35] as const },
          { pos: [3.5, 8.5] as const, size: [6.5, 0.35] as const },
        ].map((wall, index) => (
          <Rise key={`wf-${index}`} progress={p.walls} height={wallHeight}>
            <mesh
              position={[wall.pos[0], 0.5 + wallHeight / 2, wall.pos[1]]}
              castShadow={quality.shadows}
              receiveShadow={quality.shadows}
            >
              <boxGeometry args={[wall.size[0], wallHeight, wall.size[1]]} />
              <meshStandardMaterial
                color={plaster > 0.2 ? PALETTE.plaster : PALETTE.brick}
                roughness={0.85}
              />
            </mesh>
          </Rise>
        ))}

        {/* Side walls. */}
        {[-6.5, 6.5].map((x) => (
          <Rise key={`ws-${x}`} progress={p.walls} height={wallHeight}>
            <mesh
              position={[x, 0.5 + wallHeight / 2, 0]}
              castShadow={quality.shadows}
              receiveShadow={quality.shadows}
            >
              <boxGeometry args={[0.35, wallHeight, 17]} />
              <meshStandardMaterial
                color={plaster > 0.2 ? PALETTE.plaster : PALETTE.brick}
                roughness={0.85}
              />
            </mesh>
          </Rise>
        ))}
      </group>

      {/* -------------------------------------------------------------- roof */}
      <group visible={p.roof > 0}>
        <Rise progress={p.roof} height={0.4}>
          <mesh
            position={[0, 0.5 + wallHeight + 0.2, 0]}
            castShadow={quality.shadows}
            receiveShadow={quality.shadows}
          >
            <boxGeometry args={[14, 0.4, 18]} />
            <meshStandardMaterial color={PALETTE.roof} roughness={0.95} />
          </mesh>
        </Rise>

        {/* Parapet - the low wall around a flat roof, standard here. */}
        <group visible={p.roof > 0.6}>
          {[
            { pos: [0, -8.9] as const, size: [14, 15] as const },
            { pos: [0, 8.9] as const, size: [14, 15] as const },
            { pos: [-6.9, 0] as const, size: [0.3, 18] as const },
            { pos: [6.9, 0] as const, size: [0.3, 18] as const },
          ].map((wall, index) => (
            <mesh
              key={`par-${index}`}
              position={[wall.pos[0], 0.5 + wallHeight + 0.85, wall.pos[1]]}
              castShadow={quality.shadows}
            >
              <boxGeometry
                args={[
                  index < 2 ? wall.size[0] : 0.3,
                  0.9,
                  index < 2 ? 0.3 : wall.size[1],
                ]}
              />
              <meshStandardMaterial color={PALETTE.plaster} roughness={0.9} />
            </mesh>
          ))}
        </group>
      </group>

      {/* --------------------------------------------------- windows and door */}
      <group visible={p.openings > 0}>
        {[
          [-2.4, -8.5],
          [2.4, -8.5],
        ].map(([x, z]) => (
          <mesh
            key={`win-${x}`}
            position={[x, 2.3, z]}
            scale={[1, p.openings, 1]}
          >
            <boxGeometry args={[2, 1.5, 0.42]} />
            <meshStandardMaterial
              color={PALETTE.glass}
              roughness={0.15}
              metalness={0.35}
            />
          </mesh>
        ))}

        {[-3.5, 3.5].map((z) => (
          <mesh
            key={`wins-${z}`}
            position={[-6.5, 2.3, z]}
            scale={[1, p.openings, 1]}
          >
            <boxGeometry args={[0.42, 1.5, 2]} />
            <meshStandardMaterial
              color={PALETTE.glass}
              roughness={0.15}
              metalness={0.35}
            />
          </mesh>
        ))}

        {/* Front door. */}
        <mesh position={[0, 1.55, -8.5]} scale={[1, p.openings, 1]}>
          <boxGeometry args={[1.6, 2.1, 0.42]} />
          <meshStandardMaterial color={PALETTE.door} roughness={0.7} />
        </mesh>
      </group>

      {/* --------------------------------------------------- boundary and gate */}
      <group visible={p.finishing > 0}>
        {[
          { pos: [0, -12.5] as const, size: [22, 0.3] as const, gap: true },
          { pos: [0, 12.5] as const, size: [22, 0.3] as const, gap: false },
          { pos: [-10.8, 0] as const, size: [0.3, 25] as const, gap: false },
          { pos: [10.8, 0] as const, size: [0.3, 25] as const, gap: false },
        ].map((wall, index) => (
          <Rise key={`bd-${index}`} progress={p.finishing} height={2}>
            {wall.gap ? (
              // Front boundary leaves a gap for the gate.
              <>
                <mesh position={[-6.5, 1, wall.pos[1]]} castShadow={quality.shadows}>
                  <boxGeometry args={[9, 2, 0.3]} />
                  <meshStandardMaterial color={PALETTE.boundary} roughness={0.9} />
                </mesh>
                <mesh position={[6.5, 1, wall.pos[1]]} castShadow={quality.shadows}>
                  <boxGeometry args={[9, 2, 0.3]} />
                  <meshStandardMaterial color={PALETTE.boundary} roughness={0.9} />
                </mesh>
              </>
            ) : (
              <mesh
                position={[wall.pos[0], 1, wall.pos[1]]}
                castShadow={quality.shadows}
              >
                <boxGeometry args={[wall.size[0], 2, wall.size[1]]} />
                <meshStandardMaterial color={PALETTE.boundary} roughness={0.9} />
              </mesh>
            )}
          </Rise>
        ))}

        {/* Gate. */}
        <mesh position={[0, 0.9, -12.5]} scale={[1, p.finishing, 1]}>
          <boxGeometry args={[4, 1.8, 0.16]} />
          <meshStandardMaterial color="#5c5b58" metalness={0.5} roughness={0.5} />
        </mesh>
      </group>

      {/* ------------------------------------------------------- landscaping */}
      <group visible={p.landscaping > 0}>
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.03, -10.6]}
          receiveShadow={quality.shadows}
        >
          <planeGeometry args={[20, 3.6]} />
          <meshStandardMaterial
            color={PALETTE.grass}
            roughness={1}
            transparent
            opacity={p.landscaping}
          />
        </mesh>

        {/* Driveway from the gate to the door. */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, -10.6]}>
          <planeGeometry args={[3.4, 3.6]} />
          <meshStandardMaterial
            color={PALETTE.drive}
            roughness={1}
            transparent
            opacity={p.landscaping}
          />
        </mesh>

        {quality.extras &&
          [
            [-8.4, -10.4],
            [8.4, -10.4],
            [-8.4, 10.4],
          ].map(([x, z], index) => (
            <group
              key={`tree-${index}`}
              position={[x, 0, z]}
              scale={ease(Math.max(0, p.landscaping * 1.2 - index * 0.15))}
            >
              <mesh position={[0, 0.9, 0]} castShadow={quality.shadows}>
                <cylinderGeometry args={[0.16, 0.22, 1.8, quality.detail]} />
                <meshStandardMaterial color={PALETTE.trunk} roughness={1} />
              </mesh>
              <mesh position={[0, 2.2, 0]} castShadow={quality.shadows}>
                <sphereGeometry args={[1.15, quality.detail, quality.detail]} />
                <meshStandardMaterial color={PALETTE.leaves} roughness={1} />
              </mesh>
            </group>
          ))}
      </group>
    </group>
  );
}

import Phaser from "phaser";
import { Part } from "./types";

// Bezier Curve calculation for N steps
export function getBezierPoints(
  x1: number,
  y1: number,
  cx: number,
  cy: number,
  x2: number,
  y2: number,
  steps: number = 15
): { x: number; y: number }[] {
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const x = mt * mt * x1 + 2 * mt * t * cx + t * t * x2;
    const y = mt * mt * y1 + 2 * mt * t * cy + t * t * y2;
    points.push({ x, y });
  }
  return points;
}

export interface SegmentData {
  x: number;
  y: number;
  w: number;
  h: number;
  angle: number;
}

// Generate midpoint segments connecting consecutive points along the curve
export function getSegmentsFromPoints(
  points: { x: number; y: number }[],
  thickness: number
): SegmentData[] {
  const segments = [];
  for (let i = 0; i < points.length - 1; i++) {
    const pA = points[i];
    const pB = points[i + 1];
    const midX = (pA.x + pB.x) / 2;
    const midY = (pA.y + pB.y) / 2;
    const len = Math.sqrt((pB.x - pA.x) ** 2 + (pB.y - pA.y) ** 2);
    const ang = Math.atan2(pB.y - pA.y, pB.x - pA.x);
    segments.push({
      x: midX,
      y: midY,
      w: len + 1.2, // slight overlap to ensure solid collision with no microscopic gaps
      h: thickness,
      angle: ang,
    });
  }
  return segments;
}

// Compute loose bounding box of the curve relative to part center for Phaser click hit area
export function getBoundingBox(points: { x: number; y: number }[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  points.forEach((p) => {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  });
  const padding = 20;
  return {
    x: minX - padding,
    y: minY - padding,
    w: maxX - minX + padding * 2,
    h: maxY - minY + padding * 2,
  };
}

export function createCurvedRamp(
  scene: Phaser.Scene,
  x1: number,
  y1: number,
  cx: number,
  cy: number,
  x2: number,
  y2: number,
  thickness: number,
  angle: number,
  id: string,
  color: number = 0x9b5de5, // standard purple
  segments: number = 16
): Part {
  const x = (x1 + x2) / 2;
  const y = (y1 + y2) / 2;

  const localX1 = x1 - x;
  const localY1 = y1 - y;
  const localX2 = x2 - x;
  const localY2 = y2 - y;
  const localCx = cx - x;
  const localCy = cy - y;

  const container = scene.add.container(x, y);

  // Determine an approximate width just for UI selection scaling if needed
  const w = Math.max(Math.abs(localX1), Math.abs(localX2), Math.abs(localCx)) * 2;

  const part: Part = {
    id,
    type: "curved_ramp",
    graphic: container,
    body: null as any, // assigned in rebuild
    w,
    h: thickness,
    baseAngle: angle,
    color,
    x1: localX1,
    y1: localY1,
    x2: localX2,
    y2: localY2,
    cx: localCx,
    cy: localCy,
    segments: segments,
  };

  rebuildCurvedRamp(scene, part);

  return part;
}

export function rebuildCurvedRamp(scene: Phaser.Scene, part: Part) {
  const container = part.graphic as Phaser.GameObjects.Container;
  const color = part.color;
  const thickness = part.h;

  // Clear previous segment graphics
  container.removeAll(true);

  // Clear previous physics body
  if (part.body) {
    scene.matter.world.remove(part.body);
  }

  // Generate points and segments
  const steps = part.segments !== undefined ? part.segments : 16;
  const points = getBezierPoints(
    part.x1!,
    part.y1!,
    part.cx!,
    part.cy!,
    part.x2!,
    part.y2!,
    steps
  );
  const segments = getSegmentsFromPoints(points, thickness);

  // Re-draw graphics into the container with a single smooth Bezier path plus rounded caps
  const graphics = scene.add.graphics();
  graphics.lineStyle(thickness, color, 1);
  
  // Solid round caps at both endpoints for gorgeous smooth joints
  graphics.fillStyle(color, 1);
  graphics.fillCircle(part.x1!, part.y1!, thickness / 2);
  graphics.fillCircle(part.x2!, part.y2!, thickness / 2);

  // Draw the smooth path based exactly on our Bezier points sequence
  graphics.beginPath();
  if (points.length > 0) {
    graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      graphics.lineTo(points[i].x, points[i].y);
    }
  }
  graphics.strokePath();
  
  container.add(graphics);

  // Re-create static compound Matter body
  const bodies = (scene.matter as any).bodies;
  const body = (scene.matter as any).body;
  const containerAngle = container.rotation;

  const absoluteParts = segments.map((seg) => {
    // Rotate local segment positions by containerAngle to calculate absolute world positions
    const cosVal = Math.cos(containerAngle);
    const sinVal = Math.sin(containerAngle);
    const absX = container.x + (seg.x * cosVal - seg.y * sinVal);
    const absY = container.y + (seg.x * sinVal + seg.y * cosVal);
    const absAngle = seg.angle + containerAngle;

    return bodies.rectangle(
      absX,
      absY,
      seg.w,
      seg.h,
      {
        angle: absAngle,
        isStatic: true,
        friction: 0.1,
        restitution: 0.5,
      }
    );
  });

  const compoundBody = body.create({
    parts: absoluteParts,
    isStatic: true,
    friction: 0.1,
    restitution: 0.5,
    label: "ramp",
  });
  compoundBody.label = "ramp";

  scene.matter.world.add(compoundBody);
  part.body = compoundBody;

  // Define Container interactive zone specifically on the segment rectangles
  const bounds = getBoundingBox([
    { x: part.x1!, y: part.y1! },
    { x: part.x2!, y: part.y2! },
    { x: part.cx!, y: part.cy! },
  ]);

  const boundsRect = new Phaser.Geom.Rectangle(bounds.x, bounds.y, bounds.w, bounds.h);
  if (container.input) {
    container.input.hitArea = boundsRect;
    container.input.hitAreaCallback = (hitArea: any, x: number, y: number) => {
      const padding = 15;
      for (const seg of segments) {
        const dx = x - seg.x;
        const dy = y - seg.y;
        const cos = Math.cos(-seg.angle);
        const sin = Math.sin(-seg.angle);
        const rx = dx * cos - dy * sin;
        const ry = dx * sin + dy * cos;
        if (Math.abs(rx) <= seg.w / 2 + padding && Math.abs(ry) <= seg.h / 2 + padding) {
          return true;
        }
      }
      return false;
    };
  } else {
    container.setInteractive({
      hitArea: boundsRect,
      hitAreaCallback: (hitArea: any, x: number, y: number) => {
        const padding = 15;
        for (const seg of segments) {
          const dx = x - seg.x;
          const dy = y - seg.y;
          const cos = Math.cos(-seg.angle);
          const sin = Math.sin(-seg.angle);
          const rx = dx * cos - dy * sin;
          const ry = dx * sin + dy * cos;
          if (Math.abs(rx) <= seg.w / 2 + padding && Math.abs(ry) <= seg.h / 2 + padding) {
            return true;
          }
        }
        return false;
      },
      cursor: "pointer",
    });
    scene.input.setDraggable(container);
  }
}

import Phaser from "phaser";
import { Part } from "./types";

export function createBoostGate(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number, // Height is fixed, maintained for schema consistency
  angle: number,
  id: string,
  color: number = 0xd946ef, // Cool neon magenta/pink as the default boost color
  boostAmount: number = 1.5 // Default speed multiplier
): Part {
  const fixedH = 50;
  const bumperW = 15;

  // 1. Create MatterJS compound body
  // Left post bumper (collidable, static)
  const leftBumper = scene.matter.add.trapezoid(x - w / 2 + bumperW/2, y, fixedH, bumperW, 0.35, {
    isStatic: true,
    friction: 0,
    restitution: 0.5,
    label: "boost_gate_bumper",
    angle: Math.PI / 2
  });

  // Right post bumper (collidable, static)
  const rightBumper = scene.matter.add.trapezoid(x + w / 2 - bumperW/2, y, fixedH, bumperW, 0.35, {
    isStatic: true,
    friction: 0,
    restitution: 0.5,
    label: "boost_gate_bumper",
    angle: -Math.PI / 2
  });

  // Middle force field sensor (non-collidable, static sensor)
  const mainSensor = scene.matter.add.rectangle(x, y, w - 20, 1, {
    isSensor: true,
    isStatic: true,
    label: "boost_gate_sensor"
  });

  // Create compound body
  const body = scene.matter.body.create({
    parts: [mainSensor, leftBumper, rightBumper],
    isStatic: true,
    label: "boost_gate"
  });
  (body as any).label = "boost_gate";

  // Remove the temporary individual bodies from the world to avoid duplication / ghost bodies
  scene.matter.world.remove(leftBumper);
  scene.matter.world.remove(rightBumper);
  scene.matter.world.remove(mainSensor);

  // Add compound body to Matter world
  scene.matter.world.add(body);

  if (angle !== 0) {
    scene.matter.body.setAngle(body, angle);
  }

  // 2. Create the graphics container
  const container = scene.add.container(x, y);
  container.setRotation(angle);

  // Draw side posts
  const postsGraphic = scene.add.graphics();

  const lpOuterLeft = -w / 2;
  const lpOuterRight = -w / 2 + bumperW;
  const lpInnerTip = -w / 2 + bumperW + 4;

  // Left post
  postsGraphic.fillStyle(0x2a1b3d, 1); // Dark futuristic violet
  postsGraphic.beginPath();
  postsGraphic.moveTo(lpOuterLeft, -fixedH/2);
  postsGraphic.lineTo(lpOuterRight, -fixedH/2);
  postsGraphic.lineTo(lpInnerTip, -fixedH*0.15);
  postsGraphic.lineTo(lpInnerTip, fixedH*0.15);
  postsGraphic.lineTo(lpOuterRight, fixedH/2);
  postsGraphic.lineTo(lpOuterLeft, fixedH/2);
  postsGraphic.closePath();
  postsGraphic.fillPath();

  postsGraphic.lineStyle(1.5, color, 0.95); // Highlight color border
  postsGraphic.beginPath();
  postsGraphic.moveTo(lpOuterLeft, -fixedH/2);
  postsGraphic.lineTo(lpOuterRight, -fixedH/2);
  postsGraphic.lineTo(lpInnerTip, -fixedH*0.15);
  postsGraphic.lineTo(lpInnerTip, fixedH*0.15);
  postsGraphic.lineTo(lpOuterRight, fixedH/2);
  postsGraphic.lineTo(lpOuterLeft, fixedH/2);
  postsGraphic.closePath();
  postsGraphic.strokePath();

  // Right post
  const rpOuterRight = w / 2;
  const rpOuterLeft = w / 2 - bumperW;
  const rpInnerTip = w / 2 - bumperW - 4;

  postsGraphic.fillStyle(0x2a1b3d, 1);
  postsGraphic.beginPath();
  postsGraphic.moveTo(rpOuterRight, -fixedH/2);
  postsGraphic.lineTo(rpOuterLeft, -fixedH/2);
  postsGraphic.lineTo(rpInnerTip, -fixedH*0.15);
  postsGraphic.lineTo(rpInnerTip, fixedH*0.15);
  postsGraphic.lineTo(rpOuterLeft, fixedH/2);
  postsGraphic.lineTo(rpOuterRight, fixedH/2);
  postsGraphic.closePath();
  postsGraphic.fillPath();

  postsGraphic.lineStyle(1.5, color, 0.95);
  postsGraphic.beginPath();
  postsGraphic.moveTo(rpOuterRight, -fixedH/2);
  postsGraphic.lineTo(rpOuterLeft, -fixedH/2);
  postsGraphic.lineTo(rpInnerTip, -fixedH*0.15);
  postsGraphic.lineTo(rpInnerTip, fixedH*0.15);
  postsGraphic.lineTo(rpOuterLeft, fixedH/2);
  postsGraphic.lineTo(rpOuterRight, fixedH/2);
  postsGraphic.closePath();
  postsGraphic.strokePath();

  // Draw force field line with neon boosting textures/shapes (like multi-layered lines)
  const forceField = scene.add.rectangle(0, 0, w - 20, 8, color, 0.5);
  const innerField = scene.add.rectangle(0, 0, w - 20, 2, 0xffffff, 0.9);

  container.add(forceField);
  container.add(innerField);
  container.add(postsGraphic);

  // Setup rich pulsating & streaming effects
  const glowTween = scene.tweens.add({
    targets: forceField,
    alpha: { from: 0.35, to: 0.9 },
    scaleY: { from: 0.7, to: 1.5 },
    duration: 300,
    yoyo: true,
    repeat: -1
  });

  container.on("destroy", () => {
    glowTween.destroy();
  });

  // Make container interactive
  const hitPadding = 5;
  container.setInteractive({
    hitArea: new Phaser.Geom.Rectangle(
      -w / 2 - hitPadding,
      -10 - hitPadding,
      w + hitPadding * 2,
      fixedH + hitPadding * 2
    ),
    hitAreaCallback: Phaser.Geom.Rectangle.Contains,
    cursor: "pointer"
  });
  scene.input.setDraggable(container);

  return {
    id,
    type: "boost_gate",
    graphic: container,
    body,
    w,
    h: fixedH,
    baseAngle: angle,
    color,
    boostAmount
  };
}

import Phaser from "phaser";
import { Part } from "./types";

export function createBounceRamp(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  angle: number,
  id: string,
  color: number = 0xffa500 // vibrant orange
): Part {
  const body = scene.matter.add.rectangle(x, y, w, h, {
    isStatic: true,
    angle: angle,
    friction: 0,
    restitution: 1.0, // Matter.js maximum restitution
    label: "bounce_ramp",
  });
  body.label = "bounce_ramp";

  const container = scene.add.container(x, y);
  container.setRotation(angle);

  // Background rect
  const baseRect = scene.add.rectangle(0, 0, w, h, color);
  container.add(baseRect);

  // Add decorative bouncy indicators (chevrons/bars) inside container
  const details = scene.add.graphics();
  details.lineStyle(2, 0xffffff, 0.9);
  
  // Draw some simple chevron pointers/arrows or striped indicators across the ramp width
  const step = 20;
  for (let offset = -w / 2 + 10; offset < w / 2 - 5; offset += step) {
    details.beginPath();
    // Chevron pointing outwards along height (pointing upwards/away from surface)
    details.moveTo(offset - 4, h / 2 - 4);
    details.lineTo(offset, -h / 2 + 4);
    details.lineTo(offset + 4, h / 2 - 4);
    details.strokePath();
  }
  container.add(details);

  const hitPadding = 5;
  container.setInteractive({
    hitArea: new Phaser.Geom.Rectangle(
      -w / 2 - hitPadding,
      -h / 2 - hitPadding,
      w + hitPadding * 2,
      h + hitPadding * 2
    ),
    hitAreaCallback: Phaser.Geom.Rectangle.Contains,
    cursor: "pointer",
  });
  scene.input.setDraggable(container);

  return {
    id,
    type: "bounce_ramp",
    graphic: container,
    body,
    w,
    h,
    baseAngle: angle,
    color,
  };
}

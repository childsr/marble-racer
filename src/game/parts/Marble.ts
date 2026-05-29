import Phaser from "phaser";
import { Part } from "./types";

export function createMarble(
  scene: Phaser.Scene,
  x: number,
  y: number,
  _w: number,
  _h: number,
  angle: number,
  id: string,
  color: number = 0xff4444
): Part {
  // Use fixed radius of 14 for marbles as requested ("don't allow their sizes to be changed")
  const radius = 14;

  const body = scene.matter.add.circle(x, y, radius, {
    isStatic: true,
    friction: 0,
    restitution: 0.8,
    label: "marble_edit",
    isSensor: true, // sensor in edit mode to avoid blocking drag/drop during edits
    mass: 1.5
  });
  body.label = "marble_edit";

  const graphic = scene.add.circle(x, y, radius, color);
  graphic.setDepth(50); // Marbles on top

  // Create subtle beautiful radial glow just beneath depth 50 of the marble
  const glow = scene.add.image(x, y, "radial_glow");
  glow.setTint(color);
  glow.setAlpha(0.3);
  glow.setDisplaySize(42, 42);
  glow.setDepth(49);
  (graphic as any).glow = glow;

  // Custom destroy flow to clean up glow when graphic is destroyed
  const originalDestroy = graphic.destroy;
  graphic.destroy = function (fromScene?: boolean) {
    if (glow && glow.active) {
      glow.destroy(fromScene);
    }
    originalDestroy.call(this, fromScene);
  };

  const hitPadding = 5;
  graphic.setInteractive({
    hitArea: new Phaser.Geom.Circle(radius, radius, radius + hitPadding),
    hitAreaCallback: Phaser.Geom.Circle.Contains,
    cursor: "pointer",
  });
  scene.input.setDraggable(graphic);

  return {
    id,
    type: "marble",
    graphic,
    body,
    w: radius,
    h: radius,
    baseAngle: angle,
    color,
  };
}

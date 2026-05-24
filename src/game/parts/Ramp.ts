import Phaser from "phaser";
import { Part } from "./types";

export function createRamp(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  angle: number,
  id: string,
  color: number = 0xffffff
): Part {
  const body = scene.matter.add.rectangle(x, y, w, h, {
    isStatic: true,
    angle: angle,
    friction: 0,
    restitution: 0.5,
    label: "ramp",
  });
  body.label = "ramp";

  const graphic = scene.add.rectangle(x, y, w, h, color);
  graphic.setRotation(angle);

  const hitPadding = 5;
  graphic.setInteractive({
    hitArea: new Phaser.Geom.Rectangle(
      -hitPadding,
      -hitPadding,
      w + hitPadding * 2,
      h + hitPadding * 2
    ),
    hitAreaCallback: Phaser.Geom.Rectangle.Contains,
    cursor: "pointer",
  });
  scene.input.setDraggable(graphic);

  return {
    id,
    type: "ramp",
    graphic,
    body,
    w,
    h,
    baseAngle: angle,
    color,
  };
}

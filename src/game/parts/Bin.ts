import Phaser from "phaser";
import { Part } from "./types";

export function createBin(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  angle: number,
  id: string,
  color: number = 0x8e9299
): Part {
  const body = scene.matter.add.rectangle(x, y, w, h, {
    isStatic: true,
    angle: angle,
    friction: 0,
    restitution: 0.5,
    label: "bin",
  });
  body.label = "bin";

  const graphic = scene.add.rectangle(x, y, w, h, color);
  graphic.setRotation(angle);

  const hitPadding = 40;
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
    type: "bin",
    graphic,
    body,
    w,
    h,
    baseAngle: angle,
    color,
  };
}

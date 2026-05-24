import Phaser from "phaser";
import { Part } from "./types";

export function createPin(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  angle: number,
  id: string,
  color: number = 0x4fc3f7
): Part {
  const body = scene.matter.add.circle(x, y, w, {
    isStatic: true,
    friction: 0,
    restitution: 0.8,
    label: "pin",
  });
  body.label = "pin";

  const graphic = scene.add.circle(x, y, w, color);

  const hitPadding = 5;
  graphic.setInteractive({
    hitArea: new Phaser.Geom.Circle(w, w, w + hitPadding),
    hitAreaCallback: Phaser.Geom.Circle.Contains,
    cursor: "pointer",
  });
  scene.input.setDraggable(graphic);

  return {
    id,
    type: "pin",
    graphic,
    body,
    w,
    h,
    baseAngle: angle,
    color,
  };
}

import Phaser from "phaser";
import { Part } from "./types";

export function createFinishZone(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  angle: number,
  id: string,
  color: number = 0x00e676
): Part {
  const body = scene.matter.add.rectangle(x, y, w, h, {
    isStatic: true,
    angle: angle,
    friction: 0,
    restitution: 0.5,
    label: "finish_zone",
    isSensor: true,
  });
  body.label = "finish_zone";

  const graphic = scene.add.rectangle(x, y, w, h, color);
  graphic.setAlpha(0.4);
  (graphic as Phaser.GameObjects.Rectangle).setStrokeStyle(3, 0xffffff, 0.85);
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
    type: "finish_zone",
    graphic,
    body,
    w,
    h,
    baseAngle: angle,
    color,
  };
}

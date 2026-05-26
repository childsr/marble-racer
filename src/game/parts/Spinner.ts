import Phaser from "phaser";
import { Part } from "./types";

export function createSpinner(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  angle: number,
  id: string,
  color: number = 0xff5252,
  spinnerSpeed: number = 0.25
): Part {
  const body = scene.matter.add.rectangle(x, y, w, h, {
    isStatic: true,
    angle: angle,
    friction: 0,
    restitution: 0.5,
    label: "spinner",
  });
  body.label = "spinner";

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
    type: "spinner",
    graphic,
    body,
    w,
    h,
    baseAngle: angle,
    color,
    spinnerSpeed,
  };
}

export function updateSpinner(scene: Phaser.Scene, part: Part) {
  const speed = part.spinnerSpeed !== undefined ? part.spinnerSpeed : 0.25;
  const simSpeed = (scene as any).simSpeed !== undefined ? (scene as any).simSpeed : 1.0;
  const rotPerFrame = (speed * Math.PI * 2 * simSpeed) / 60;
  scene.matter.body.setAngle(part.body, part.body.angle + rotPerFrame);
  part.graphic.setRotation(part.body.angle);
}

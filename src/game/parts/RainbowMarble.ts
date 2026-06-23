import Phaser from "phaser";
import { Part } from "./types";

export function createRainbowMarble(
  scene: Phaser.Scene,
  x: number,
  y: number,
  _w: number,
  _h: number,
  angle: number,
  id: string,
  _color?: number
): Part {
  const radius = 14;

  const body = scene.matter.add.circle(x, y, radius, {
    isStatic: true,
    friction: 0,
    restitution: 0.8,
    label: "rainbow_marble_edit",
    isSensor: true, // sensor in edit mode to avoid blocking drag/drop during edits
    mass: 1.5
  });
  body.label = "rainbow_marble_edit";

  const graphic = scene.add.circle(x, y, radius, 0xff0000);
  graphic.setDepth(50); // Marbles on top

  const glow = scene.add.image(x, y, "radial_glow");
  glow.setTint(0xff0000);
  glow.setAlpha(0.3);
  glow.setDisplaySize(42, 42);
  glow.setDepth(49);
  (graphic as any).glow = glow;

  let hue = Math.random() * 360;
  
  const updateEvent = () => {
    hue = (hue + 3) % 360;
    const colorObj = Phaser.Display.Color.HSVToRGB(hue / 360, 1, 1);
    const colorInt = Phaser.Display.Color.GetColor(colorObj.r, colorObj.g, colorObj.b);
    graphic.setFillStyle(colorInt);
    glow.setTint(colorInt);
    (graphic as any).rainbowColor = colorInt;
  };
  
  scene.events.on('update', updateEvent);

  const originalDestroy = graphic.destroy;
  graphic.destroy = function (fromScene?: boolean) {
    scene.events.off('update', updateEvent);
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
    type: "rainbow_marble",
    graphic,
    body,
    w: radius,
    h: radius,
    baseAngle: angle,
    get color() {
      return (graphic as any).rainbowColor || 0xff0000;
    }
  };
}

import { createBoostGate } from "./BoostGate"
import { createCurvedRamp } from "./CurvedRamp"
import { createFinishZone } from "./FinishZone"
import { createMarble } from "./Marble"
import { createRainbowMarble } from "./RainbowMarble"
import { createPin } from "./Pin"
import { createRamp } from "./Ramp"
import { createScatterGate } from "./ScatterGate"
import { createSpinner } from "./Spinner"
import { createBounceRamp } from "./BounceRamp"

const partCreators = {
  ramp: createRamp,
  curved_ramp: createCurvedRamp,
  pin: createPin,
  spinner: createSpinner,
  finish_zone: createFinishZone,
  marble: createMarble,
  rainbow_marble: createRainbowMarble,
  scatter_gate: createScatterGate,
  boost_gate: createBoostGate,
  bounce_ramp: createBounceRamp,
};

export function createPart(scene: Phaser.Scene, type: string, x: number, y: number, w: number, h: number, angle: number, id: string, color?: number) {
  const creator = partCreators[type as keyof typeof partCreators];
  if (!creator) throw new Error(`Unknown part type: ${type}`);
  return creator(scene, x, y, w, h, angle, id, color);
}

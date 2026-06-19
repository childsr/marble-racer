import { MainScene } from "../scenes/MainScene";

export function loadBounceHouseTrack(scene: MainScene) {
  // A series of bounce ramps to leap between
  scene.createRamp(400, 200, 400, 20, 0.3);
  
  // Bounce pads
  scene.createBounceRamp(800, 400, 200, 20, -0.1);
  scene.createBounceRamp(400, 600, 200, 20, 0.1);
  scene.createBounceRamp(800, 800, 200, 20, -0.2);
  
  scene.createFinishZone(400, 1000, 400, 80, 0);

  for (let i = 0; i < 8; i++) {
    const x = 250 + (i % 4) * 35;
    const y = 80 - Math.floor(i / 4) * 35;
    const color = scene.marbleColors[i % scene.marbleColors.length];
    scene.createMarble(x, y, 14, 14, 0, undefined, color);
  }
}

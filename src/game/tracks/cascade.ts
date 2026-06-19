import { MainScene } from "../scenes/MainScene";

export function loadCascadeTrack(scene: MainScene) {
  // Cascading ramps
  scene.createRamp(500, 200, 600, 20, 0.2);
  scene.createRamp(700, 400, 600, 20, -0.2);
  scene.createRamp(500, 600, 600, 20, 0.2);
  scene.createRamp(700, 800, 600, 20, -0.2);
  
  scene.createFinishZone(400, 950, 300, 80, 0);

  for (let i = 0; i < 6; i++) {
    const x = 250 + (i % 3) * 30;
    const y = 80 - Math.floor(i / 3) * 30;
    const color = scene.marbleColors[i % scene.marbleColors.length];
    scene.createMarble(x, y, 14, 14, 0, undefined, color);
  }
}

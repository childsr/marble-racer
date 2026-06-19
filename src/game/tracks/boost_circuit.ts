import { MainScene } from "../scenes/MainScene";

export function loadBoostCircuitTrack(scene: MainScene) {
  // Simple loop with a boost up
  scene.createCurvedRamp(300, 300, 300, 800, 600, 800, 20, 0);
  scene.createCurvedRamp(600, 800, 900, 800, 900, 300, 20, 0);
  scene.createCurvedRamp(300, 300, 300, 100, 600, 100, 20, 0);
  scene.createCurvedRamp(600, 100, 900, 100, 900, 300, 20, 0);
  // scene.createRamp(600, 300, 600, 20, 0);
  
  // Boost gate to push it back around (or out)
  scene.createBoostGate(600, 800, 150, 20, 1.57);
  
  scene.createFinishZone(600, 600, 200, 80, 0);

  scene.createPin(500,375,25,25,0);
  scene.createPin(700,375,25,25,0);

  for (let i = 0; i < 6; i++) {
    const x = 350 + (i % 2) * 35;
    const y = 300 - Math.floor(i / 2) * 35;
    const color = scene.marbleColors[i % scene.marbleColors.length];
    scene.createMarble(x, y, 8, 8, 0, undefined, color);
  }
}

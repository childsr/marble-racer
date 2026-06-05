import { MainScene } from "../scenes/MainScene";

export function loadHalfpipeTrack(scene: MainScene) {
  // Create a huge U shape using curved ramps
  // Left quarter-pipe
  scene.createCurvedRamp(200, 400, 200, 900, 600, 900, 20, 0);
  
  // Right quarter-pipe
  scene.createCurvedRamp(600, 900, 1000, 900, 1000, 400, 20, 0);
  
  scene.createFinishZone(1000, 400, 400, 200, 0);

  // Add default starting marbles at the top left
  for (let i = 0; i < 8; i++) {
    const x = 250 + (i % 4) * 35;
    const y = 300 - Math.floor(i / 4) * 35;
    const color = scene.marbleColors[i % scene.marbleColors.length];
    scene.createMarble(x, y, 14, 14, 0, undefined, color);
  }
}

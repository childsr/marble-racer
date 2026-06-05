import { MainScene } from "../scenes/MainScene";

export function loadHalfpipeTrack(scene: MainScene) {
  // Create a huge U shape using rams and curved ramps
  scene.createPart("curved_ramp", 400, 700, 400, 20, 0);
  scene.createPart("curved_ramp", 800, 700, 400, 20, Math.PI / 2);
  
  scene.createPart("finish_zone", 600, 950, 400, 60, 0);

  // Add default starting marbles at the top
  for (let i = 0; i < 8; i++) {
    const x = 300 + (i % 4) * 35;
    const y = 300 - Math.floor(i / 4) * 35;
    const color = scene.marbleColors[i % scene.marbleColors.length];
    scene.createPart("marble", x, y, 14, 14, 0, undefined, color);
  }
}

import { MainScene } from "../scenes/MainScene";

export function loadScatterFunnelTrack(scene: MainScene) {
  // Funnel down into scatter gates
  scene.createRampBetween(100, 200, 800, 500, 20);
  scene.createRampBetween(1800, 200, 1100, 500, 20);

  // Scatter gates
  scene.createScatterGate(950, 600, 150, 20, 0);
  scene.createScatterGate(750, 750, 150, 20, 0);
  scene.createScatterGate(1150, 750, 150, 20, 0);
  
  scene.createFinishZone(950, 1000, 1000, 100, 0);

  // Marbles
  for (let i = 0; i < 12; i++) {
    const x = 800 + (i % 6) * 50;
    const y = 80 - Math.floor(i / 6) * 50;
    const color = scene.marbleColors[i % scene.marbleColors.length];
    scene.createMarble(x, y, 14, 14, 0, undefined, color);
  }
}

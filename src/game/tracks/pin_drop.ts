import { MainScene } from "../scenes/MainScene";

export function loadPinDropTrack(scene: MainScene) {
  // Funnel
  scene.createRampBetween(200, 100, 700, 400, 20);
  scene.createRampBetween(1700, 100, 1200, 400, 20);
  
  const startX = 950;
  const startY = 450;
  
  // Big triangle of pins
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col <= row; col++) {
      const x = startX - (row * 35) + (col * 70);
      const y = startY + (row * 60);
      scene.createPin(x, y, 12, 12, 0);
    }
  }
  
  scene.createFinishZone(950, 1100, 800, 80, 0);

  // Marbles drop into funnel
  for (let i = 0; i < 15; i++) {
    const x = 850 + (i % 5) * 40;
    const y = 100 - Math.floor(i / 5) * 40;
    const color = scene.marbleColors[i % scene.marbleColors.length];
    scene.createMarble(x, y, 14, 14, 0, undefined, color);
  }
}

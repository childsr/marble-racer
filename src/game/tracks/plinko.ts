import { MainScene } from "../scenes/MainScene";

export function loadPlinkoTrack(scene: MainScene) {
  scene.createRampBetween(100, 150, 600, 250, 15);
  scene.createRampBetween(850, 300, 1300, 300, 15);

  const pinRows = 10;
  const pinGapX = 60;
  const pinGapY = 50;
  const startY = 400;

  for (let row = 0; row < pinRows; row++) {
    const cols = row % 2 === 0 ? 10 : 9;
    const rowWidth = (cols - 1) * pinGapX;
    const startX = 600 - rowWidth / 2;

    for (let col = 0; col < cols; col++) {
      const x = startX + col * pinGapX;
      const y = startY + row * pinGapY;
      scene.createPin(x, y, 10, 10, 0);
    }
  }

  scene.createRampBetween(150, 950, 1050, 950, 15);
  scene.createFinishZone(600, 1050, 900, 60, 0);

  // Add default starting marbles
  for (let i = 0; i < 8; i++) {
    const x = 100 + (i % 4) * 35;
    const y = 100 - Math.floor(i / 4) * 35;
    const color = scene.marbleColors[i % scene.marbleColors.length];
    scene.createMarble(x, y, 14, 14, 0, undefined, color);
  }
}

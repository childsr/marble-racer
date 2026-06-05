import { MainScene } from "../scenes/MainScene";

export function loadDefaultTrack(scene: MainScene) {
  scene.createRampBetween(50, 150, 800, 250, 15);
  scene.createRampBetween(850, 300, 1750, 400, 15);
  scene.createRampBetween(1850, 450, 1600, 500, 15);

  const pinRows = 6;
  const pinGapX = 80;
  const pinGapY = 70;
  const startY = 550;

  for (let row = 0; row < pinRows; row++) {
    const cols = row % 2 === 0 ? 6 : 5;
    const rowWidth = (cols - 1) * pinGapX;
    const startX = 1450 - rowWidth / 2;

    for (let col = 0; col < cols; col++) {
      const x = startX + col * pinGapX;
      const y = startY + row * pinGapY;
      scene.createPin(x, y, 10, 10, 0);
    }
  }

  scene.createRampBetween(1600, 950, 700, 980, 15);
  scene.createSpinner(850, 820, 350, 25, 0);

  // Add default Finish Zone at the bottom
  scene.createFinishZone(450, 1040, 600, 60, 0);

  // Add default starting marbles at the top left of the course
  for (let i = 0; i < 8; i++) {
    const x = 100 + (i % 4) * 35;
    const y = 100 - Math.floor(i / 4) * 35;
    const color = scene.marbleColors[i % scene.marbleColors.length];
    scene.createMarble(x, y, 14, 14, 0, undefined, color);
  }
}

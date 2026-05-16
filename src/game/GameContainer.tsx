import React, { useEffect, useRef } from "react";
import Phaser from "phaser";
import { MainScene } from "./scenes/MainScene";

export const GameContainer: React.FC = () => {
  const gameRef = useRef<HTMLDivElement>(null);
  const gameInstance = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: "100%",
      height: "100%",
      parent: gameRef.current,
      audio: {
        noAudio: true,
      },
      physics: {
        default: "matter",
        matter: {
          gravity: { x: 0, y: 1 },
          debug: false, // Set to true to see hitboxes
        },
      },
      scene: [MainScene],
      backgroundColor: "#151619",
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 1920,
        height: 1080,
      },
    };

    gameInstance.current = new Phaser.Game(config);

    return () => {
      gameInstance.current?.destroy(true);
    };
  }, []);

  return (
    <div
      id="phaser-game-container"
      ref={gameRef}
      className="w-full h-full overflow-hidden bg-[#151619]"
    />
  );
};

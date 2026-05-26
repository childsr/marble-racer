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
          debug: {
            showBody: true,
            showStaticBody: true,
            showInternalEdges: true,
            renderFill: true,
            renderLine: true,
            fillColor: 0x00ffff,
            fillOpacity: 0.15,
            lineColor: 0x39ff14,
            lineOpacity: 1.0,
            lineThickness: 3,
            staticFillColor: 0xff00d0,
            staticLineColor: 0xff00d0,
            showSleeping: false,
            sleepFillColor: 0x00ffff,
            sleepLineColor: 0x39ff14,
            showCollisions: true,
            collisionColor: 0xffff00,
            showVelocity: true,
            velocityColor: 0x00ffff,
            showAxes: false,
            showAngleIndicator: true,
            angleColor: 0xffea00
          },
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

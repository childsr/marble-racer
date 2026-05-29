import { useEffect, useRef } from "react";
import type { DragEvent } from "react";
import Phaser from "phaser";
import { MainScene } from "./scenes/MainScene";

export const GameContainer = () => {
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
            lineThickness: 1,
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

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("text/plain");
    if (!type || !gameInstance.current) return;

    const scene = gameInstance.current.scene.scenes[0] as any;
    if (!scene) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;

    const virtualWidth = 1920;
    const virtualHeight = 1080;
    const virtualAspect = virtualWidth / virtualHeight;

    const actualWidth = rect.width;
    const actualHeight = rect.height;
    const actualAspect = actualWidth / actualHeight;

    let x = 0;
    let y = 0;

    if (actualAspect > virtualAspect) {
      const scale = actualHeight / virtualHeight;
      const gameWidth = virtualWidth * scale;
      const offsetX = (actualWidth - gameWidth) / 2;
      const localX = clientX - rect.left - offsetX;
      const localY = clientY - rect.top;
      x = localX / scale;
      y = localY / scale;
    } else {
      const scale = actualWidth / virtualWidth;
      const gameHeight = virtualHeight * scale;
      const offsetY = (actualHeight - gameHeight) / 2;
      const localX = clientX - rect.left;
      const localY = clientY - rect.top - offsetY;
      x = localX / scale;
      y = localY / scale;
    }

    if (type === "marble" || type === "pin") {
      const scale = actualAspect > virtualAspect ? actualHeight / virtualHeight : actualWidth / virtualWidth;
      y -= 20 / scale;
    }

    // Keep it within reasonable boundaries of the play arena (1920x1080)
    x = Math.max(20, Math.min(1900, x));
    y = Math.max(20, Math.min(1060, y));

    window.dispatchEvent(
      new CustomEvent("phaser-editor-action", {
        detail: {
          action: "add-part",
          payload: { type, x, y },
        },
      }),
    );
  };

  return (
    <div
      id="phaser-game-container"
      ref={gameRef}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="w-full h-full overflow-hidden bg-[#151619]"
    />
  );
};

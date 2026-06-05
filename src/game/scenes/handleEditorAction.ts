import Phaser from "phaser";
import { MainScene } from "./MainScene"
import { Part } from "../parts/types";
import { rebuildCurvedRamp } from "../parts/CurvedRamp";

type Action = { action: keyof typeof actionHandlers; payload?: any; }

const actionHandlers = {
  ["toggle-mode"](scene: MainScene) { scene.setMode(scene.mode === "play" ? "edit" : "play"); },
  ["toggle-debug-rendering"](scene: MainScene) {
    scene.showDebugBodies = !scene.showDebugBodies;
    scene.applyRenderingMode();
    scene.notifyState();
  },
  ["set-sim-speed"](scene: MainScene, payload: any) {
    scene.setSimSpeed(payload);
  },
  ["select-next-part"](scene: MainScene, payload: any) {
    if (scene.parts.length > 0) {
      const isBackward = !(!payload || !payload.backward);
      const currentSelected = scene.selectedParts[0];
      let nextIdx = 0;
      if (currentSelected) {
        const idx = scene.parts.indexOf(currentSelected);
        if (idx !== -1) {
          if (isBackward) {
            nextIdx = (idx - 1 + scene.parts.length) % scene.parts.length;
          } else {
            nextIdx = (idx + 1) % scene.parts.length;
          }
        }
      }
      const nextPart = scene.parts[nextIdx];
      if (nextPart) {
        scene.selectParts([nextPart]);
      }
    }
  },
  ["add-part"](scene: MainScene, payload: any) {
    scene.addNewPart(payload);
    scene.saveState();
  },
  ["delete-part"](scene: MainScene) {
    if (scene.selectedParts.length > 0) {
      scene.selectedParts.forEach((p) => {
        scene.matter.world.remove(p.body);
        p.graphic.destroy();
        scene.parts = scene.parts.filter((o) => o !== p);
      });
      scene.selectParts([]);
      scene.saveState();
    }
  },
  ["rotate-part"](scene: MainScene, payload: any) {
    if (scene.selectedParts.length > 0) {
      let cx = 0,
        cy = 0;
      scene.selectedParts.forEach((p) => {
        cx += p.graphic.x;
        cy += p.graphic.y;
      });
      cx /= scene.selectedParts.length;
      cy /= scene.selectedParts.length;
      const angleInc = Phaser.Math.DegToRad(payload);

      scene.selectedParts.forEach((p) => {
        const Point = Phaser.Math.RotateAround(
          { x: p.graphic.x, y: p.graphic.y },
          cx,
          cy,
          angleInc,
        );
        p.graphic.setPosition(Point.x, Point.y);

        if (p.type === "curved_ramp") {
          p.graphic.setRotation(p.graphic.rotation + angleInc);
          p.baseAngle = p.graphic.rotation;
          rebuildCurvedRamp(scene, p);
        } else {
          scene.matter.body.setPosition(p.body, Point);

          if (p.type !== "pin" && p.type !== "marble") {
            p.baseAngle += angleInc;
            scene.matter.body.setAngle(p.body, p.baseAngle);
            p.graphic.setRotation(p.baseAngle);
          } else {
            p.baseAngle = 0;
            scene.matter.body.setAngle(p.body, 0);
            p.graphic.setRotation(0);
          }
        }
      });

      scene.updateSelectionBox();
      scene.saveState();
    }
  },
  ["nudge-part"](scene: MainScene, payload: any) {
    if (scene.selectedParts.length > 0) {
      scene.selectedParts.forEach((p) => {
        const dx = payload.dx || 0;
        const dy = payload.dy || 0;
        if (p.type === "curved_ramp") {
          p.graphic.x += dx;
          p.graphic.y += dy;
          rebuildCurvedRamp(scene, p);
        } else {
          scene.matter.body.setPosition(p.body, {
            x: p.body.position.x + dx,
            y: p.body.position.y + dy,
          });
          p.graphic.setPosition(p.body.position.x, p.body.position.y);
        }
      });
      scene.updateSelectionBox();
      scene.saveState();
    }
  },
  ["scale-part"](scene: MainScene, payload: any) {
    if (scene.selectedParts.length > 0) {
      const factor = payload > 0 ? 1.2 : 1 / 1.2;
      let cx = 0,
        cy = 0;
      scene.selectedParts.forEach((p) => {
        cx += p.graphic.x;
        cy += p.graphic.y;
      });
      cx /= scene.selectedParts.length;
      cy /= scene.selectedParts.length;

      const newSelection: Part[] = [];
      const list = [...scene.selectedParts];

      list.forEach((p) => {
        if (p.type === "marble") {
          const dx = (p.graphic.x - cx) * factor;
          const dy = (p.graphic.y - cy) * factor;
          const nx = cx + dx;
          const ny = cy + dy;

          p.graphic.setPosition(nx, ny);
          scene.matter.body.setPosition(p.body, { x: nx, y: ny });
          newSelection.push(p);
          return;
        }

        const newW = p.w * factor;
        const newH =
          p.type === "pin" || p.type === "finish_zone" ? p.h * factor : p.h;

        const dx = (p.graphic.x - cx) * factor;
        const dy = (p.graphic.y - cy) * factor;
        const nx = cx + dx;
        const ny = cy + dy;

        const { type, color, id } = p;
        const angle = p.baseAngle;

        scene.matter.world.remove(p.body);
        p.graphic.destroy();
        scene.parts = scene.parts.filter((o) => o !== p);

        const newPart = scene.createPart(
          type,
          nx,
          ny,
          newW,
          newH,
          angle,
          id,
          color,
          p.spinnerSpeed,
          p.boostAmount,
        );
        newSelection.push(newPart);
      });

      scene.selectParts(newSelection);
      scene.saveState();
    }
  },
  ["change-part-property"](scene: MainScene, payload: any) {
    if (scene.selectedParts.length > 0) {
      const newSelection: Part[] = [];
      scene.selectedParts.forEach((p) => {
        if (payload.color !== undefined) {
          p.color = payload.color;
          if (p.type === "curved_ramp") {
            rebuildCurvedRamp(scene, p);
          } else if (p.graphic && typeof p.graphic.fillColor !== "undefined") {
            p.graphic.fillColor = payload.color;
          }
          if (p.type === "marble" && (p.graphic as any).glow) {
            (p.graphic as any).glow.setTint(payload.color);
          }
          newSelection.push(p);
        } else if (payload.w !== undefined || payload.h !== undefined) {
          const newW = payload.w !== undefined ? payload.w : p.w;
          const newH = payload.h !== undefined ? payload.h : p.h;

          const { type, color, id, baseAngle, spinnerSpeed, boostAmount } = p;
          const px = p.graphic.x;
          const py = p.graphic.y;

          if (p.type === "curved_ramp") {
            const ratioW = newW / p.w;
            p.x1 = p.x1! * ratioW;
            p.x2 = p.x2! * ratioW;
            p.cx = p.cx! * ratioW;
            p.w = newW;
            p.h = newH;
            rebuildCurvedRamp(scene, p);
            newSelection.push(p);
          } else {
            scene.matter.world.remove(p.body);
            p.graphic.destroy();
            scene.parts = scene.parts.filter((o) => o !== p);

            const newPart = scene.createPart(
              type,
              px,
              py,
              newW,
              newH,
              baseAngle,
              id,
              color,
              spinnerSpeed,
              boostAmount,
            );
            newSelection.push(newPart);
          }
        } else {
          if (payload.spinnerSpeed !== undefined && p.type === "spinner") {
            p.spinnerSpeed = payload.spinnerSpeed;
          }
          if (payload.boostAmount !== undefined && p.type === "boost_gate") {
            p.boostAmount = payload.boostAmount;
          }
          if (payload.segments !== undefined && p.type === "curved_ramp") {
            p.segments = payload.segments;
            rebuildCurvedRamp(scene, p);
          }
          newSelection.push(p);
        }
      });
      if (payload.w !== undefined || payload.h !== undefined || payload.segments !== undefined) {
        scene.selectParts(newSelection);
      } else {
        scene.notifyState();
      }
    }
  },
  ["load-built-in-track"](scene: MainScene, payload: any) {
    scene.setupCourse(payload);
  },
  ["load-state"](scene: MainScene, payload: any) {
    if (Array.isArray(payload)) {
      scene.applyState(payload);
      scene.history = [payload];
      scene.historyIndex = 0;
      scene.saveToLocalStorage(payload);
      scene.notifyState();
    }
  },
  ["save-state"](scene: MainScene) { scene.saveState(); },
  undo(scene: MainScene) {
    scene.undo();
  },
  redo(scene: MainScene) {
    scene.redo();
  },
  ["reset-marbles"](scene: MainScene) {
    scene.resetMarbles();
  },
  ["shake-marbles"](scene: MainScene) {
    scene.shakeMarbles();
  },
  ["reset-template"](scene: MainScene) {
    scene.parts.forEach((p) => {
      scene.matter.world.remove(p.body);
      p.graphic.destroy();
    });
    scene.parts = [];
    scene.selectParts([]);
    scene.setupCourse();
  },
  ["deselect-all"](scene: MainScene) {
    scene.selectParts([]);
  },
  copy(scene: MainScene) {
    if (scene.selectedParts.length > 0) {
      scene.clipboard = scene.selectedParts.map((p) => ({
        type: p.type,
        x: p.graphic.x,
        y: p.graphic.y,
        w: p.w,
        h: p.h,
        baseAngle: p.baseAngle,
        color: p.color,
        spinnerSpeed: p.spinnerSpeed,
        boostAmount: p.boostAmount,
        x1: p.x1,
        y1: p.y1,
        x2: p.x2,
        y2: p.y2,
        cx: p.cx,
        cy: p.cy,
      }));
      scene.pasteCount = 0;
    }
  },
  cut(scene: MainScene) {
    if (scene.selectedParts.length > 0) {
      scene.clipboard = scene.selectedParts.map((p) => ({
        type: p.type,
        x: p.graphic.x,
        y: p.graphic.y,
        w: p.w,
        h: p.h,
        baseAngle: p.baseAngle,
        color: p.color,
        spinnerSpeed: p.spinnerSpeed,
        boostAmount: p.boostAmount,
        x1: p.x1,
        y1: p.y1,
        x2: p.x2,
        y2: p.y2,
        cx: p.cx,
        cy: p.cy,
      }));
      scene.pasteCount = 0;

      scene.selectedParts.forEach((p) => {
        scene.matter.world.remove(p.body);
        p.graphic.destroy();
        scene.parts = scene.parts.filter((o) => o !== p);
      });
      scene.selectParts([]);
      scene.saveState();
    }
  },
  paste(scene: MainScene) {
    if (scene.clipboard.length > 0) {
      scene.pasteCount++;
      const offset = scene.pasteCount * 15;
      const pasted: Part[] = [];
      scene.clipboard.forEach((p) => {
        const newPart = scene.createPart(
          p.type,
          p.x + offset,
          p.y + offset,
          p.w,
          p.h,
          p.baseAngle,
          undefined, // new ID
          p.color,
          p.spinnerSpeed,
          p.boostAmount,
          p.x1,
          p.y1,
          p.x2,
          p.y2,
          p.cx,
          p.cy,
        );
        if (newPart) {
          pasted.push(newPart);
        }
      });
      if (pasted.length > 0) {
        scene.selectParts(pasted);
        scene.saveState();
      }
    }
  },
  duplicate(scene: MainScene) {
    if (scene.selectedParts.length > 0) {
      const duped: Part[] = [];
      scene.selectedParts.forEach((p) => {
        const newPart = scene.createPart(
          p.type,
          p.graphic.x + 20,
          p.graphic.y + 20,
          p.w,
          p.h,
          p.baseAngle,
          undefined, // new ID
          p.color,
          p.spinnerSpeed,
          p.boostAmount,
          p.x1,
          p.y1,
          p.x2,
          p.y2,
          p.cx,
          p.cy,
        );
        if (newPart) {
          duped.push(newPart);
        }
      });
      if (duped.length > 0) {
        scene.selectParts(duped);
        scene.saveState();
      }
    }
  }
};

export function handleEditorAction(scene: MainScene, { action, payload }: Action) {
  actionHandlers[action](scene,payload)
}
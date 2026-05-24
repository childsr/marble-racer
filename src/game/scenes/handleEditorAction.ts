import { MainScene } from "./MainScene"
import { Part, SerializedPart } from "../parts/types";

type Action = { action: keyof typeof actionHandlers; payload?: any; }

export function handleEditorAction(scene: MainScene, { action, payload }: Action) {
  actionHandlers[action](scene,payload)
}

export function _handleEditorAction(scene: MainScene, { action, payload }: Action) {
  if (action === "toggle-mode") {
    scene.setMode(scene.mode === "play" ? "edit" : "play");
  } else if (action === "toggle-debug-rendering") {
    scene.showDebugBodies = !scene.showDebugBodies;
    scene.applyRenderingMode();
  } else if (action === "select-next-part") {
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
  } else if (action === "add-part") {
    scene.addNewPart(payload);
    scene.saveState();
  } else if (action === "delete-part") {
    if (scene.selectedParts.length > 0) {
      scene.selectedParts.forEach((p) => {
        scene.matter.world.remove(p.body);
        p.graphic.destroy();
        scene.parts = scene.parts.filter((o) => o !== p);
      });
      scene.selectParts([]);
      scene.saveState();
    }
  } else if (action === "rotate-part") {
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
      });

      scene.updateSelectionBox();
      scene.saveState();
    }
  } else if (action === "nudge-part") {
    if (scene.selectedParts.length > 0) {
      scene.selectedParts.forEach((p) => {
        scene.matter.body.setPosition(p.body, {
          x: p.body.position.x + (payload.dx || 0),
          y: p.body.position.y + (payload.dy || 0),
        });
        p.graphic.setPosition(p.body.position.x, p.body.position.y);
      });
      scene.updateSelectionBox();
      scene.saveState();
    }
  } else if (action === "scale-part") {
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
  } else if (action === "change-part-property") {
    if (scene.selectedParts.length > 0) {
      const newSelection: Part[] = [];
      scene.selectedParts.forEach((p) => {
        if (payload.color !== undefined) {
          p.color = payload.color;
          if (p.graphic && typeof p.graphic.fillColor !== "undefined") {
            p.graphic.fillColor = payload.color;
          }
          newSelection.push(p);
        } else if (payload.w !== undefined || payload.h !== undefined) {
          const newW = payload.w !== undefined ? payload.w : p.w;
          const newH = payload.h !== undefined ? payload.h : p.h;

          const { type, color, id, baseAngle, spinnerSpeed, boostAmount } = p;
          const px = p.graphic.x;
          const py = p.graphic.y;

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
        } else {
          if (payload.spinnerSpeed !== undefined && p.type === "spinner") {
            p.spinnerSpeed = payload.spinnerSpeed;
          }
          if (payload.boostAmount !== undefined && p.type === "boost_gate") {
            p.boostAmount = payload.boostAmount;
          }
          newSelection.push(p);
        }
      });
      if (payload.w !== undefined || payload.h !== undefined) {
        scene.selectParts(newSelection);
      } else {
        scene.notifyState();
      }
    }
  } else if (action === "save-state") {
    scene.saveState();
  } else if (action === "undo") {
    scene.undo();
  } else if (action === "redo") {
    scene.redo();
  } else if (action === "reset-marbles") {
    scene.resetMarbles();
  } else if (action === "shake-marbles") {
    scene.shakeMarbles();
  } else if (action === "reset-template") {
    scene.parts.forEach((p) => {
      scene.matter.world.remove(p.body);
      p.graphic.destroy();
    });
    scene.parts = [];
    scene.selectParts([]);
    scene.setupCourse();
  } else if (action === "deselect-all") {
    scene.selectParts([]);
  } else if (action === "copy") {
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
      }));
      scene.pasteCount = 0;
    }
  } else if (action === "cut") {
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
  } else if (action === "paste") {
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
          p.boostAmount
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
  } else if (action === "duplicate") {
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
          p.boostAmount
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
}

const actionHandlers = {
  ["toggle-mode"](scene: MainScene) {
    scene.setMode(scene.mode === "play" ? "edit" : "play");
  },
  ["toggle-debug-rendering"](scene: MainScene) {
    scene.showDebugBodies = !scene.showDebugBodies;
    scene.applyRenderingMode();
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
      });

      scene.updateSelectionBox();
      scene.saveState();
    }
  },
  ["nudge-part"](scene: MainScene, payload: any) {
    if (scene.selectedParts.length > 0) {
      scene.selectedParts.forEach((p) => {
        scene.matter.body.setPosition(p.body, {
          x: p.body.position.x + (payload.dx || 0),
          y: p.body.position.y + (payload.dy || 0),
        });
        p.graphic.setPosition(p.body.position.x, p.body.position.y);
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
          if (p.graphic && typeof p.graphic.fillColor !== "undefined") {
            p.graphic.fillColor = payload.color;
          }
          newSelection.push(p);
        } else if (payload.w !== undefined || payload.h !== undefined) {
          const newW = payload.w !== undefined ? payload.w : p.w;
          const newH = payload.h !== undefined ? payload.h : p.h;

          const { type, color, id, baseAngle, spinnerSpeed, boostAmount } = p;
          const px = p.graphic.x;
          const py = p.graphic.y;

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
        } else {
          if (payload.spinnerSpeed !== undefined && p.type === "spinner") {
            p.spinnerSpeed = payload.spinnerSpeed;
          }
          if (payload.boostAmount !== undefined && p.type === "boost_gate") {
            p.boostAmount = payload.boostAmount;
          }
          newSelection.push(p);
        }
      });
      if (payload.w !== undefined || payload.h !== undefined) {
        scene.selectParts(newSelection);
      } else {
        scene.notifyState();
      }
    }
  },
  ["save-state"](scene: MainScene) {
    scene.saveState();
  },
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
          p.boostAmount
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
          p.boostAmount
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

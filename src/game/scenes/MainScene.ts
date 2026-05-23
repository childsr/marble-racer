import Phaser from "phaser";
import { Part, SerializedPart } from "../parts/types";
import { createRamp } from "../parts/Ramp";
import { createPin } from "../parts/Pin";
import { createSpinner, updateSpinner } from "../parts/Spinner";
import { createBin } from "../parts/Bin";
import { createFinishZone } from "../parts/FinishZone";

const MARBLE_RESTITUTION = 1.0;

export class MainScene extends Phaser.Scene {
  private mode: "play" | "edit" = "edit";
  private actionListener: any;

  private parts: Part[] = [];
  private selectedParts: Part[] = [];
  private selectionBoxes: Phaser.GameObjects.Rectangle[] = [];

  private isBoxSelecting = false;
  private boxSelectStart = { x: 0, y: 0 };
  private boxSelectionVisual!: Phaser.GameObjects.Rectangle;

  private history: SerializedPart[][] = [];
  private historyIndex: number = -1;
  private needsSaveStateFromKeyboard: boolean = false;

  private marbles: MatterJS.BodyType[] = [];
  private marbleGraphics: Phaser.GameObjects.Shape[] = [];
  private numMarbles = 8;
  private marbleColors = [
    0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff, 0x44ffff, 0xff8844,
    0x8844ff,
  ];
  private finishList: { color: number; place: number }[] = [];
  private marblesToRemove: MatterJS.BodyType[] = [];
  private finishedMarblesSet: Set<MatterJS.BodyType> = new Set();
  private activeGlows: Phaser.GameObjects.Arc[] = [];
  private particles: any;

  constructor() {
    super("MainScene");
  }

  preload() {
    // Generate a simple circular texture for particles
    const graphics = this.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(16, 16, 16);
    graphics.generateTexture("flare", 32, 32);
  }

  create() {
    this.createBoundaryWalls();

    // Selection Box visual
    this.boxSelectionVisual = this.add.rectangle(0, 0, 0, 0, 0x00ff00, 0.1);
    this.boxSelectionVisual.setStrokeStyle(2, 0x00ff00);
    this.boxSelectionVisual.setDepth(200);
    this.boxSelectionVisual.setVisible(false);

    // Initial Layout setup once
    const saved = localStorage.getItem("physics_sandbox_level_state");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          this.applyState(parsed);
          this.history = [parsed];
          this.historyIndex = 0;
          this.notifyState();
        } else {
          this.setupCourse();
        }
      } catch (e) {
        console.error("Failed to load state from localStorage", e);
        this.setupCourse();
      }
    } else {
      this.setupCourse();
    }

    // Particles for collisions
    this.particles = this.add.particles(0, 0, "flare", {
      speed: { min: 10, max: 50 },
      scale: { start: 0.1, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 300,
      blendMode: "ADD",
      emitting: false,
    });

    this.matter.world.on("collisionstart", (event: any) => {
      if (this.mode !== "play") return;
      event.pairs.forEach((pair: any) => {
        const { bodyA, bodyB } = pair;

        const parentA = bodyA.parent || bodyA;
        const parentB = bodyB.parent || bodyB;

        const partA = this.parts.find((p) => p.body === parentA);
        const partB = this.parts.find((p) => p.body === parentB);

        const isBodyAMarble = this.marbles.includes(parentA) || parentA.label === "marble";
        const isBodyBMarble = this.marbles.includes(parentB) || parentB.label === "marble";

        const isBodyAFinish = (partA && partA.type === "finish_zone") || parentA.label === "finish_zone" || bodyA.label === "finish_zone";
        const isBodyBFinish = (partB && partB.type === "finish_zone") || parentB.label === "finish_zone" || bodyB.label === "finish_zone";

        const isPinMarble =
          ((parentA.label === "pin" || (partA && partA.type === "pin") || bodyA.label === "pin") && isBodyBMarble) ||
          ((parentB.label === "pin" || (partB && partB.type === "pin") || bodyB.label === "pin") && isBodyAMarble);
        if (isPinMarble) {
          const marble = isBodyAMarble ? parentA : parentB;
          this.particles.emitParticleAt(marble.position.x, marble.position.y, 5);
        }
      });
    });

    this.setupInput();

    // Listen for UI events
    this.actionListener = (e: any) => this.handleEditorAction(e.detail);
    window.addEventListener("phaser-editor-action", this.actionListener);

    // Initial state push
    this.notifyState();

    // Resize listener
    this.scale.on("resize", this.resize, this);

    // Cleanup when scene is destroyed
    this.events.once("destroy", () => {
      window.removeEventListener("phaser-editor-action", this.actionListener);
    });
  }

  private handleEditorAction({
    action,
    payload,
  }: {
    action: string;
    payload?: any;
  }) {
    if (action === "toggle-mode") {
      this.setMode(this.mode === "play" ? "edit" : "play");
    } else if (action === "add-part") {
      this.addNewPart(payload);
      this.saveState();
    } else if (action === "delete-part") {
      if (this.selectedParts.length > 0) {
        this.selectedParts.forEach((p) => {
          this.matter.world.remove(p.body);
          p.graphic.destroy();
          this.parts = this.parts.filter((o) => o !== p);
        });
        this.selectParts([]);
        this.saveState();
      }
    } else if (action === "rotate-part") {
      if (this.selectedParts.length > 0) {
        let cx = 0,
          cy = 0;
        this.selectedParts.forEach((p) => {
          cx += p.graphic.x;
          cy += p.graphic.y;
        });
        cx /= this.selectedParts.length;
        cy /= this.selectedParts.length;
        const angleInc = Phaser.Math.DegToRad(payload);

        this.selectedParts.forEach((p) => {
          const Point = Phaser.Math.RotateAround(
            { x: p.graphic.x, y: p.graphic.y },
            cx,
            cy,
            angleInc,
          );
          p.graphic.setPosition(Point.x, Point.y);
          this.matter.body.setPosition(p.body, Point);

          p.baseAngle += angleInc;
          this.matter.body.setAngle(p.body, p.baseAngle);
          p.graphic.setRotation(p.baseAngle);
        });

        this.updateSelectionBox();
        this.saveState();
      }
    } else if (action === "nudge-part") {
      if (this.selectedParts.length > 0) {
        this.selectedParts.forEach((p) => {
          this.matter.body.setPosition(p.body, {
            x: p.body.position.x + (payload.dx || 0),
            y: p.body.position.y + (payload.dy || 0),
          });
          p.graphic.setPosition(p.body.position.x, p.body.position.y);
        });
        this.updateSelectionBox();
        this.saveState();
      }
    } else if (action === "scale-part") {
      if (this.selectedParts.length > 0) {
        const factor = payload > 0 ? 1.2 : 1 / 1.2;
        let cx = 0,
          cy = 0;
        this.selectedParts.forEach((p) => {
          cx += p.graphic.x;
          cy += p.graphic.y;
        });
        cx /= this.selectedParts.length;
        cy /= this.selectedParts.length;

        const newSelection: Part[] = [];
        const list = [...this.selectedParts];

        list.forEach((p) => {
          const newW = p.w * factor;
          const newH =
            p.type === "pin" || p.type === "finish_zone" ? p.h * factor : p.h;

          const dx = (p.graphic.x - cx) * factor;
          const dy = (p.graphic.y - cy) * factor;
          const nx = cx + dx;
          const ny = cy + dy;

          const { type, color, id } = p;
          const angle = p.baseAngle;

          this.matter.world.remove(p.body);
          p.graphic.destroy();
          this.parts = this.parts.filter((o) => o !== p);

          const newPart = this.createPart(
            type,
            nx,
            ny,
            newW,
            newH,
            angle,
            id,
            color,
            p.spinnerSpeed,
          );
          newSelection.push(newPart);
        });

        this.selectParts(newSelection);
        this.saveState();
      }
    } else if (action === "change-part-property") {
      if (this.selectedParts.length > 0) {
        const newSelection: Part[] = [];
        this.selectedParts.forEach((p) => {
          if (payload.color !== undefined) {
            p.color = payload.color;
            p.graphic.fillColor = payload.color;
            newSelection.push(p);
          } else if (payload.w !== undefined || payload.h !== undefined) {
            const newW = payload.w !== undefined ? payload.w : p.w;
            const newH = payload.h !== undefined ? payload.h : p.h;

            const { type, color, id, baseAngle, spinnerSpeed } = p;
            const px = p.graphic.x;
            const py = p.graphic.y;

            this.matter.world.remove(p.body);
            p.graphic.destroy();
            this.parts = this.parts.filter((o) => o !== p);

            const newPart = this.createPart(
              type,
              px,
              py,
              newW,
              newH,
              baseAngle,
              id,
              color,
              spinnerSpeed,
            );
            newSelection.push(newPart);
          } else {
            if (payload.spinnerSpeed !== undefined && p.type === "spinner") {
              p.spinnerSpeed = payload.spinnerSpeed;
            }
            newSelection.push(p);
          }
        });
        if (payload.w !== undefined || payload.h !== undefined) {
          this.selectParts(newSelection);
        } else {
          this.notifyState();
        }
      }
    } else if (action === "save-state") {
      this.saveState();
    } else if (action === "undo") {
      this.undo();
    } else if (action === "redo") {
      this.redo();
    } else if (action === "reset-marbles") {
      this.resetMarbles();
    } else if (action === "shake-marbles") {
      this.shakeMarbles();
    } else if (action === "reset-template") {
      this.parts.forEach((p) => {
        this.matter.world.remove(p.body);
        p.graphic.destroy();
      });
      this.parts = [];
      this.selectParts([]);
      this.setupCourse();
    }
  }

  private setMode(mode: "play" | "edit") {
    this.activeGlows.forEach((g) => {
      if (g && g.active) g.destroy();
    });
    this.activeGlows = [];

    if (mode === "play") {
      this.selectParts([]);
      this.updateSelectionBox();
    }

    this.mode = mode;
    this.finishedMarblesSet.clear();
    if (mode === "edit") {
      // Remove marbles
      this.marbles.forEach((m) => this.matter.world.remove(m));
      this.marbleGraphics.forEach((g) => g.destroy());
      this.marbles = [];
      this.marbleGraphics = [];
      this.finishList = [];
      // Reset spinners correctly
      this.parts.forEach((part) => {
        if (part.type === "spinner") {
          this.matter.body.setAngle(part.body, part.baseAngle);
          part.graphic.setRotation(part.baseAngle);
        }
      });
    } else {
      // Switch to play mode
      this.finishList = [];
      this.spawnMarbles();
    }
    this.notifyState();
  }

  private notifyState() {
    const sp = this.selectedParts[0];
    let cx = 0,
      cy = 0;
    if (this.selectedParts.length > 0) {
      this.selectedParts.forEach((p) => {
        cx += p.graphic.x;
        cy += p.graphic.y;
      });
      cx /= this.selectedParts.length;
      cy /= this.selectedParts.length;
    }

    const hasSpinnerSelected = this.selectedParts.some(
      (p) => p.type === "spinner",
    );

    window.dispatchEvent(
      new CustomEvent("phaser-state-change", {
        detail: {
          mode: this.mode,
          hasSelection: this.selectedParts.length > 0,
          canUndo: this.historyIndex > 0,
          canRedo: this.historyIndex < this.history.length - 1,
          selectedPartColor: sp?.color,
          selectedPartSpinnerSpeed: sp?.spinnerSpeed,
          hasSpinnerSelected,
          selectedPartX: cx,
          selectedPartY: cy,
          selectedPartId: sp?.id,
          stageWidth: this.scale.width,
          stageHeight: this.scale.height,
          selectedPartType: sp?.type,
          selectedPartW: sp?.w,
          selectedPartH: sp?.h,
          finishList: [...this.finishList],
        },
      }),
    );
  }

  update() {
    if (this.mode === "play") {
      this.parts.forEach((part) => {
        if (part.type === "spinner") {
          updateSpinner(this, part);
        }
      });

      // Manual geometric overlap check to ensure the marble is completely inside the finish zone
      const marblesToDestroy: { marble: MatterJS.BodyType; color: number }[] = [];

      this.marbles.forEach((marble) => {
        // Only process marbles that haven't finished yet
        if (this.finishedMarblesSet.has(marble)) return;

        this.parts.forEach((part) => {
          if (part.type === "finish_zone") {
            const cos = Math.cos(-part.baseAngle);
            const sin = Math.sin(-part.baseAngle);
            const rx = marble.position.x - part.graphic.x;
            const ry = marble.position.y - part.graphic.y;
            const localX = rx * cos - ry * sin;
            const localY = rx * sin + ry * cos;
            const marbleRadius = 14;
            const isCompletelyInside = 
              (Math.abs(localX) + marbleRadius) <= part.w / 2 && 
              (Math.abs(localY) + marbleRadius) <= part.h / 2;
            if (isCompletelyInside) {
              const idx = this.marbles.indexOf(marble);
              if (idx !== -1) {
                const graphic = this.marbleGraphics[idx];
                const color = (graphic as Phaser.GameObjects.Arc).fillColor;
                
                // Add to finish list scoreboard immediately
                this.finishList.push({ color, place: this.finishList.length + 1 });
                this.notifyState();

                this.finishedMarblesSet.add(marble);
                marblesToDestroy.push({ marble, color });
              }
            }
          }
        });
      });

      // Destroy the finished marbles instantly without delay!
      marblesToDestroy.forEach(({ marble, color }) => {
        const currentIdx = this.marbles.indexOf(marble);
        if (currentIdx !== -1) {
          const currentGraphic = this.marbleGraphics[currentIdx];
          if (currentGraphic) {
            currentGraphic.destroy();
          }

          // Play explosive particle burst upon despawn/removal
          const expl = this.add.particles(0, 0, "flare", {
            speed: { min: 100, max: 350 },
            scale: { start: 0.35, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: { min: 350, max: 700 },
            gravityY: 450,
            blendMode: "ADD",
            tint: color,
          });
          expl.explode(45, marble.position.x, marble.position.y);
          this.time.delayedCall(850, () => {
            expl.destroy();
          });

          this.matter.world.remove(marble);
          this.marbles.splice(currentIdx, 1);
          this.marbleGraphics.splice(currentIdx, 1);
        }
      });

      for (let i = 0; i < this.marbles.length; i++) {
        const marble = this.marbles[i];
        const graphic = this.marbleGraphics[i];
        graphic.x = marble.position.x;
        graphic.y = marble.position.y;
        graphic.rotation = marble.angle;
      }
    }
  }

  private setupInput() {
    let dragStartMap = new Map<Part, { x: number; y: number }>();
    let isDraggingSelection = false;
    let hasDraggedSelection = false;

    this.input.on("dragstart", (pointer: any, gameObject: any) => {
      if (this.mode === "edit") {
        const part = this.parts.find((p) => p.graphic === gameObject);
        if (part && !this.selectedParts.includes(part)) {
          const add =
            pointer.event.ctrlKey ||
            pointer.event.metaKey ||
            pointer.event.shiftKey;
          if (add) {
            this.selectParts([...this.selectedParts, part]);
          } else {
            this.selectParts([part]);
          }
        }

        dragStartMap.clear();
        this.selectedParts.forEach((p) =>
          dragStartMap.set(p, { x: p.graphic.x, y: p.graphic.y }),
        );
        isDraggingSelection = true;
        hasDraggedSelection = false;
      }
    });

    this.input.on(
      "drag",
      (pointer: any, gameObject: any, dragX: number, dragY: number) => {
        if (this.mode === "edit" && isDraggingSelection) {
          hasDraggedSelection = true;
          const mainPart = this.parts.find((p) => p.graphic === gameObject);
          if (!mainPart) return;

          const orig = dragStartMap.get(mainPart);
          if (!orig) return;

          const dx = dragX - orig.x;
          const dy = dragY - orig.y;

          this.selectedParts.forEach((p) => {
            const pOrig = dragStartMap.get(p);
            if (pOrig) {
              p.graphic.x = pOrig.x + dx;
              p.graphic.y = pOrig.y + dy;
              this.matter.body.setPosition(p.body, {
                x: p.graphic.x,
                y: p.graphic.y,
              });
            }
          });
          this.updateSelectionBox();
        }
      },
    );

    this.input.on("dragend", (pointer: any, gameObject: any) => {
      if (this.mode === "edit") {
        isDraggingSelection = false;
        dragStartMap.clear();
        if (hasDraggedSelection) {
          this.saveState();
        }
        hasDraggedSelection = false;
      }
    });

    this.input.on(
      "pointerdown",
      (pointer: Phaser.Input.Pointer, currentlyOver: any[]) => {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }

        if (this.mode === "edit") {
          if (currentlyOver.length === 0 || currentlyOver[0] === undefined) {
            const shiftOrCtrl =
              pointer.event.shiftKey ||
              pointer.event.ctrlKey ||
              pointer.event.metaKey;
            if (!shiftOrCtrl) {
              this.selectParts([]);
            }

            this.isBoxSelecting = true;
            this.boxSelectStart = { x: pointer.worldX, y: pointer.worldY };
            this.boxSelectionVisual.setPosition(pointer.worldX, pointer.worldY);
            this.boxSelectionVisual.setSize(0, 0);
            this.boxSelectionVisual.setVisible(true);
          }
        }
      },
    );

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (this.mode === "edit" && this.isBoxSelecting) {
        const w = pointer.worldX - this.boxSelectStart.x;
        const h = pointer.worldY - this.boxSelectStart.y;
        this.boxSelectionVisual.setPosition(
          this.boxSelectStart.x + w / 2,
          this.boxSelectStart.y + h / 2,
        );
        this.boxSelectionVisual.setSize(Math.abs(w), Math.abs(h));
      }
    });

    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (this.mode === "edit" && this.isBoxSelecting) {
        this.isBoxSelecting = false;
        this.boxSelectionVisual.setVisible(false);

        const rect = new Phaser.Geom.Rectangle(
          Math.min(this.boxSelectStart.x, pointer.worldX),
          Math.min(this.boxSelectStart.y, pointer.worldY),
          Math.abs(pointer.worldX - this.boxSelectStart.x),
          Math.abs(pointer.worldY - this.boxSelectStart.y),
        );

        if (rect.width > 5 || rect.height > 5) {
          const inBox = this.parts.filter((p) =>
            rect.contains(p.graphic.x, p.graphic.y),
          );
          const shiftOrCtrl =
            pointer.event.shiftKey ||
            pointer.event.ctrlKey ||
            pointer.event.metaKey;

          if (shiftOrCtrl) {
            const newSel = [...this.selectedParts];
            inBox.forEach((p) => {
              if (!newSel.includes(p)) newSel.push(p);
            });
            this.selectParts(newSel);
          } else {
            this.selectParts(inBox);
          }
        }
      }
    });
  }

  private addNewPart(type: string) {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    let part;
    if (type === "ramp") {
      part = this.createPart("ramp", centerX, centerY, 300, 20, 0);
    } else if (type === "pin") {
      part = this.createPart("pin", centerX, centerY, 14, 14, 0);
    } else if (type === "spinner") {
      part = this.createPart("spinner", centerX, centerY, 300, 25, 0);
    } else if (type === "finish_zone") {
      part = this.createPart("finish_zone", centerX, centerY, 150, 80, 0);
    }

    if (part) this.selectParts([part]);
  }

  private createPart(
    type: Part["type"],
    x: number,
    y: number,
    w: number,
    h: number,
    angle: number,
    id?: string,
    color?: number,
    spinnerSpeed?: number,
  ) {
    const partId = id || Math.random().toString();
    let part: Part;

    if (type === "ramp") {
      part = createRamp(this, x, y, w, h, angle, partId, color);
    } else if (type === "pin") {
      part = createPin(this, x, y, w, h, angle, partId, color);
    } else if (type === "spinner") {
      part = createSpinner(this, x, y, w, h, angle, partId, color, spinnerSpeed);
    } else if (type === "bin") {
      part = createBin(this, x, y, w, h, angle, partId, color);
    } else if (type === "finish_zone") {
      part = createFinishZone(this, x, y, w, h, angle, partId, color);
    } else {
      throw new Error(`Unknown part type: ${type}`);
    }

    part.graphic.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.mode !== "edit") return;
      const add =
        pointer.event.ctrlKey ||
        pointer.event.metaKey ||
        pointer.event.shiftKey;
      if (add) {
        if (this.selectedParts.includes(part)) {
          this.selectParts(this.selectedParts.filter((p) => p !== part));
        } else {
          this.selectParts([...this.selectedParts, part]);
        }
      } else if (!this.selectedParts.includes(part)) {
        this.selectParts([part]);
      }
    });

    this.parts.push(part);
    return part;
  }

  private updateSelectionBox() {
    while (this.selectionBoxes.length < this.selectedParts.length) {
      const box = this.add.rectangle(0, 0, 100, 100, 0x00ff00, 0);
      box.setStrokeStyle(4, 0x00ff00);
      box.setDepth(100);
      this.selectionBoxes.push(box);
    }
    while (this.selectionBoxes.length > this.selectedParts.length) {
      const box = this.selectionBoxes.pop()!;
      box.destroy();
    }

    this.selectedParts.forEach((part, i) => {
      const box = this.selectionBoxes[i];
      box.setVisible(true);
      box.setPosition(part.graphic.x, part.graphic.y);
      box.setRotation(part.graphic.rotation);

      if (part.type === "pin") {
        box.setSize(part.w * 2 + 10, part.w * 2 + 10);
      } else {
        box.setSize(part.w + 10, part.h + 10);
      }
    });
  }

  private selectParts(parts: Part[]) {
    if (this.mode !== "edit") return;
    this.selectedParts = parts;
    this.updateSelectionBox();
    this.notifyState();
  }

  private createBoundaryWalls() {
    const { width, height } = this.scale;
    const wallColor = 0x8e9299;
    const wallThickness = 20;

    // Boundary walls
    this.matter.add.rectangle(width / 2, 10, width, wallThickness, {
      isStatic: true,
    });
    this.matter.add.rectangle(width / 2, height - 10, width, wallThickness, {
      isStatic: true,
    });
    this.matter.add.rectangle(10, height / 2, wallThickness, height, {
      isStatic: true,
    });
    this.matter.add.rectangle(width - 10, height / 2, wallThickness, height, {
      isStatic: true,
    });

    this.add.rectangle(width / 2, 10, width, wallThickness, wallColor);
    this.add.rectangle(width / 2, height - 10, width, wallThickness, wallColor);
    this.add.rectangle(10, height / 2, wallThickness, height, wallColor);
    this.add.rectangle(
      width - 10,
      height / 2,
      wallThickness,
      height,
      wallColor,
    );
  }

  private createRampBetween(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    thickness: number,
  ) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    return this.createPart("ramp", midX, midY, distance, thickness, angle);
  }

  private applyState(state: SerializedPart[]) {
    this.parts.forEach((p) => {
      this.matter.world.remove(p.body);
      p.graphic.destroy();
    });
    this.parts = [];
    this.selectParts([]);

    state.forEach((s) => {
      this.createPart(
        s.type,
        s.x,
        s.y,
        s.w,
        s.h,
        s.baseAngle,
        s.id,
        s.color,
        s.spinnerSpeed,
      );
    });
  }

  private saveState() {
    const state = this.parts.map((p) => ({
      id: p.id,
      type: p.type,
      x: p.graphic.x,
      y: p.graphic.y,
      w: p.w,
      h: p.h,
      baseAngle: p.baseAngle,
      color: p.color,
      spinnerSpeed: p.spinnerSpeed,
    }));
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(state);
    this.historyIndex = this.history.length - 1;
    this.saveToLocalStorage(state);
    this.notifyState();
  }

  private saveToLocalStorage(state: SerializedPart[]) {
    try {
      localStorage.setItem(
        "physics_sandbox_level_state",
        JSON.stringify(state),
      );
    } catch (e) {
      console.error("Failed to save state to localStorage", e);
    }
  }

  private undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      const state = this.history[this.historyIndex];
      this.applyState(state);
      this.saveToLocalStorage(state);
      this.notifyState();
    }
  }

  private redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      const state = this.history[this.historyIndex];
      this.applyState(state);
      this.saveToLocalStorage(state);
      this.notifyState();
    }
  }

  private setupCourse() {
    // Basic landscape course to jump into editing
    this.createRampBetween(50, 150, 800, 250, 15);
    this.createRampBetween(850, 300, 1750, 400, 15);
    this.createRampBetween(1850, 450, 1600, 500, 15);

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
        this.createPart("pin", x, y, 10, 10, 0);
      }
    }

    this.createRampBetween(1600, 950, 700, 980, 15);
    this.createPart("spinner", 850, 820, 350, 25, 0);

    const binCount = 5;
    const binWidth = 120;
    const binStartX = 150;
    const binY = 1080 - 80;

    for (let i = 0; i <= binCount; i++) {
      const x = binStartX + i * binWidth;
      this.createPart("bin", x, binY + 40, 15, 80, 0);
    }

    // Add default Finish Zone spanning the bins at the bottom
    this.createPart("finish_zone", 450, binY + 40, 600, 60, 0);

    this.saveState();
  }

  private spawnMarbles() {
    for (let i = 0; i < this.numMarbles; i++) {
      const x = 100 + (i % 4) * 30;
      const y = 80 - Math.floor(i / 4) * 30;
      const color = this.marbleColors[i % this.marbleColors.length];

      const marble = this.matter.add.circle(x, y, 14, {
        restitution: MARBLE_RESTITUTION,
        friction: 0,
        frictionAir: 0,
        mass: 1.5,
        label: "marble",
      });

      const graphic = this.add.circle(x, y, 14, color);
      graphic.setDepth(50);

      this.marbles.push(marble);
      this.marbleGraphics.push(graphic);
    }
  }

  private resetMarbles() {
    if (this.mode !== "play") return;
    this.activeGlows.forEach((g) => {
      if (g && g.active) g.destroy();
    });
    this.activeGlows = [];

    this.marbles.forEach((m) => this.matter.world.remove(m));
    this.marbleGraphics.forEach((g) => g.destroy());
    this.marbles = [];
    this.marbleGraphics = [];
    this.marblesToRemove = [];
    this.finishedMarblesSet.clear();
    this.finishList = [];
    this.spawnMarbles();
    this.notifyState();
  }

  private shakeMarbles() {
    if (this.mode !== "play") return;
    this.marbles.forEach((marble) => {
      const forceX = (Math.random() - 0.5) * 0.05;
      const forceY = (Math.random() - 0.5) * 0.05;
      this.matter.body.applyForce(marble, marble.position, {
        x: forceX,
        y: forceY,
      });
    });
  }

  private resize(gameSize: Phaser.Structs.Size) {
    const { width, height } = gameSize;
    this.cameras.main.setViewport(0, 0, width, height);
  }
}

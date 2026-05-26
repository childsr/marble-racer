import Phaser from "phaser";
import { Part, SerializedPart } from "../parts/types";
import { createRamp } from "../parts/Ramp";
import { createPin } from "../parts/Pin";
import { createSpinner, updateSpinner } from "../parts/Spinner";
import { createFinishZone } from "../parts/FinishZone";
import { createMarble } from "../parts/Marble";
import { createScatterGate } from "../parts/ScatterGate";
import { createBoostGate } from "../parts/BoostGate";
import { createCurvedRamp, rebuildCurvedRamp, getBoundingBox } from "../parts/CurvedRamp";
import { handleEditorAction } from "./handleEditorAction"

const MARBLE_RESTITUTION = 0.7;

function drawDottedLine(
  graphics: Phaser.GameObjects.Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  dotRadius = 2.5,
  spacing = 8,
  color = 0x00f0ff,
  alpha = 0.8
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const numDots = Math.floor(distance / spacing);

  graphics.fillStyle(color, alpha);
  for (let i = 0; i <= numDots; i++) {
    const t = numDots > 0 ? i / numDots : 0;
    const px = x1 + dx * t;
    const py = y1 + dy * t;
    graphics.fillCircle(px, py, dotRadius);
  }
}

export class MainScene extends Phaser.Scene {
  mode: "play" | "edit" = "edit";
  actionListener: any;
  simSpeed: number = 1.0;

  parts: Part[] = [];
  selectedParts: Part[] = [];
  selectionBoxes: Phaser.GameObjects.GameObject[] = [];
  curvedRampsRedrawMap = new Map<string, () => void>();

  clipboard: {
    type: Part["type"];
    x: number;
    y: number;
    w: number;
    h: number;
    baseAngle: number;
    color: number;
    spinnerSpeed?: number;
    boostAmount?: number;
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
    cx?: number;
    cy?: number;
  }[] = [];
  pasteCount = 0;

  isBoxSelecting = false;
  boxSelectStart = { x: 0, y: 0 };
  boxSelectionVisual!: Phaser.GameObjects.Rectangle;

  history: SerializedPart[][] = [];
  historyIndex: number = -1;
  needsSaveStateFromKeyboard: boolean = false;

  marbles: MatterJS.BodyType[] = [];
  marbleGraphics: Phaser.GameObjects.Shape[] = [];
  numMarbles = 8;
  marbleColors = [
    0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff, 0x44ffff, 0xff8844,
    0x8844ff,
  ];
  finishList: { color: number; place: number }[] = [];
  marblesToRemove: MatterJS.BodyType[] = [];
  finishedMarblesSet: Set<MatterJS.BodyType> = new Set();
  activeGlows: Phaser.GameObjects.Arc[] = [];
  particles: any;
  wallGraphics: Phaser.GameObjects.Rectangle[] = [];
  showDebugBodies = false;

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
    // Disable debug drawing on boot (since it was enabled in config to register hooks)
    this.matter.world.drawDebug = false;
    if (this.matter.world.debugGraphic) {
      this.matter.world.debugGraphic.setVisible(false);
    }

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

        const isScatterGateA = bodyA.label === "scatter_gate_sensor";
        const isScatterGateB = bodyB.label === "scatter_gate_sensor";

        const isBoostGateA = bodyA.label === "boost_gate_sensor";
        const isBoostGateB = bodyB.label === "boost_gate_sensor";

        if (isScatterGateA && isBodyBMarble) {
          const marble = parentB;
          this.bendMarbleDirection(marble);
          const gatePart = partA;
          if (gatePart && gatePart.type === "scatter_gate" && gatePart.graphic) {
            const container = gatePart.graphic as Phaser.GameObjects.Container;
            container.list.forEach((child: any) => {
              if (child instanceof Phaser.GameObjects.Rectangle) {
                const origAlpha = child.alpha;
                child.setAlpha(1.0);
                this.tweens.add({
                  targets: child,
                  alpha: origAlpha,
                  duration: 200,
                });
              }
            });
          }
        } else if (isScatterGateB && isBodyAMarble) {
          const marble = parentA;
          this.bendMarbleDirection(marble);
          const gatePart = partB;
          if (gatePart && gatePart.type === "scatter_gate" && gatePart.graphic) {
            const container = gatePart.graphic as Phaser.GameObjects.Container;
            container.list.forEach((child: any) => {
              if (child instanceof Phaser.GameObjects.Rectangle) {
                const origAlpha = child.alpha;
                child.setAlpha(1.0);
                this.tweens.add({
                  targets: child,
                  alpha: origAlpha,
                  duration: 200,
                });
              }
            });
          }
        }

        if (isBoostGateA && isBodyBMarble) {
          const marble = parentB;
          const gatePart = partA;
          this.applyBoost(marble, gatePart);
        } else if (isBoostGateB && isBodyAMarble) {
          const marble = parentA;
          const gatePart = partB;
          this.applyBoost(marble, gatePart);
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

  handleEditorAction(a: { action: string; payload?: any; }) {
    handleEditorAction(this, a as any);
  }

  setMode(mode: "play" | "edit") {
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
      // Reset spinners and restore marbles visibility
      this.parts.forEach((part) => {
        if (part.type === "spinner") {
          this.matter.body.setAngle(part.body, part.baseAngle);
          part.graphic.setRotation(part.baseAngle);
        } else if (part.type === "marble") {
          part.body.isSensor = true;
        }
        this.applyPartRenderingMode(part);
      });
    } else {
      // Switch to play mode
      this.finishList = [];
      this.spawnMarbles();
      if (this.matter && this.matter.world) {
        this.matter.world.engine.timing.timeScale = this.simSpeed;
      }
    }
    this.notifyState();
  }

  setSimSpeed(speed: number) {
    this.simSpeed = speed;
    if (this.matter && this.matter.world) {
      this.matter.world.engine.timing.timeScale = speed;
    }
  }

  notifyState() {
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
          selectedPartBoostAmount: sp?.boostAmount,
          selectedPartSegments: sp?.segments,
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
          showDebugBodies: this.showDebugBodies,
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

  setupInput() {
    this.input.addPointer(2);

    let startPinchDistance = 0;
    let isPinching = false;
    let pinchCenter = { x: 0, y: 0 };
    let startPinchAngle = 0;
    let lastPinchAngle = 0;

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
              const oldX = p.graphic.x;
              const oldY = p.graphic.y;
              p.graphic.x = pOrig.x + dx;
              p.graphic.y = pOrig.y + dy;

              if (p.type === "curved_ramp") {
                const deltaX = p.graphic.x - oldX;
                const deltaY = p.graphic.y - oldY;
                this.matter.body.setPosition(p.body, {
                  x: p.body.position.x + deltaX,
                  y: p.body.position.y + deltaY,
                });
              } else {
                this.matter.body.setPosition(p.body, {
                  x: p.graphic.x,
                  y: p.graphic.y,
                });
              }
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
          this.selectedParts.forEach((p) => {
            if (p.type === "curved_ramp") {
              rebuildCurvedRamp(this, p);
            }
          });
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

        const p1 = this.input.pointer1;
        const p2 = this.input.pointer2;
        if (p1.active && p2.active && p1.isDown && p2.isDown) {
          isPinching = true;
          startPinchDistance = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
          pinchCenter = {
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2,
          };
          this.isBoxSelecting = false;
          this.boxSelectionVisual.setVisible(false);
          startPinchAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
          lastPinchAngle = startPinchAngle;
          return;
        }

        if (isPinching) return;

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
      const p1 = this.input.pointer1;
      const p2 = this.input.pointer2;
      if (this.mode === "edit" && p1.active && p2.active && p1.isDown && p2.isDown) {
        if (!isPinching) {
          isPinching = true;
          startPinchDistance = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
          pinchCenter = {
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2,
          };
          this.isBoxSelecting = false;
          this.boxSelectionVisual.setVisible(false);
          startPinchAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
          lastPinchAngle = startPinchAngle;
        }

        // Apply two-finger rotation to selected parts
        if (this.selectedParts.length > 0) {
          const currentAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
          let angleDiff = currentAngle - lastPinchAngle;
          // Normalize to [-PI, PI] to avoid jumps around the wrap-around point
          angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));

          if (Math.abs(angleDiff) > 0.001) {
            let cx = 0,
              cy = 0;
            this.selectedParts.forEach((p) => {
              cx += p.graphic.x;
              cy += p.graphic.y;
            });
            cx /= this.selectedParts.length;
            cy /= this.selectedParts.length;

            this.selectedParts.forEach((p) => {
              const Point = Phaser.Math.RotateAround(
                { x: p.graphic.x, y: p.graphic.y },
                cx,
                cy,
                angleDiff,
              );
              p.graphic.setPosition(Point.x, Point.y);

              if (p.type === "curved_ramp") {
                p.graphic.setRotation(p.graphic.rotation + angleDiff);
                p.baseAngle = p.graphic.rotation;
                rebuildCurvedRamp(this, p);
              } else {
                this.matter.body.setPosition(p.body, Point);

                if (p.type !== "pin" && p.type !== "marble") {
                  p.baseAngle += angleDiff;
                  this.matter.body.setAngle(p.body, p.baseAngle);
                  p.graphic.setRotation(p.baseAngle);
                } else {
                  p.baseAngle = 0;
                  this.matter.body.setAngle(p.body, 0);
                  p.graphic.setRotation(0);
                }
              }
            });

            this.updateSelectionBox();
            this.saveState();
            this.notifyState();
          }
          lastPinchAngle = currentAngle;
        }

        return;
      }

      if (isPinching) return;

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
      const p1 = this.input.pointer1;
      const p2 = this.input.pointer2;
      if (!p1.isDown || !p2.isDown) {
        isPinching = false;
      }
      if (isPinching) return;

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

    this.input.on("wheel", (pointer: Phaser.Input.Pointer, gameObjects: any[], deltaX: number, deltaY: number, deltaZ: number) => {
      if (this.mode === "edit" && this.selectedParts.length > 0) {
        if (pointer.event) {
          pointer.event.preventDefault();
          pointer.event.stopPropagation();
        }

        const angleDegrees = deltaY > 0 ? 5 : -5;
        const angleInc = Phaser.Math.DegToRad(angleDegrees);

        let cx = 0,
          cy = 0;
        this.selectedParts.forEach((p) => {
          cx += p.graphic.x;
          cy += p.graphic.y;
        });
        cx /= this.selectedParts.length;
        cy /= this.selectedParts.length;

        this.selectedParts.forEach((p) => {
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
            rebuildCurvedRamp(this, p);
          } else {
            this.matter.body.setPosition(p.body, Point);

            if (p.type !== "pin" && p.type !== "marble") {
              p.baseAngle += angleInc;
              this.matter.body.setAngle(p.body, p.baseAngle);
              p.graphic.setRotation(p.baseAngle);
            } else {
              p.baseAngle = 0;
              this.matter.body.setAngle(p.body, 0);
              p.graphic.setRotation(0);
            }
          }
        });

        this.updateSelectionBox();
        this.saveState();
        this.notifyState();
      }
    });
  }

  addNewPart(type: string) {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    let part;
    if (type === "ramp") {
      part = this.createPart("ramp", centerX, centerY, 300, 20, 0);
    } else if (type === "curved_ramp") {
      part = this.createPart("curved_ramp", centerX, centerY, 300, 20, 0);
    } else if (type === "pin") {
      part = this.createPart("pin", centerX, centerY, 14, 14, 0);
    } else if (type === "spinner") {
      part = this.createPart("spinner", centerX, centerY, 300, 25, 0);
    } else if (type === "finish_zone") {
      part = this.createPart("finish_zone", centerX, centerY, 150, 80, 0);
    } else if (type === "marble") {
      part = this.createPart("marble", centerX, centerY, 14, 14, 0);
    } else if (type === "scatter_gate") {
      part = this.createPart("scatter_gate", centerX, centerY, 80, 20, 0);
    } else if (type === "boost_gate") {
      part = this.createPart("boost_gate", centerX, centerY, 80, 20, 0);
    }

    if (part) this.selectParts([part]);
  }

  applyBoost(marble: MatterJS.BodyType, gatePart: any) {
    if (!marble || !marble.velocity) return;
    const v = marble.velocity;
    const speed = Math.sqrt(v.x * v.x + v.y * v.y);
    if (speed > 0.01) {
      // Use configured boost amount or fallback to 1.5
      const multiplier = (gatePart && gatePart.boostAmount !== undefined) ? gatePart.boostAmount : 1.5;
      this.matter.body.setVelocity(marble, {
        x: v.x * multiplier,
        y: v.y * multiplier
      });
    }

    // Flash the gate visual
    if (gatePart && gatePart.type === "boost_gate" && gatePart.graphic) {
      const container = gatePart.graphic as Phaser.GameObjects.Container;
      container.list.forEach((child: any) => {
        if (child instanceof Phaser.GameObjects.Rectangle) {
          const origAlpha = child.alpha;
          child.setAlpha(1.0);
          this.tweens.add({
            targets: child,
            alpha: origAlpha,
            duration: 200,
          });
        }
      });
    }

    // Emit light magenta/pink sparks for the boost
    this.particles.emitParticleAt(marble.position.x, marble.position.y, 15);
  }

  bendMarbleDirection(marble: MatterJS.BodyType) {
    if (!marble || !marble.velocity) return;
    const v = marble.velocity;
    const mass = marble.mass;
    const speed = Math.sqrt(v.x * v.x + v.y * v.y);

    const MAX_DEFLECT_IMPULSE = 20;
    const deflectImpulse = Phaser.Math.FloatBetween(-MAX_DEFLECT_IMPULSE, MAX_DEFLECT_IMPULSE);
    
    // Perpendicular unit vector (rotated 90 degrees: (-vy, vx) normalized)
    const px = -v.y / speed;
    const py = v.x / speed;

    const dv: MatterJS.Vector = {
      x: px * deflectImpulse / mass,
      y: py * deflectImpulse / mass
    };

    this.matter.body.setVelocity(marble,{
      x: v.x + dv.x,
      y: v.y + dv.y
    });

    // Emit light green/yellow decorative sparks
    this.particles.emitParticleAt(marble.position.x, marble.position.y, 8);
  }

  createPart(
    type: Part["type"],
    x: number,
    y: number,
    w: number,
    h: number,
    angle: number,
    id?: string,
    color?: number,
    spinnerSpeed?: number,
    boostAmount?: number,
    x1?: number,
    y1?: number,
    x2?: number,
    y2?: number,
    cx?: number,
    cy?: number,
    segments?: number,
  ) {
    const partId = id || Math.random().toString();
    let part: Part;

    if (type === "ramp") {
      part = createRamp(this, x, y, w, h, angle, partId, color);
    } else if (type === "curved_ramp") {
      part = createCurvedRamp(this, x, y, w, h, angle, partId, color, x1, y1, x2, y2, cx, cy, segments);
    } else if (type === "pin") {
      part = createPin(this, x, y, w, h, angle, partId, color);
    } else if (type === "spinner") {
      part = createSpinner(this, x, y, w, h, angle, partId, color, spinnerSpeed);
    } else if (type === "finish_zone") {
      part = createFinishZone(this, x, y, w, h, angle, partId, color);
    } else if (type === "marble") {
      part = createMarble(this, x, y, w, h, angle, partId, color);
    } else if (type === "scatter_gate") {
      part = createScatterGate(this, x, y, w, h, angle, partId, color);
    } else if (type === "boost_gate") {
      part = createBoostGate(this, x, y, w, h, angle, partId, color, boostAmount);
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
    this.applyPartRenderingMode(part);
    return part;
  }

  updateSelectionBox() {
    this.selectionBoxes.forEach((box) => box.destroy());
    this.selectionBoxes = [];
    this.curvedRampsRedrawMap.clear();

    this.selectedParts.forEach((part) => {
      let shape: any;
      const x = part.graphic.x;
      const y = part.graphic.y;

      if (part.type === "curved_ramp") {
        // Draw elegant bounding box
        const bounds = getBoundingBox([
          { x: part.x1!, y: part.y1! },
          { x: part.x2!, y: part.y2! },
          { x: part.cx!, y: part.cy! },
        ]);

        const containerAngle = part.graphic.rotation;
        const cosVal = Math.cos(containerAngle);
        const sinVal = Math.sin(containerAngle);

        const localCenterX = bounds.x + bounds.w / 2;
        const localCenterY = bounds.y + bounds.h / 2;
        const shapeAbsX = x + (localCenterX * cosVal - localCenterY * sinVal);
        const shapeAbsY = y + (localCenterX * sinVal + localCenterY * cosVal);

        shape = this.add.rectangle(
          shapeAbsX,
          shapeAbsY,
          bounds.w,
          bounds.h,
          0x00ff00,
          0
        );
        shape.setStrokeStyle(1.5, 0x00ff00, 0.4);
        shape.setRotation(containerAngle);
        shape.setDepth(100);
        this.selectionBoxes.push(shape);

        const dottedGraphics = this.add.graphics();
        dottedGraphics.setDepth(110);
        this.selectionBoxes.push(dottedGraphics);

        const handlesList: { [name: string]: Phaser.GameObjects.Arc } = {};

        const drawSegmentDottedLines = () => {
          dottedGraphics.clear();
          const pAngle = part.graphic.rotation;
          const cosV = Math.cos(pAngle);
          const sinV = Math.sin(pAngle);

          const startX = part.graphic.x + (part.x1! * cosV - part.y1! * sinV);
          const startY = part.graphic.y + (part.x1! * sinV + part.y1! * cosV);

          const ctrlX = part.graphic.x + (part.cx! * cosV - part.cy! * sinV);
          const ctrlY = part.graphic.y + (part.cx! * sinV + part.cy! * cosV);

          const endX = part.graphic.x + (part.x2! * cosV - part.y2! * sinV);
          const endY = part.graphic.y + (part.x2! * sinV + part.y2! * cosV);

          drawDottedLine(dottedGraphics, startX, startY, ctrlX, ctrlY, 2.5, 8, 0x00f0ff, 0.5);
          drawDottedLine(dottedGraphics, ctrlX, ctrlY, endX, endY, 2.5, 8, 0x00f0ff, 0.5);

          if (handlesList["start"]) handlesList["start"].setPosition(startX, startY);
          if (handlesList["control"]) handlesList["control"].setPosition(ctrlX, ctrlY);
          if (handlesList["end"]) handlesList["end"].setPosition(endX, endY);
        };

        drawSegmentDottedLines();
        this.curvedRampsRedrawMap.set(part.id, drawSegmentDottedLines);

        // Spawn 3 control handles for the Bezier points
        const points = [
          {
            name: "start",
            x: part.x1!,
            y: part.y1!,
            setCur: (lx: number, ly: number) => {
              part.x1 = lx;
              part.y1 = ly;
            },
          },
          {
            name: "control",
            x: part.cx!,
            y: part.cy!,
            setCur: (lx: number, ly: number) => {
              part.cx = lx;
              part.cy = ly;
            },
          },
          {
            name: "end",
            x: part.x2!,
            y: part.y2!,
            setCur: (lx: number, ly: number) => {
              part.x2 = lx;
              part.y2 = ly;
            },
          },
        ];

        points.forEach((pt) => {
          const absX = x + (pt.x * cosVal - pt.y * sinVal);
          const absY = y + (pt.x * sinVal + pt.y * cosVal);
          const color = pt.name === "control" ? 0x00f0ff : 0x00ff00;
          const handle = this.add.circle(absX, absY, 10, color, 0.6);
          handle.setStrokeStyle(2, 0xffffff, 0.8);
          handle.setDepth(120);
          handle.setInteractive({ useHandCursor: true });
          this.input.setDraggable(handle);
          handlesList[pt.name] = handle;

          if (pt.name === "control") {
            this.tweens.add({
              targets: handle,
              scale: 1.4,
              duration: 800,
              yoyo: true,
              repeat: -1,
              ease: "Sine.easeInOut"
            });
          }

          let connectedEnds: { part: Part; endpointName: "start" | "end" }[] = [];

          handle.on("dragstart", () => {
            connectedEnds = [];
            if (pt.name === "control") return;

            // Get absolute position of this handle before the drag starts
            const currentCos = Math.cos(part.graphic.rotation);
            const currentSin = Math.sin(part.graphic.rotation);
            const myAbsX = part.graphic.x + (pt.x * currentCos - pt.y * currentSin);
            const myAbsY = part.graphic.y + (pt.x * currentSin + pt.y * currentCos);

            // Find all other curved ramp start/end endpoints within a 10-pixel radius (already snapped)
            this.parts.forEach((otherPart) => {
              if (otherPart === part || otherPart.type !== "curved_ramp") return;

              const otherCos = Math.cos(otherPart.graphic.rotation);
              const otherSin = Math.sin(otherPart.graphic.rotation);

              // check otherPart's start endpoint
              const oStartX = otherPart.graphic.x + (otherPart.x1! * otherCos - otherPart.y1! * otherSin);
              const oStartY = otherPart.graphic.y + (otherPart.x1! * otherSin + otherPart.y1! * otherCos);
              const distStart = Phaser.Math.Distance.Between(myAbsX, myAbsY, oStartX, oStartY);
              if (distStart < 10) {
                connectedEnds.push({ part: otherPart, endpointName: "start" });
              }

              // check otherPart's end endpoint
              const oEndX = otherPart.graphic.x + (otherPart.x2! * otherCos - otherPart.y2! * otherSin);
              const oEndY = otherPart.graphic.y + (otherPart.x2! * otherSin + otherPart.y2! * otherCos);
              const distEnd = Phaser.Math.Distance.Between(myAbsX, myAbsY, oEndX, oEndY);
              if (distEnd < 10) {
                connectedEnds.push({ part: otherPart, endpointName: "end" });
              }
            });
          });

          handle.on("drag", (pointer: any, dragX: number, dragY: number) => {
            let targetWorldX = dragX;
            let targetWorldY = dragY;

            // Magnetic snap to another nearby endpoint if current point is interactive start/end
            if (pt.name !== "control") {
              const SNAP_DISTANCE = 20;
              let closestSnapPart: Part | null = null;
              let closestSnapName: "start" | "end" | null = null;
              let minSnapDist = SNAP_DISTANCE;
              let snapWorldX = 0;
              let snapWorldY = 0;

              this.parts.forEach((otherPart) => {
                if (otherPart === part || otherPart.type !== "curved_ramp") return;
                // Don't snap to something we are already connected and moving with
                if (connectedEnds.some(conn => conn.part === otherPart)) return;

                const otherCos = Math.cos(otherPart.graphic.rotation);
                const otherSin = Math.sin(otherPart.graphic.rotation);

                // Start endpoint
                const oStartX = otherPart.graphic.x + (otherPart.x1! * otherCos - otherPart.y1! * otherSin);
                const oStartY = otherPart.graphic.y + (otherPart.x1! * otherSin + otherPart.y1! * otherCos);
                const dStart = Phaser.Math.Distance.Between(dragX, dragY, oStartX, oStartY);
                if (dStart < minSnapDist) {
                  minSnapDist = dStart;
                  closestSnapPart = otherPart;
                  closestSnapName = "start";
                  snapWorldX = oStartX;
                  snapWorldY = oStartY;
                }

                // End endpoint
                const oEndX = otherPart.graphic.x + (otherPart.x2! * otherCos - otherPart.y2! * otherSin);
                const oEndY = otherPart.graphic.y + (otherPart.x2! * otherSin + otherPart.y2! * otherCos);
                const dEnd = Phaser.Math.Distance.Between(dragX, dragY, oEndX, oEndY);
                if (dEnd < minSnapDist) {
                  minSnapDist = dEnd;
                  closestSnapPart = otherPart;
                  closestSnapName = "end";
                  snapWorldX = oEndX;
                  snapWorldY = oEndY;
                }
              });

              if (closestSnapPart !== null) {
                targetWorldX = snapWorldX;
                targetWorldY = snapWorldY;
                handle.setFillStyle(0x39ff14, 1.0); // Very bright lime green
                handle.setScale(1.4);
              } else if (connectedEnds.length > 0) {
                handle.setFillStyle(0x39ff14, 1.0); // Keep highlighted bright lime green if moving pre-snapped points
                handle.setScale(1.2);
              } else {
                handle.setFillStyle(0x00ff00, 0.6); // Default green
                handle.setScale(1.0);
              }
            }

            const tempPoint = new Phaser.Math.Vector2();
            part.graphic.getLocalPoint(targetWorldX, targetWorldY, tempPoint);
            const localX = tempPoint.x;
            const localY = tempPoint.y;
            pt.setCur(localX, localY);
            handle.setPosition(targetWorldX, targetWorldY);
            rebuildCurvedRamp(this, part);

            // Also drag connected endpoints along simultaneously!
            connectedEnds.forEach((conn) => {
              const otherTemp = new Phaser.Math.Vector2();
              conn.part.graphic.getLocalPoint(targetWorldX, targetWorldY, otherTemp);
              if (conn.endpointName === "start") {
                conn.part.x1 = otherTemp.x;
                conn.part.y1 = otherTemp.y;
              } else {
                conn.part.x2 = otherTemp.x;
                conn.part.y2 = otherTemp.y;
              }
              rebuildCurvedRamp(this, conn.part);
            });

            // Rescale bounding box outline
            const newBounds = getBoundingBox([
              { x: part.x1!, y: part.y1! },
              { x: part.x2!, y: part.y2! },
              { x: part.cx!, y: part.cy! },
            ]);

            const newContainerAngle = part.graphic.rotation;
            const newCos = Math.cos(newContainerAngle);
            const newSin = Math.sin(newContainerAngle);
            const newLocalCenterX = newBounds.x + newBounds.w / 2;
            const newLocalCenterY = newBounds.y + newBounds.h / 2;
            const newShapeAbsX = part.graphic.x + (newLocalCenterX * newCos - newLocalCenterY * newSin);
            const newShapeAbsY = part.graphic.y + (newLocalCenterX * newSin + newLocalCenterY * newCos);

            shape.setPosition(newShapeAbsX, newShapeAbsY);
            shape.setSize(newBounds.w, newBounds.h);
            shape.setRotation(newContainerAngle);

            const pRedraw = this.curvedRampsRedrawMap.get(part.id);
            if (pRedraw) pRedraw();

            connectedEnds.forEach((conn) => {
              const connRedraw = this.curvedRampsRedrawMap.get(conn.part.id);
              if (connRedraw) connRedraw();
            });
          });

          handle.on("dragend", () => {
            this.saveState();
            this.updateSelectionBox();
          });

          this.selectionBoxes.push(handle);
        });
      } else if (part.type === "pin" || part.type === "marble") {
        const radius = part.w + 5;
        shape = this.add.circle(x, y, radius, 0x00ff00, 0);
        shape.setStrokeStyle(2, 0x00ff00, 0.5);
        shape.setDepth(100);
      } else {
        shape = this.add.rectangle(x, y, part.w + 10, part.h + 10, 0x00ff00, 0);
        shape.setStrokeStyle(2, 0x00ff00, 0.5);
        shape.setDepth(100);
        shape.setRotation(part.graphic.rotation);
      }

      this.selectionBoxes.push(shape);
    });

    if (this.mode === "edit") {
      this.parts.forEach((part) => {
        if (part.type === "curved_ramp" && !this.selectedParts.includes(part)) {
          // Draw dotted lines at reduced overall opacity (0.2)
          const dottedGraphics = this.add.graphics();
          dottedGraphics.setDepth(90);
          this.selectionBoxes.push(dottedGraphics);

          const circles: Phaser.GameObjects.Arc[] = [];

          const redrawNonSelected = () => {
            dottedGraphics.clear();
            const pAngle = part.graphic.rotation;
            const cosV = Math.cos(pAngle);
            const sinV = Math.sin(pAngle);

            const startX = part.graphic.x + (part.x1! * cosV - part.y1! * sinV);
            const startY = part.graphic.y + (part.x1! * sinV + part.y1! * cosV);

            const ctrlX = part.graphic.x + (part.cx! * cosV - part.cy! * sinV);
            const ctrlY = part.graphic.y + (part.cx! * sinV + part.cy! * cosV);

            const endX = part.graphic.x + (part.x2! * cosV - part.y2! * sinV);
            const endY = part.graphic.y + (part.x2! * sinV + part.y2! * cosV);

            drawDottedLine(dottedGraphics, startX, startY, ctrlX, ctrlY, 2, 8, 0x00f0ff, 0.2);
            drawDottedLine(dottedGraphics, ctrlX, ctrlY, endX, endY, 2, 8, 0x00f0ff, 0.2);

            const ptCoords = [
              { x: part.x1!, y: part.y1! },
              { x: part.cx!, y: part.cy! },
              { x: part.x2!, y: part.y2! }
            ];
            ptCoords.forEach((coord, i) => {
              const absX = part.graphic.x + (coord.x * cosV - coord.y * sinV);
              const absY = part.graphic.y + (coord.x * sinV + coord.y * cosV);
              if (circles[i]) {
                circles[i].setPosition(absX, absY);
              }
            });
          };

          const points = [
            { x: part.x1!, y: part.y1!, color: 0x00ff00 },
            { x: part.cx!, y: part.cy!, color: 0x00f0ff },
            { x: part.x2!, y: part.y2!, color: 0x00ff00 },
          ];

          points.forEach((pt) => {
            const pAngle = part.graphic.rotation;
            const cosV = Math.cos(pAngle);
            const sinV = Math.sin(pAngle);
            const absX = part.graphic.x + (pt.x * cosV - pt.y * sinV);
            const absY = part.graphic.y + (pt.x * sinV + pt.y * cosV);
            const ptCircle = this.add.circle(absX, absY, 7, pt.color, 0.2);
            ptCircle.setDepth(95);
            this.selectionBoxes.push(ptCircle);
            circles.push(ptCircle);
          });

          redrawNonSelected();
          this.curvedRampsRedrawMap.set(part.id, redrawNonSelected);
        }
      });
    }
  }

  selectParts(parts: Part[]) {
    if (this.mode !== "edit") return;
    this.selectedParts = parts;
    this.updateSelectionBox();
    this.notifyState();
  }

  createBoundaryWalls() {
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

    const wall1 = this.add.rectangle(width / 2, 10, width, wallThickness, wallColor);
    const wall2 = this.add.rectangle(width / 2, height - 10, width, wallThickness, wallColor);
    const wall3 = this.add.rectangle(10, height / 2, wallThickness, height, wallColor);
    const wall4 = this.add.rectangle(
      width - 10,
      height / 2,
      wallThickness,
      height,
      wallColor,
    );
    this.wallGraphics = [wall1, wall2, wall3, wall4];
    this.wallGraphics.forEach(wall => {
      wall.setVisible(true);
    });
  }

  createRampBetween(
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

  applyState(state: SerializedPart[]) {
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
        s.boostAmount,
        s.x1,
        s.y1,
        s.x2,
        s.y2,
        s.cx,
        s.cy,
        s.segments,
      );
    });
    this.updateSelectionBox();
  }

  saveState() {
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
      boostAmount: p.boostAmount,
      x1: p.x1,
      y1: p.y1,
      x2: p.x2,
      y2: p.y2,
      cx: p.cx,
      cy: p.cy,
      segments: p.segments,
    }));
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(state);
    this.historyIndex = this.history.length - 1;
    this.saveToLocalStorage(state);
    this.notifyState();
  }

  saveToLocalStorage(state: SerializedPart[]) {
    try {
      localStorage.setItem(
        "physics_sandbox_level_state",
        JSON.stringify(state),
      );
    } catch (e) {
      console.error("Failed to save state to localStorage", e);
    }
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      const state = this.history[this.historyIndex];
      this.applyState(state);
      this.saveToLocalStorage(state);
      this.notifyState();
    }
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      const state = this.history[this.historyIndex];
      this.applyState(state);
      this.saveToLocalStorage(state);
      this.notifyState();
    }
  }

  setupCourse() {
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

    // Add default Finish Zone at the bottom
    this.createPart("finish_zone", 450, 1040, 600, 60, 0);

    // Add default starting marbles at the top left of the course
    for (let i = 0; i < 8; i++) {
      const x = 100 + (i % 4) * 35;
      const y = 100 - Math.floor(i / 4) * 35;
      const color = this.marbleColors[i % this.marbleColors.length];
      this.createPart("marble", x, y, 14, 14, 0, undefined, color);
    }

    this.saveState();
    this.updateSelectionBox();
  }

  spawnMarbles() {
    const marbleParts = this.parts.filter((p) => p.type === "marble");
    marbleParts.forEach((part) => {
      const x = part.graphic.x;
      const y = part.graphic.y;
      const color = part.color;

      const marble = this.matter.add.circle(x, y, 14, {
        restitution: MARBLE_RESTITUTION,
        friction: 0,
        frictionAir: 0,
        mass: 1.5,
        label: "marble",
      });

      const graphic = this.add.circle(x, y, 14, color);
      graphic.setDepth(50);
      graphic.setVisible(true);

      this.marbles.push(marble);
      this.marbleGraphics.push(graphic);

      part.graphic.setVisible(false);
      part.body.isSensor = true;
    });
  }

  resetMarbles() {
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

  shakeMarbles() {
    if (this.mode !== "play") return;
    const SHAKE_STRENGTH = 4;
    this.marbles.forEach((marble) => {
      const forceX = (Math.random() - 0.5) * 0.05 * SHAKE_STRENGTH;
      const forceY = (Math.random() - 0.5) * 0.05 * SHAKE_STRENGTH;
      this.matter.body.applyForce(marble, marble.position, {
        x: forceX,
        y: forceY,
      });
    });
  }

  resize(gameSize: Phaser.Structs.Size) {
    const { width, height } = gameSize;
    this.cameras.main.setViewport(0, 0, width, height);
  }

  applyPartRenderingMode(part: Part) {
    if (part.type === "marble" && this.mode === "play") {
      part.graphic.setVisible(false);
    } else {
      part.graphic.setVisible(true);
    }
  }

  applyRenderingMode() {
    // 1. Matter JS Debug rendering toggle
    if (this.showDebugBodies) {
      this.matter.world.drawDebug = true;
      if (!this.matter.world.debugGraphic) {
        this.matter.world.createDebugGraphic();
      }
      this.matter.world.debugGraphic.setVisible(true);
      this.matter.world.debugGraphic.setDepth(999999);
    } else {
      this.matter.world.drawDebug = false;
      if (this.matter.world.debugGraphic) {
        this.matter.world.debugGraphic.setVisible(false);
        this.matter.world.debugGraphic.clear();
      }
    }

    // 2. Part graphics visibility
    this.parts.forEach((part) => {
      this.applyPartRenderingMode(part);
    });

    // 3. Wall graphics visibility
    this.wallGraphics.forEach((wall) => {
      wall.setVisible(true);
    });

    // 4. Active dynamic marbles visibility
    this.marbleGraphics.forEach((g) => {
      g.setVisible(true);
    });

    // 5. Active glows and particles visibility
    this.activeGlows.forEach((g) => {
      if (g && g.active) {
        g.setVisible(true);
      }
    });

    if (this.particles) {
      this.particles.setVisible(true);
    }
  }
}

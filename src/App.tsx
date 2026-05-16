/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameContainer } from "./game/GameContainer";
import { useState, useEffect } from "react";
import {
  Play,
  Edit,
  Trash2,
  PlusCircle,
  RotateCw,
  RefreshCw,
  Maximize2,
  Minimize2,
  Undo2,
  Redo2,
  Settings,
  GripHorizontal,
} from "lucide-react";
import { motion } from "motion/react";

export default function App() {
  const [mode, setMode] = useState<"play" | "edit">("edit");
  const [hasSelection, setHasSelection] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [selectedColor, setSelectedColor] = useState<number | null>(null);
  const [selectedFriction, setSelectedFriction] = useState<number | null>(null);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [panelSide, setPanelSide] = useState<"left" | "right">("right");

  const [hasSpinnerSelected, setHasSpinnerSelected] = useState(false);
  const [selectedSpinnerSpeed, setSelectedSpinnerSpeed] = useState<
    number | null
  >(null);
  const [selectedSpinnerDir, setSelectedSpinnerDir] = useState<1 | -1>(1);

  useEffect(() => {
    const handleStateChange = (e: any) => {
      const d = e.detail;
      if (d.mode) setMode(d.mode);
      if (d.hasOwnProperty("hasSelection")) setHasSelection(d.hasSelection);
      if (d.hasOwnProperty("canUndo")) setCanUndo(d.canUndo);
      if (d.hasOwnProperty("canRedo")) setCanRedo(d.canRedo);
      if (d.hasOwnProperty("selectedPartColor"))
        setSelectedColor(d.selectedPartColor);
      if (d.hasOwnProperty("selectedPartFriction"))
        setSelectedFriction(d.selectedPartFriction);
      if (d.hasOwnProperty("hasSpinnerSelected"))
        setHasSpinnerSelected(d.hasSpinnerSelected);
      if (d.hasOwnProperty("selectedPartSpinnerSpeed")) {
        const s = d.selectedPartSpinnerSpeed;
        setSelectedSpinnerSpeed(s);
        if (s !== null && s !== undefined) {
          if (s < 0) setSelectedSpinnerDir(-1);
          else if (s > 0) setSelectedSpinnerDir(1);
        }
      }

      if (d.selectedPartId && d.selectedPartId !== selectedPartId) {
        setSelectedPartId(d.selectedPartId);
        // Decide which side to put the panel on
        if (d.selectedPartX > d.stageWidth / 2) {
          setPanelSide("left");
        } else {
          setPanelSide("right");
        }
      } else if (!d.hasSelection) {
        setSelectedPartId(null);
      }
    };

    window.addEventListener("phaser-state-change", handleStateChange);
    return () =>
      window.removeEventListener("phaser-state-change", handleStateChange);
  }, [selectedPartId]);

  useEffect(() => {
    let needsSave = false;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const isCtrlOrCmd = event.ctrlKey || event.metaKey;

      if (isCtrlOrCmd) {
        if (event.code === "KeyZ") {
          event.preventDefault();
          if (event.shiftKey) {
            sendAction("redo");
          } else {
            sendAction("undo");
          }
          return;
        } else if (event.code === "KeyY") {
          event.preventDefault();
          sendAction("redo");
          return;
        }
      }

      if (event.code === "Space") {
        event.preventDefault();
        sendAction("toggle-mode");
        return;
      }

      if (mode === "edit" && hasSelection) {
        const nudgeAmount = event.shiftKey ? 20 : 5;
        const rotateAmount = event.shiftKey ? 15 : 5;
        let changed = false;

        switch (event.code) {
          case "Backspace":
          case "Delete":
            event.preventDefault();
            sendAction("delete-part");
            return;
          case "ArrowUp":
            event.preventDefault();
            sendAction("nudge-part", { dx: 0, dy: -nudgeAmount });
            changed = true;
            break;
          case "ArrowDown":
            event.preventDefault();
            sendAction("nudge-part", { dx: 0, dy: nudgeAmount });
            changed = true;
            break;
          case "ArrowLeft":
            event.preventDefault();
            sendAction("nudge-part", { dx: -nudgeAmount, dy: 0 });
            changed = true;
            break;
          case "ArrowRight":
            event.preventDefault();
            sendAction("nudge-part", { dx: nudgeAmount, dy: 0 });
            changed = true;
            break;
          case "Period": // . or > (Clockwise)
            event.preventDefault();
            sendAction("rotate-part", rotateAmount);
            changed = true;
            break;
          case "Comma": // , or < (Counterclockwise)
            event.preventDefault();
            sendAction("rotate-part", -rotateAmount);
            changed = true;
            break;
        }

        if (changed) {
          needsSave = true;
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const isMovementKey = [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "Period",
        "Comma",
      ].includes(event.code);
      if (isMovementKey && needsSave) {
        sendAction("save-state");
        needsSave = false;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [mode, hasSelection]);

  const sendAction = (action: string, payload?: any) => {
    window.dispatchEvent(
      new CustomEvent("phaser-editor-action", { detail: { action, payload } }),
    );
  };

  const getSpeedFraction = (speed: number) => {
    const absSpeed = Math.abs(speed);
    if (absSpeed === 0) return "0";
    if (absSpeed === 0.125) return "1/8";
    if (absSpeed === 0.25) return "1/4";
    if (absSpeed === 0.375) return "3/8";
    if (absSpeed === 0.5) return "1/2";
    return absSpeed.toString();
  };

  const handleMagnitudeChange = (delta: number) => {
    let currentSpeed =
      selectedSpinnerSpeed !== null && selectedSpinnerSpeed !== undefined
        ? selectedSpinnerSpeed
        : 0.25;
    let magnitude = Math.abs(currentSpeed) + delta;
    magnitude = Math.max(0, Math.min(0.5, magnitude));
    // round to avoid float errors
    magnitude = Math.round(magnitude * 8) / 8;
    sendAction("change-part-property", {
      spinnerSpeed: magnitude * selectedSpinnerDir,
    });
    sendAction("save-state");
  };

  const handleDirectionChange = (newDir: 1 | -1) => {
    setSelectedSpinnerDir(newDir);
    let currentSpeed =
      selectedSpinnerSpeed !== null && selectedSpinnerSpeed !== undefined
        ? selectedSpinnerSpeed
        : 0.25;
    let magnitude = Math.abs(currentSpeed);
    sendAction("change-part-property", { spinnerSpeed: magnitude * newDir });
    sendAction("save-state");
  };

  return (
    <div className="w-full h-screen bg-[#0a0a0a] text-white flex flex-col">
      <header className="w-full flex items-center justify-between px-4 py-3 shrink-0 z-10 transition-all relative bg-[#151619] border-b border-white/10">
        <div className="flex gap-2">
          <button
            onClick={() => sendAction("toggle-mode")}
            className={`flex items-center gap-2 px-6 py-2 rounded-full font-medium transition-all shadow-lg ${mode === "play" ? "bg-green-500 text-white" : "bg-white/10 text-white hover:bg-white/20"}`}
          >
            <Play size={20} /> Play
          </button>
          <button
            onClick={() => sendAction("toggle-mode")}
            className={`flex items-center gap-2 px-6 py-2 rounded-full font-medium transition-all shadow-lg ${mode === "edit" ? "bg-blue-500 text-white" : "bg-white/10 text-white hover:bg-white/20"}`}
          >
            <Edit size={20} /> Edit
          </button>
        </div>

        <div className="flex-1 max-w-sm mx-4">
          <input
            type="text"
            placeholder="Track Name"
            className="w-full bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all rounded-full px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-white/30 focus:bg-white/10 text-center font-medium"
            defaultValue="Untitled Track"
          />
        </div>

        {mode === "edit" && (
          <div className="flex gap-2 items-center overflow-x-auto">
            <button
              onClick={() => sendAction("undo")}
              disabled={!canUndo}
              className={`flex items-center gap-2 px-3 py-2 ${canUndo ? "bg-white/10 hover:bg-white/20" : "bg-white/5 opacity-50 cursor-not-allowed"} rounded-full font-medium transition-all shadow-lg shrink-0`}
              title="Undo"
            >
              <Undo2 size={18} />
            </button>
            <button
              onClick={() => sendAction("redo")}
              disabled={!canRedo}
              className={`flex items-center gap-2 px-3 py-2 ${canRedo ? "bg-white/10 hover:bg-white/20" : "bg-white/5 opacity-50 cursor-not-allowed"} rounded-full font-medium transition-all shadow-lg shrink-0`}
              title="Redo"
            >
              <Redo2 size={18} />
            </button>

            <div className="w-px h-8 bg-white/20 my-auto mx-2 shrink-0" />

            <button
              onClick={() => sendAction("add-part", "ramp")}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full font-medium transition-all shadow-lg shrink-0"
            >
              <PlusCircle size={18} />{" "}
              <span className="hidden sm:inline">Ramp</span>
            </button>
            <button
              onClick={() => sendAction("add-part", "pin")}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full font-medium transition-all shadow-lg shrink-0"
            >
              <PlusCircle size={18} />{" "}
              <span className="hidden sm:inline">Pin</span>
            </button>
            <button
              onClick={() => sendAction("add-part", "spinner")}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full font-medium transition-all shadow-lg shrink-0"
            >
              <PlusCircle size={18} />{" "}
              <span className="hidden sm:inline">Spinner</span>
            </button>
          </div>
        )}

        {mode === "play" && (
          <div className="flex gap-2 items-center">
            <button
              onClick={() => sendAction("shake-marbles")}
              className="flex items-center gap-2 px-6 py-2 bg-cyan-500/80 hover:bg-cyan-500 rounded-full font-medium transition-all shadow-lg"
            >
              ⚡ Shake
            </button>
            <button
              onClick={() => sendAction("reset-marbles")}
              className="flex items-center gap-2 px-6 py-2 bg-red-500/80 hover:bg-red-500 rounded-full font-medium transition-all shadow-lg"
            >
              <RefreshCw size={20} /> Reset
            </button>
          </div>
        )}
      </header>

      <main className="w-full flex-1 relative overflow-hidden bg-[#0a0a0a]">
        <GameContainer />

        {mode === "edit" && hasSelection && (
          <motion.div
            drag
            dragMomentum={false}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`absolute top-4 ${panelSide === "right" ? "right-4" : "left-4"} z-20 flex flex-col gap-3 p-4 bg-[#1a1b1e]/90 backdrop-blur-md rounded-xl shadow-2xl border border-white/10 min-w-[280px]`}
          >
            <div className="flex items-center justify-between cursor-move handle mb-1">
              <div className="flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors">
                <GripHorizontal size={16} />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Properties
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => sendAction("rotate-part", 15)}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg font-medium transition-all text-sm"
              >
                <RotateCw size={16} /> +15°
              </button>
              <button
                onClick={() => sendAction("rotate-part", -15)}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg font-medium transition-all text-sm"
              >
                <RotateCw size={16} className="transform -scale-x-100" /> -15°
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => sendAction("scale-part", 1)}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg font-medium transition-all text-sm"
              >
                <Maximize2 size={16} /> Enlarge
              </button>
              <button
                onClick={() => sendAction("scale-part", -1)}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg font-medium transition-all text-sm"
              >
                <Minimize2 size={16} /> Shrink
              </button>
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <div className="flex items-center justify-between bg-white/5 px-3 py-2 rounded-lg">
                <span className="text-sm font-medium text-white/80">Color</span>
                <input
                  type="color"
                  value={
                    selectedColor !== null && selectedColor !== undefined
                      ? "#" + selectedColor.toString(16).padStart(6, "0")
                      : "#ffffff"
                  }
                  onChange={(e) => {
                    const color = parseInt(e.target.value.replace("#", ""), 16);
                    sendAction("change-part-property", { color });
                  }}
                  onBlur={() => sendAction("save-state")}
                  className="w-8 h-8 rounded shrink-0 cursor-pointer border border-white/20 bg-transparent ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 object-cover"
                  style={{ padding: 0 }}
                />
              </div>

              <div className="flex flex-col gap-1.5 bg-white/5 px-3 py-2 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white/80">
                    Friction
                  </span>
                  <span className="text-xs text-white/50 w-8 text-right font-mono">
                    {(selectedFriction || 0).toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={selectedFriction || 0}
                  onChange={(e) =>
                    sendAction("change-part-property", {
                      friction: parseFloat(e.target.value),
                    })
                  }
                  onMouseUp={() => sendAction("save-state")}
                  onTouchEnd={() => sendAction("save-state")}
                  className="w-full accent-blue-500"
                />
              </div>

              {hasSpinnerSelected && (
                <div className="flex flex-col gap-1.5 bg-white/5 px-3 py-2 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white/80">
                      Speed
                    </span>
                    <span className="text-xs text-white/50 w-8 text-right font-mono">
                      {getSpeedFraction(
                        selectedSpinnerSpeed !== null &&
                          selectedSpinnerSpeed !== undefined
                          ? selectedSpinnerSpeed
                          : 0.25,
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <button
                      onClick={() => handleMagnitudeChange(-0.125)}
                      className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded font-bold text-center h-8"
                    >
                      -
                    </button>
                    <span className="text-xs text-white/80 flex-1 text-center font-mono py-1 rounded bg-black/20">
                      Rotations/sec
                    </span>
                    <button
                      onClick={() => handleMagnitudeChange(0.125)}
                      className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded font-bold text-center h-8"
                    >
                      +
                    </button>
                  </div>

                  <div className="w-full h-px bg-white/10 my-2" />

                  <div className="flex items-center justify-between pointer-events-none mb-1">
                    <span className="text-sm font-medium text-white/80">
                      Direction
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDirectionChange(1)}
                      className={`flex-1 py-1 rounded text-xs font-medium transition-colors ${selectedSpinnerDir === 1 ? "bg-blue-500 text-white" : "bg-white/10 text-white/70 hover:bg-white/20"}`}
                    >
                      Clockwise
                    </button>
                    <button
                      onClick={() => handleDirectionChange(-1)}
                      className={`flex-1 py-1 rounded text-xs font-medium transition-colors ${selectedSpinnerDir === -1 ? "bg-blue-500 text-white" : "bg-white/10 text-white/70 hover:bg-white/20"}`}
                    >
                      Counter
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="w-full h-px bg-white/10 my-1" />

            <button
              onClick={() => sendAction("delete-part")}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg font-medium transition-all"
            >
              <Trash2 size={16} /> Delete Part
            </button>
          </motion.div>
        )}
      </main>
    </div>
  );
}

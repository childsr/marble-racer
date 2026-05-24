/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameContainer } from "./game/GameContainer";
import { useState, useEffect, useRef } from "react";
import {
  Play,
  Edit,
  Trash2,
  PlusCircle,
  RotateCw,
  RotateCcw,
  RefreshCw,
  Maximize2,
  Minimize2,
  Undo2,
  Redo2,
  Settings,
  GripHorizontal,
  Plus,
  ChevronDown,
  X,
  TrendingDown,
  Pin,
  Flag,
  Scissors,
  Copy,
  Clipboard,
  Layers,
} from "lucide-react";
import { motion } from "motion/react";

const getPartTypeName = (type: string | null): string => {
  if (!type) return "";
  switch (type) {
    case "ramp":
      return "Ramp";
    case "pin":
      return "Pin";
    case "spinner":
      return "Spinner";
    case "bin":
      return "Bin";
    case "finish_zone":
      return "Finish Zone";
    case "marble":
      return "Marble";
    case "scatter_gate":
      return "Scatter Gate";
    case "boost_gate":
      return "Boost Gate";
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
};

export default function App() {
  const dragConstraintsRef = useRef<HTMLDivElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const [mode, setMode] = useState<"play" | "edit">("edit");
  const [hasSelection, setHasSelection] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [selectedColor, setSelectedColor] = useState<number | null>(null);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [panelSide, setPanelSide] = useState<"left" | "right">("right");

  const [hasSpinnerSelected, setHasSpinnerSelected] = useState(false);
  const [selectedSpinnerSpeed, setSelectedSpinnerSpeed] = useState<
    number | null
  >(null);
  const [selectedSpinnerDir, setSelectedSpinnerDir] = useState<1 | -1>(1);

  const [selectedPartBoostAmount, setSelectedPartBoostAmount] = useState<
    number | null
  >(null);

  const [selectedPartType, setSelectedPartType] = useState<string | null>(null);
  const [selectedPartW, setSelectedPartW] = useState<number | null>(null);
  const [selectedPartH, setSelectedPartH] = useState<number | null>(null);
  const [finishList, setFinishList] = useState<{ color: number; place: number }[]>([]);

  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  useEffect(() => {
    const handleOutsideClick = (e: PointerEvent) => {
      if (!isAddMenuOpen) return;
      if (
        addMenuRef.current &&
        !addMenuRef.current.contains(e.target as Node) &&
        addButtonRef.current &&
        !addButtonRef.current.contains(e.target as Node)
      ) {
        setIsAddMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handleOutsideClick);
    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
    };
  }, [isAddMenuOpen]);

  useEffect(() => {
    const handleStateChange = (e: any) => {
      const d = e.detail;
      if (d.mode) setMode(d.mode);
      if (d.hasOwnProperty("hasSelection")) setHasSelection(d.hasSelection);
      if (d.hasOwnProperty("canUndo")) setCanUndo(d.canUndo);
      if (d.hasOwnProperty("canRedo")) setCanRedo(d.canRedo);
      if (d.hasOwnProperty("selectedPartColor"))
        setSelectedColor(d.selectedPartColor);
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
      if (d.hasOwnProperty("selectedPartType")) setSelectedPartType(d.selectedPartType);
      if (d.hasOwnProperty("selectedPartW")) setSelectedPartW(d.selectedPartW);
      if (d.hasOwnProperty("selectedPartH")) setSelectedPartH(d.selectedPartH);
      if (d.hasOwnProperty("selectedPartBoostAmount")) {
        setSelectedPartBoostAmount(d.selectedPartBoostAmount);
      }
      if (d.hasOwnProperty("finishList")) {
        setFinishList([...(d.finishList || [])]);
      } else if (d.mode === "edit") {
        setFinishList([]);
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
        setSelectedPartType(null);
        setSelectedPartW(null);
        setSelectedPartH(null);
        setSelectedPartBoostAmount(null);
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

      if (isCtrlOrCmd && event.code === "KeyL") {
        event.preventDefault();
        sendAction("toggle-debug-rendering");
        return;
      }

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

        if (mode === "edit") {
          if (event.code === "KeyC") {
            event.preventDefault();
            sendAction("copy");
            return;
          } else if (event.code === "KeyX") {
            event.preventDefault();
            sendAction("cut");
            return;
          } else if (event.code === "KeyV") {
            event.preventDefault();
            sendAction("paste");
            return;
          } else if (event.code === "KeyD") {
            event.preventDefault();
            sendAction("duplicate");
            return;
          }
        }
      }

      if (!isCtrlOrCmd) {
        if (mode === "play") {
          if (event.key === "Escape") {
            event.preventDefault();
            sendAction("toggle-mode");
            return;
          }
        } else if (mode === "edit") {
          if (event.key === "Enter") {
            event.preventDefault();
            sendAction("toggle-mode");
            return;
          }

          const keyLower = event.key.toLowerCase();
          if (keyLower === "r") {
            event.preventDefault();
            sendAction("add-part", "ramp");
            return;
          }
          if (keyLower === "p") {
            event.preventDefault();
            sendAction("add-part", "pin");
            return;
          }
          if (keyLower === "m") {
            event.preventDefault();
            sendAction("add-part", "marble");
            return;
          }
          if (keyLower === "s") {
            event.preventDefault();
            sendAction("add-part", "spinner");
            return;
          }
          if (keyLower === "f") {
            event.preventDefault();
            sendAction("add-part", "finish_zone");
            return;
          }
          if (event.key === "=" || event.code === "NumpadAdd") {
            event.preventDefault();
            const nextOpen = !isAddMenuOpen;
            setIsAddMenuOpen(nextOpen);
            if (nextOpen) {
              sendAction("deselect-all");
            }
            return;
          }
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
          case "Tab":
            event.preventDefault();
            sendAction("select-next-part", { backward: event.shiftKey });
            return;
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
            if (selectedPartType === "pin" || selectedPartType === "marble") return;
            event.preventDefault();
            sendAction("rotate-part", rotateAmount);
            changed = true;
            break;
          case "Comma": // , or < (Counterclockwise)
            if (selectedPartType === "pin" || selectedPartType === "marble") return;
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
  }, [mode, hasSelection, isAddMenuOpen]);

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
            className={`flex items-center gap-2 px-6 py-2 rounded-full font-medium transition-all shadow-lg text-white cursor-pointer ${
              mode === "edit"
                ? "bg-emerald-600 hover:bg-emerald-500"
                : "bg-blue-600 hover:bg-blue-500"
            }`}
          >
            {mode === "edit" ? (
              <>
                <Play size={20} /> Play
              </>
            ) : (
              <>
                <Edit size={20} /> Edit
              </>
            )}
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
              ref={addButtonRef}
              onClick={() => {
                const nextOpen = !isAddMenuOpen;
                setIsAddMenuOpen(nextOpen);
                if (nextOpen) {
                  sendAction("deselect-all");
                }
              }}
              className={`flex items-center gap-2 px-5 py-2 rounded-full font-medium transition-all shadow-lg shrink-0 cursor-pointer ${
                isAddMenuOpen ? "bg-blue-600 text-white font-semibold" : "bg-white/10 hover:bg-white/20 text-white"
               }`}
            >
              <Plus size={18} />
              <span>Add</span>
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

      <main
        ref={dragConstraintsRef}
        className="w-full flex-1 relative overflow-hidden bg-[#0a0a0a]"
      >
        <GameContainer />

        {/* Finishing Order Leaderboard Overlay */}
        {mode === "play" && finishList.length > 0 && (
          <div className="absolute top-6 right-6 z-10 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-4 shadow-2xl flex flex-col items-center gap-2 min-w-[90px]"
            >
              <div className="text-[9px] font-bold text-emerald-400 tracking-wider uppercase font-sans flex items-center gap-1.5 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Finished
              </div>
              <div className="flex flex-col gap-2">
                {finishList.map((item) => {
                  const hexColor = "#" + item.color.toString(16).padStart(6, "0");
                  let badgeClass = "bg-white/10 text-white/95 border border-white/5";
                  let rankText = `${item.place}:`;
                  if (item.place === 1) {
                    badgeClass = "bg-amber-500/20 text-amber-300 border border-amber-500/35 font-bold";
                  } else if (item.place === 2) {
                    badgeClass = "bg-slate-300/20 text-slate-200 border border-slate-300/35";
                  } else if (item.place === 3) {
                    badgeClass = "bg-amber-700/20 text-amber-600/90 border border-amber-700/30";
                  }

                  return (
                    <motion.div
                      key={item.place}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-sm font-bold font-mono tracking-wide ${badgeClass}`}
                    >
                      <span className="min-w-[1rem] text-right">{rankText}</span>
                      <div
                        className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-inner shrink-0"
                        style={{ backgroundColor: hexColor }}
                      />
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}

        {mode === "edit" && isAddMenuOpen && (
          <motion.div
            ref={addMenuRef}
            key="add-parts-window"
            drag
            dragConstraints={dragConstraintsRef}
            dragElastic={0}
            dragMomentum={false}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="absolute top-4 right-4 z-20 flex flex-col gap-3 p-4 bg-[#1a1b1e]/90 backdrop-blur-md rounded-xl shadow-2xl border border-white/10 min-w-[280px]"
          >
            <div className="flex items-center justify-between cursor-move handle mb-1">
              <div className="flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors">
                <GripHorizontal size={16} />
                <span className="text-xs font-semibold uppercase tracking-wider animate-pulse [animation-duration:2s]">
                  Add Object
                </span>
              </div>
              <button
                onClick={() => setIsAddMenuOpen(false)}
                className="text-white/40 hover:text-white/80 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  sendAction("add-part", "ramp");
                  setIsAddMenuOpen(false);
                }}
                className="flex w-full items-center gap-3 px-3 py-2 bg-[#2d3139]/40 hover:bg-[#2d3139]/80 border border-white/5 hover:border-white/10 rounded-lg transition-all cursor-pointer"
              >
                <div className="w-10 h-10 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 40 40" className="w-10 h-10 select-none">
                    <g transform="rotate(-15 20 20)">
                      <rect x="6" y="19" width="28" height="5" rx="1.5" fill="#000" opacity="0.3" />
                      <rect x="6" y="17" width="28" height="5" rx="1.5" fill="url(#rampGrad)" stroke="#64748b" strokeWidth="1" />
                      <line x1="8" y1="18.5" x2="32" y2="18.5" stroke="#fff" strokeWidth="0.75" strokeLinecap="round" opacity="0.5" />
                    </g>
                    <defs>
                      <linearGradient id="rampGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#f8fafc" />
                        <stop offset="100%" stopColor="#cbd5e1" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-white leading-none">Ramp</span>
                  <span className="text-[10px] text-gray-400 mt-1 leading-none">Guide and slide marbles</span>
                </div>
              </button>
              <button
                onClick={() => {
                  sendAction("add-part", "pin");
                  setIsAddMenuOpen(false);
                }}
                className="flex w-full items-center gap-3 px-3 py-2 bg-[#2d3139]/40 hover:bg-[#2d3139]/80 border border-white/5 hover:border-white/10 rounded-lg transition-all cursor-pointer"
              >
                <div className="w-10 h-10 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 40 40" className="w-10 h-10 select-none">
                    <circle cx="20" cy="20" r="9" fill="#4fc3f7" opacity="0.15" />
                    <circle cx="20" cy="20" r="7" fill="#1e293b" stroke="#475569" strokeWidth="1" />
                    <circle cx="20" cy="20" r="5" fill="url(#pinSphereGrad)" stroke="#4fc3f7" strokeWidth="0.5" />
                    <circle cx="18" cy="18" r="1.2" fill="#fff" opacity="0.8" />
                    <defs>
                      <radialGradient id="pinSphereGrad" cx="35%" cy="35%" r="65%">
                        <stop offset="0%" stopColor="#e0f7fa" />
                        <stop offset="30%" stopColor="#4fc3f7" />
                        <stop offset="100%" stopColor="#0288d1" />
                      </radialGradient>
                    </defs>
                  </svg>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-white leading-none">Pin</span>
                  <span className="text-[10px] text-gray-400 mt-1 leading-none">Peg for bouncy interactions</span>
                </div>
              </button>
              <button
                onClick={() => {
                  sendAction("add-part", "marble");
                  setIsAddMenuOpen(false);
                }}
                className="flex w-full items-center gap-3 px-3 py-2 bg-[#2d3139]/40 hover:bg-[#2d3139]/80 border border-white/5 hover:border-white/10 rounded-lg transition-all cursor-pointer"
              >
                <div className="w-10 h-10 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 40 40" className="w-10 h-10 select-none">
                    <circle cx="20" cy="20" r="10" fill="#ff4444" opacity="0.15" />
                    <circle cx="20" cy="20" r="8" fill="url(#marbleSphereGrad)" stroke="#ff4444" strokeWidth="0.5" />
                    <circle cx="17.5" cy="17.5" r="1.5" fill="#fff" opacity="0.8" />
                    <defs>
                      <radialGradient id="marbleSphereGrad" cx="35%" cy="35%" r="65%">
                        <stop offset="0%" stopColor="#ffdcd1" />
                        <stop offset="40%" stopColor="#ff4444" />
                        <stop offset="100%" stopColor="#991b1b" />
                      </radialGradient>
                    </defs>
                  </svg>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-white leading-none">Marble</span>
                  <span className="text-[10px] text-gray-400 mt-1 leading-none">Starting physics marbles</span>
                </div>
              </button>
              <button
                onClick={() => {
                  sendAction("add-part", "spinner");
                  setIsAddMenuOpen(false);
                }}
                className="flex w-full items-center gap-3 px-3 py-2 bg-[#2d3139]/40 hover:bg-[#2d3139]/80 border border-white/5 hover:border-white/10 rounded-lg transition-all cursor-pointer"
              >
                <div className="w-10 h-10 flex items-center justify-center shrink-0 animate-spin [animation-duration:3s]">
                  <svg viewBox="0 0 40 40" className="w-10 h-10 select-none">
                    <circle cx="20" cy="20" r="14" fill="none" stroke="#ff5252" strokeWidth="1" strokeDasharray="3 3" opacity="0.25" />
                    <rect x="7" y="18" width="26" height="4" rx="1.5" fill="url(#spinnerGrad)" stroke="#b91c1c" strokeWidth="0.75" />
                    <circle cx="20" cy="20" r="3.5" fill="#1e293b" stroke="#f87171" strokeWidth="1" />
                    <circle cx="20" cy="20" r="1.2" fill="#f87171" />
                    <defs>
                      <linearGradient id="spinnerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#fca5a5" />
                        <stop offset="40%" stopColor="#ff5252" />
                        <stop offset="100%" stopColor="#b91c1c" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-white leading-none">Spinner</span>
                  <span className="text-[10px] text-gray-400 mt-1 leading-none">Active rotating obstacle</span>
                </div>
              </button>
              <button
                onClick={() => {
                  sendAction("add-part", "finish_zone");
                  setIsAddMenuOpen(false);
                }}
                className="flex w-full items-center gap-3 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/30 rounded-lg transition-all cursor-pointer"
              >
                <div className="w-10 h-10 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 40 40" className="w-10 h-10 select-none">
                    <rect x="5" y="10" width="30" height="20" rx="3" fill="#00e676" fillOpacity="0.12" stroke="#00e676" strokeWidth="1.5" strokeDasharray="3 2" />
                    <rect x="8" y="13" width="24" height="14" rx="1.5" fill="none" stroke="#00e676" strokeWidth="1" strokeOpacity="0.3" />
                    <g transform="translate(14, 13) scale(0.6)">
                      <line x1="4" y1="4" x2="4" y2="22" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
                      <path d="M4.5 4 h12 v9 h-12 Z" fill="#ffffff" stroke="#ffffff" strokeWidth="0.5" />
                      <rect x="4.5" y="4" width="4" height="4.5" fill="#111827" />
                      <rect x="12.5" y="4" width="4" height="4.5" fill="#111827" />
                      <rect x="8.5" y="8.5" width="4" height="4.5" fill="#111827" />
                    </g>
                  </svg>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-emerald-400 leading-none">Finish Zone</span>
                  <span className="text-[10px] text-emerald-500/80 mt-1 leading-none">Marble target accumulator</span>
                </div>
              </button>
              <button
                onClick={() => {
                  sendAction("add-part", "scatter_gate");
                  setIsAddMenuOpen(false);
                }}
                className="flex w-full items-center gap-3 px-3 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/10 hover:border-yellow-500/30 rounded-lg transition-all cursor-pointer"
              >
                <div className="w-10 h-10 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 40 40" className="w-10 h-10 select-none">
                    <rect x="6" y="10" width="4" height="20" rx="1" fill="#4f526b" stroke="#1f2130" strokeWidth="0.75" />
                    <polygon points="10,12 12,17 12,23 10,28" fill="#4f526b" />
                    <rect x="30" y="10" width="4" height="20" rx="1" fill="#4f526b" stroke="#1f2130" strokeWidth="0.75" />
                    <polygon points="30,12 28,17 28,23 30,28" fill="#4f526b" />
                    <rect x="12" y="18" width="16" height="4" rx="1.5" fill="#fff59d" opacity="0.4" />
                    <rect x="12" y="19.5" width="16" height="1" fill="#fff" opacity="0.95" />
                    <line x1="12" y1="20" x2="28" y2="20" stroke="#fdeb1d" strokeWidth="1" />
                  </svg>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-yellow-500 leading-none">Scatter Gate</span>
                  <span className="text-[10px] text-yellow-600/80 mt-1 leading-none">Force field deflecting marbles</span>
                </div>
              </button>
              <button
                onClick={() => {
                  sendAction("add-part", "boost_gate");
                  setIsAddMenuOpen(false);
                }}
                className="flex w-full items-center gap-3 px-3 py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/10 hover:border-purple-500/30 rounded-lg transition-all cursor-pointer"
              >
                <div className="w-10 h-10 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 40 40" className="w-10 h-10 select-none">
                    <rect x="6" y="10" width="4" height="20" rx="1" fill="#4f526b" stroke="#1f2130" strokeWidth="0.75" />
                    <polygon points="10,12 12,17 12,23 10,28" fill="#4f526b" />
                    <rect x="30" y="10" width="4" height="20" rx="1" fill="#4f526b" stroke="#1f2130" strokeWidth="0.75" />
                    <polygon points="30,12 28,17 28,23 30,28" fill="#4f526b" />
                    <rect x="12" y="18" width="16" height="4" rx="1.5" fill="#e9d5ff" opacity="0.4" />
                    <rect x="12" y="19.5" width="16" height="1" fill="#fff" opacity="0.95" />
                    <path d="M16,16 L20,20 L24,16" stroke="#d946ef" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M16,21 L20,25 L24,21" stroke="#d946ef" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-purple-400 leading-none">Boost Gate</span>
                  <span className="text-[10px] text-purple-500/80 mt-1 leading-none">Accelerates marbles on pass-through</span>
                </div>
              </button>
            </div>
          </motion.div>
        )}

        {mode === "edit" && hasSelection && (
          <motion.div
            key={selectedPartId || "properties-window"}
            drag
            dragConstraints={dragConstraintsRef}
            dragElastic={0}
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
                  {selectedPartType ? `${getPartTypeName(selectedPartType)} ` : ""}Properties
                </span>
              </div>
            </div>

            {selectedPartType !== "marble" && selectedPartType !== "pin" && (
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
            )}

            {selectedPartType !== "marble" && (
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
            )}

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

              {(selectedPartType === "finish_zone" || selectedPartType === "ramp" || selectedPartType === "bin" || selectedPartType === "scatter_gate" || selectedPartType === "boost_gate") && selectedPartW !== null && selectedPartH !== null && (
                <div className="border border-white/10 rounded-lg p-3 bg-white/5 flex flex-col gap-3 font-sans">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-white/40 tracking-wider uppercase">
                      Dimensions (px)
                    </span>
                    <div className="w-full h-px bg-white/10 mt-1" />
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-white/80">Width</span>
                      <span className="font-mono text-white/60">{Math.round(selectedPartW)}px</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="600"
                      step="5"
                      value={selectedPartW}
                      onChange={(e) => {
                        const w = parseInt(e.target.value, 10);
                        sendAction("change-part-property", { w });
                      }}
                      onMouseUp={() => sendAction("save-state")}
                      onTouchEnd={() => sendAction("save-state")}
                      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                    />
                  </div>

                  {selectedPartType !== "ramp" && selectedPartType !== "scatter_gate" && selectedPartType !== "boost_gate" && (
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-medium text-white/80">Height</span>
                        <span className="font-mono text-white/60">{Math.round(selectedPartH)}px</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="300"
                        step="5"
                        value={selectedPartH}
                        onChange={(e) => {
                          const h = parseInt(e.target.value, 10);
                          sendAction("change-part-property", { h });
                        }}
                        onMouseUp={() => sendAction("save-state")}
                        onTouchEnd={() => sendAction("save-state")}
                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                      />
                    </div>
                  )}
                </div>
              )}

              {selectedPartType === "boost_gate" && selectedPartBoostAmount !== null && (
                <div className="border border-white/10 rounded-lg p-3 bg-white/5 flex flex-col gap-2 font-sans">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-white/40 tracking-wider uppercase">
                      Boost Intensity
                    </span>
                    <div className="w-full h-px bg-white/10 mt-1" />
                  </div>

                  <div className="flex flex-col gap-1 mt-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-white/80">Multiplier</span>
                      <span className="font-mono text-purple-400 font-bold">{selectedPartBoostAmount.toFixed(1)}x</span>
                    </div>
                    
                    <input
                      type="range"
                      min="1.1"
                      max="3.5"
                      step="0.1"
                      value={selectedPartBoostAmount}
                      onChange={(e) => {
                        const boostAmount = parseFloat(e.target.value);
                        setSelectedPartBoostAmount(boostAmount);
                        sendAction("change-part-property", { boostAmount });
                      }}
                      onMouseUp={() => sendAction("save-state")}
                      onTouchEnd={() => sendAction("save-state")}
                      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                    
                    <div className="flex justify-between text-[9px] text-white/40 mt-1">
                      <span>Light Boost (1.2x)</span>
                      <span>Hyper (3.0x+)</span>
                    </div>
                  </div>
                </div>
              )}

              {hasSpinnerSelected && (
                <div className="border border-white/10 rounded-lg p-2 bg-white/5 flex flex-col gap-1 font-sans">
                  {/* Spinner Title with Horizontal Divider */}
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-white/40 tracking-wider uppercase">
                      Spinner
                    </span>
                    <div className="w-full h-px bg-white/10 mt-1" />
                  </div>

                  {/* Split Layout */}
                  <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-stretch">
                    {/* Speed Controls */}
                    <div className="flex flex-col items-center justify-between text-center min-h-[74px]">
                      <span className="text-xs font-medium text-white/80">
                        Speed
                      </span>

                      <div className="flex items-center justify-center gap-1 my-0.5 w-full">
                        <button
                          onClick={() => handleMagnitudeChange(-0.125)}
                          className="w-8 h-8 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 active:bg-white/20 flex items-center justify-center text-sm font-bold text-white transition-all select-none cursor-pointer"
                          title="Decrease speed"
                        >
                          -
                        </button>
                        <span className="text-xs font-semibold tracking-wide text-white min-w-[32px] text-center font-mono select-none">
                          {getSpeedFraction(
                            selectedSpinnerSpeed !== null &&
                              selectedSpinnerSpeed !== undefined
                              ? selectedSpinnerSpeed
                              : 0.25,
                          )}
                        </span>
                        <button
                          onClick={() => handleMagnitudeChange(0.125)}
                          className="w-8 h-8 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 active:bg-white/20 flex items-center justify-center text-sm font-bold text-white transition-all select-none cursor-pointer"
                          title="Increase speed"
                        >
                          +
                        </button>
                      </div>

                      <span className="text-[10px] text-white/40 block leading-tight">
                        (rotations/sec)
                      </span>
                    </div>

                    {/* Vertical Divider */}
                    <div className="w-px bg-white/10 h-full" />

                    {/* Direction Controls */}
                    <div className="flex flex-col items-center justify-between text-center min-h-[74px]">
                      <span className="text-xs font-medium text-white/80">
                        Direction
                      </span>

                      <div className="flex items-center gap-1 my-0.5 w-full">
                        <button
                          onClick={() => handleDirectionChange(-1)}
                          className={`flex-1 h-8 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                            selectedSpinnerDir === -1
                              ? "bg-blue-500/20 border-blue-400 text-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                              : "border-white/20 bg-white/5 text-white/60 hover:bg-white/10 hover:border-white/30"
                          }`}
                          title="Counterclockwise"
                        >
                          <RotateCcw size={15} />
                        </button>
                        <button
                          onClick={() => handleDirectionChange(1)}
                          className={`flex-1 h-8 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                            selectedSpinnerDir === 1
                              ? "bg-blue-500/20 border-blue-400 text-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                              : "border-white/20 bg-white/5 text-white/60 hover:bg-white/10 hover:border-white/30"
                          }`}
                          title="Clockwise"
                        >
                          <RotateCw size={15} />
                        </button>
                      </div>

                      {/* Invisible placeholder to key the vertical sizing perfectly */}
                      <span className="text-[10px] text-transparent leading-tight select-none">
                        (rotations/sec)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="w-full h-px bg-white/10 my-1" />

            <div className="flex flex-col gap-1.5 mb-1">
              <span className="text-[10px] font-bold text-white/40 tracking-wider uppercase text-center mb-0.5">Editor Actions</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => sendAction("cut")}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg font-medium transition-all text-xs select-none cursor-pointer"
                  title="Cut selection (Ctrl+X)"
                >
                  <Scissors size={14} /> Cut
                </button>
                <button
                  onClick={() => sendAction("copy")}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg font-medium transition-all text-xs select-none cursor-pointer"
                  title="Copy selection (Ctrl+C)"
                >
                  <Copy size={14} /> Copy
                </button>
                <button
                  onClick={() => sendAction("paste")}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg font-medium transition-all text-xs select-none cursor-pointer"
                  title="Paste from clipboard (Ctrl+V)"
                >
                  <Clipboard size={14} /> Paste
                </button>
                <button
                  onClick={() => sendAction("duplicate")}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg font-medium transition-all text-xs select-none cursor-pointer"
                  title="Duplicate selection (Ctrl+D)"
                >
                  <Layers size={14} /> Duplicate
                </button>
              </div>
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

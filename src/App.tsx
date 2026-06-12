/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameContainer } from "./game/GameContainer";
import React, { useState, useEffect, useRef } from "react";
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
  ChevronLeft,
  X,
  TrendingDown,
  Pin,
  Flag,
  Scissors,
  Copy,
  Clipboard,
  Layers,
  Eye,
  Map,
  Download,
  Save,
  FolderOpen
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
    case "finish_zone":
      return "Finish Zone";
    case "marble":
      return "Marble";
    case "scatter_gate":
      return "Scatter Gate";
    case "boost_gate":
      return "Boost Gate";
    case "bounce_ramp":
      return "Bounce Ramp";
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
  const [selectedPartSegments, setSelectedPartSegments] = useState<
    number | null
  >(null);

  const [selectedPartType, setSelectedPartType] = useState<string | null>(null);
  const [selectedPartW, setSelectedPartW] = useState<number | null>(null);
  const [selectedPartH, setSelectedPartH] = useState<number | null>(null);
  const [finishList, setFinishList] = useState<{ color: number; place: number }[]>([]);
  const [showDebugBodies, setShowDebugBodies] = useState(false);

  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const speedMenuRef = useRef<HTMLDivElement>(null);
  const speedButtonRef = useRef<HTMLButtonElement>(null);
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);
  const [simSpeed, setSimSpeed] = useState<number>(1.0);

  const [userTracks, setUserTracks] = useState<{ id: string, name: string, data: any }[]>([]);
  const [trackName, setTrackName] = useState("Untitled Track");
  const [isTrackMenuOpen, setIsTrackMenuOpen] = useState(false);
  const trackMenuRef = useRef<HTMLDivElement>(null);
  const trackButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("marble_racer_user_tracks");
    if (saved) {
      try {
        setUserTracks(JSON.parse(saved));
      } catch (e) { }
    }
  }, []);

  const saveCurrentTrack = () => {
    const currentStr = localStorage.getItem("physics_sandbox_level_state");
    if (currentStr) {
      const parsed = JSON.parse(currentStr);
      const newTrack = {
        id: "track_" + Date.now(),
        name: trackName.trim() || ("Custom Track " + (userTracks.length + 1)),
        data: parsed,
      };
      const updated = [...userTracks, newTrack];
      setUserTracks(updated);
      localStorage.setItem("marble_racer_user_tracks", JSON.stringify(updated));
    }
  };

  const deleteTrack = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = userTracks.filter((t) => t.id !== id);
    setUserTracks(updated);
    localStorage.setItem("marble_racer_user_tracks", JSON.stringify(updated));
  };

  const setupDragGhost = (type: string, e: React.DragEvent) => {
    const container = document.getElementById("phaser-game-container");
    let S = 0.5;
    if (container) {
      const rect = container.getBoundingClientRect();
      const virtualWidth = 1920;
      const virtualHeight = 1080;
      const virtualAspect = virtualWidth / virtualHeight;
      const actualWidth = rect.width;
      const actualHeight = rect.height;
      const actualAspect = actualWidth / actualHeight;
      if (actualAspect > virtualAspect) {
        S = actualHeight / virtualHeight;
      } else {
        S = actualWidth / virtualWidth;
      }
    }

    let W = 300 * S;
    let H = 20 * S;
    let html = "";

    if (type === "ramp") {
      W = 300 * S;
      H = 20 * S;
      html = `
        <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="overflow: visible; opacity: 0.65;">
          <rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff" />
        </svg>
      `;
    } else if (type === "curved_ramp") {
      W = 300 * S;
      const H_curved = 70 * S;
      H = H_curved;
      html = `
        <svg width="${W}" height="${H_curved}" viewBox="0 0 ${W} ${H_curved}" style="overflow: visible; opacity: 0.65;">
          <circle cx="${10 * S}" cy="${50 * S}" r="${10 * S}" fill="#9b5de5" />
          <path d="M ${10 * S},${50 * S} Q ${W / 2},${0 * S} ${W - 10 * S},${50 * S}" fill="none" stroke="#9b5de5" stroke-width="${20 * S}" />
          <circle cx="${W - 10 * S}" cy="${50 * S}" r="${10 * S}" fill="#9b5de5" />
        </svg>
      `;
    } else if (type === "pin") {
      W = 28 * S;
      H = 28 * S;
      html = `
        <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="overflow: visible; opacity: 0.65;">
          <circle cx="${W / 2}" cy="${H / 2}" r="${14 * S}" fill="#4fc3f7" />
        </svg>
      `;
    } else if (type === "marble") {
      W = 28 * S;
      H = 28 * S;
      html = `
        <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="overflow: visible; opacity: 0.65;">
          <circle cx="${W / 2}" cy="${H / 2}" r="${14 * S}" fill="#ff4444" />
        </svg>
      `;
    } else if (type === "spinner") {
      W = 300 * S;
      H = 25 * S;
      html = `
        <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="overflow: visible; opacity: 0.65;">
          <rect x="0" y="0" width="${W}" height="${H}" fill="#ff5252" />
        </svg>
      `;
    } else if (type === "finish_zone") {
      W = 150 * S;
      H = 80 * S;
      html = `
        <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="overflow: visible; opacity: 0.65;">
          <rect x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" fill="#00e676" fill-opacity="0.4" stroke="#ffffff" stroke-width="3" stroke-opacity="0.85" />
        </svg>
      `;
    } else if (type === "scatter_gate") {
      W = 80 * S;
      H = 50 * S;
      html = `
        <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="overflow: visible; opacity: 0.65;">
          <!-- Left side post -->
          <polygon points="0,0 ${15 * S},0 ${19 * S},${17.5 * S} ${19 * S},${32.5 * S} ${15 * S},${50 * S} 0,${50 * S}" fill="#3c3f58" stroke="#1f2130" stroke-width="1.5" />
          <!-- Right side post -->
          <polygon points="${W},0 ${W - 15 * S},0 ${W - 19 * S},${17.5 * S} ${W - 19 * S},${32.5 * S} ${W - 15 * S},${50 * S} ${W},${50 * S}" fill="#3c3f58" stroke="#1f2130" stroke-width="1.5" />
          <!-- Force field line -->
          <rect x="${10 * S}" y="${22 * S}" width="${W - 20 * S}" height="${6 * S}" fill="#ffeb3b" fill-opacity="0.6" />
          <!-- Inner shining field -->
          <rect x="${10 * S}" y="${24 * S}" width="${W - 20 * S}" height="${2 * S}" fill="#ffffff" fill-opacity="0.95" />
        </svg>
      `;
    } else if (type === "boost_gate") {
      W = 80 * S;
      H = 50 * S;
      html = `
        <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="overflow: visible; opacity: 0.65;">
          <!-- Left side post -->
          <polygon points="0,0 ${15 * S},0 ${19 * S},${17.5 * S} ${19 * S},${32.5 * S} ${15 * S},${50 * S} 0,${50 * S}" fill="#2a1b3d" stroke="#d946ef" stroke-width="1.5" />
          <!-- Right side post -->
          <polygon points="${W},0 ${W - 15 * S},0 ${W - 19 * S},${17.5 * S} ${W - 19 * S},${32.5 * S} ${W - 15 * S},${50 * S} ${W},${50 * S}" fill="#2a1b3d" stroke="#d946ef" stroke-width="1.5" />
          <!-- Force field line -->
          <rect x="${10 * S}" y="${21 * S}" width="${W - 20 * S}" height="${8 * S}" fill="#d946ef" fill-opacity="0.5" />
          <!-- Inner shining field -->
          <rect x="${10 * S}" y="${24 * S}" width="${W - 20 * S}" height="${2 * S}" fill="#ffffff" fill-opacity="0.9" />
        </svg>
      `;
    } else if (type === "bounce_ramp") {
      W = 120 * S;
      H = 20 * S;
      html = `
        <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="overflow: visible; opacity: 0.65;">
          <rect x="0" y="0" width="${W}" height="${H}" rx="${2 * S}" fill="#ffa500" stroke="#ffffff" stroke-width="1.5" />
          <path d="M ${10 * S},${13 * S} L ${20 * S},${7 * S} L ${30 * S},${13 * S} M ${45 * S},${13 * S} L ${55 * S},${7 * S} L ${65 * S},${13 * S} M ${80 * S},${13 * S} L ${90 * S},${7 * S} L ${100 * S},${13 * S}" stroke="#ffffff" stroke-width="1.5" fill="none" opacity="0.9" />
        </svg>
      `;
    }

    let ghost = document.getElementById("drag-ghost-container");
    if (!ghost) {
      ghost = document.createElement("div");
      ghost.id = "drag-ghost-container";
      ghost.style.position = "absolute";
      ghost.style.left = "-9999px";
      ghost.style.top = "-9999px";
      ghost.style.zIndex = "-1000";
      ghost.style.pointerEvents = "none";
      document.body.appendChild(ghost);
    }

    ghost.innerHTML = html;
    ghost.style.width = W + "px";
    ghost.style.height = H + "px";

    const childSvg = ghost.querySelector("svg");
    if (childSvg) {
      childSvg.style.filter = "drop-shadow(0 4px 6px rgba(0,0,0,0.4))";
    }

    let dragYOffset = H / 2;
    if (type === "pin" || type === "marble") {
      dragYOffset = H / 2 + 20;
    }

    e.dataTransfer.setDragImage(ghost, W / 2, dragYOffset);
  };

  useEffect(() => {
    const handleOutsideClick = (e: PointerEvent) => {
      if (isAddMenuOpen) {
        if (
          addMenuRef.current &&
          !addMenuRef.current.contains(e.target as Node) &&
          addButtonRef.current &&
          !addButtonRef.current.contains(e.target as Node)
        ) {
          setIsAddMenuOpen(false);
        }
      }
      if (isSpeedMenuOpen) {
        if (
          speedMenuRef.current &&
          !speedMenuRef.current.contains(e.target as Node) &&
          speedButtonRef.current &&
          !speedButtonRef.current.contains(e.target as Node)
        ) {
          setIsSpeedMenuOpen(false);
        }
      }
      if (isTrackMenuOpen) {
        if (
          trackMenuRef.current &&
          !trackMenuRef.current.contains(e.target as Node) &&
          trackButtonRef.current &&
          !trackButtonRef.current.contains(e.target as Node)
        ) {
          setIsTrackMenuOpen(false);
        }
      }
    };

    document.addEventListener("pointerdown", handleOutsideClick);
    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
    };
  }, [isAddMenuOpen, isSpeedMenuOpen, isTrackMenuOpen]);

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
      if (d.hasOwnProperty("selectedPartSegments")) {
        setSelectedPartSegments(d.selectedPartSegments);
      }
      if (d.hasOwnProperty("finishList")) {
        setFinishList([...(d.finishList || [])]);
      } else if (d.mode === "edit") {
        setFinishList([]);
      }
      if (d.hasOwnProperty("showDebugBodies")) {
        setShowDebugBodies(d.showDebugBodies);
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
        setSelectedPartSegments(null);
      }
    };

    window.addEventListener("phaser-state-change", handleStateChange);
    return () =>
      window.removeEventListener("phaser-state-change", handleStateChange);
  }, [selectedPartId]);
 
  useEffect(() => {
    const handlePhaserEditorAction = (e: any) => {
      if (e.detail && e.detail.action === "add-part") {
        setIsAddMenuOpen(false);
      }
    };
    window.addEventListener("phaser-editor-action", handlePhaserEditorAction);
    return () => {
      window.removeEventListener("phaser-editor-action", handlePhaserEditorAction);
    };
  }, []);

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
        <div className="flex gap-2 items-center relative">
          {mode === "edit" ? (
            <button
              onClick={() => {
                sendAction("set-sim-speed", simSpeed);
                sendAction("toggle-mode");
              }}
              className="flex items-center gap-2 px-6 rounded-full font-semibold transition-all text-white cursor-pointer bg-emerald-600 hover:bg-emerald-500 shadow-md h-[40px] shrink-0"
            >
              <Play size={18} className="fill-white" /> Play
            </button>
          ) : (
            <button
              onClick={() => {
                sendAction("toggle-mode");
              }}
              className="flex items-center gap-2 px-6 rounded-full font-semibold transition-all text-white cursor-pointer bg-[#0ea5e9] hover:bg-sky-400 border border-sky-400/20 shadow-md h-[40px]"
            >
              <ChevronLeft size={18} className="stroke-[3]" /> Back
            </button>
          )}
        </div>

        <div className="flex-1 max-w-sm mx-4">
          <input
            type="text"
            placeholder="Track Name"
            className="w-full bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all rounded-full px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-white/30 focus:bg-white/10 text-center font-medium"
            value={trackName}
            onChange={(e) => setTrackName(e.target.value)}
          />
        </div>

        <div className="flex gap-4 items-center">
          {mode === "edit" && (
            <div className="flex gap-2 items-center overflow-x-auto">
              <button
                ref={trackButtonRef}
                onClick={() => setIsTrackMenuOpen(!isTrackMenuOpen)}
                className={`flex items-center justify-center p-2.5 ${isTrackMenuOpen ? "bg-[#25282e]" : "bg-white/10 hover:bg-white/20"} rounded-full font-medium transition-all shadow-lg shrink-0 cursor-pointer`}
                title="Tracks"
              >
                <FolderOpen size={18} className="text-amber-400" />
              </button>

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
        </div>
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

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  sendAction("add-part", "ramp");
                  setIsAddMenuOpen(false);
                }}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", "ramp");
                  setupDragGhost("ramp", e);
                }}
                className="flex flex-col items-center justify-center gap-1.5 p-2 bg-[#2d3139]/40 hover:bg-[#2d3139]/80 border border-white/5 hover:border-white/10 rounded-lg transition-all cursor-pointer select-none active:opacity-75 aspect-square text-center"
              >
                <div className="w-10 h-10 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 40 40" className="w-10 h-10 select-none pointer-events-none">
                    <g transform="rotate(-15 20 20)">
                      <rect x="6" y="19" width="28" height="5" rx="1.5" fill="#000" opacity="0.3" id="ramp_svg_shadow" />
                      <rect x="6" y="17" width="28" height="5" rx="1.5" fill="url(#rampGrad)" stroke="#64748b" strokeWidth="1" id="ramp_svg_body" />
                      <line x1="8" y1="18.5" x2="32" y2="18.5" stroke="#fff" strokeWidth="0.75" strokeLinecap="round" opacity="0.5" id="ramp_svg_glare" />
                    </g>
                    <defs>
                      <linearGradient id="rampGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#f8fafc" />
                        <stop offset="100%" stopColor="#cbd5e1" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <div className="flex flex-col items-center justify-center min-w-0">
                  <span className="text-xs font-semibold text-white leading-tight">Ramp</span>
                </div>
              </button>
              <button
                onClick={() => {
                  sendAction("add-part", "curved_ramp");
                  setIsAddMenuOpen(false);
                }}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", "curved_ramp");
                  setupDragGhost("curved_ramp", e);
                }}
                className="flex flex-col items-center justify-center gap-1.5 p-2 bg-[#2d3139]/40 hover:bg-[#2d3139]/80 border border-white/5 hover:border-white/10 rounded-lg transition-all cursor-pointer select-none active:opacity-75 aspect-square text-center"
              >
                <div className="w-10 h-10 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 40 40" className="w-10 h-10 select-none pointer-events-none">
                    <path d="M 8,26 C 15,12 25,12 32,26" fill="none" stroke="#2563eb" strokeWidth="5" strokeLinecap="round" opacity="0.3" id="curved_svg_shadow" />
                    <path d="M 8,25 C 15,11 25,11 32,25" fill="none" stroke="url(#curvedRampGrad)" strokeWidth="5" strokeLinecap="round" id="curved_svg_body" />
                    <path d="M 8,25 C 15,11 25,11 32,25" fill="none" stroke="#fff" strokeWidth="0.75" strokeLinecap="round" opacity="0.4" id="curved_svg_glare" />
                    <defs>
                      <linearGradient id="curvedRampGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#c084fc" />
                        <stop offset="100%" stopColor="#818cf8" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <div className="flex flex-col items-center justify-center min-w-0">
                  <span className="text-xs font-semibold text-white leading-tight">Curved Ramp</span>
                </div>
              </button>
              <button
                onClick={() => {
                  sendAction("add-part", "bounce_ramp");
                  setIsAddMenuOpen(false);
                }}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", "bounce_ramp");
                  setupDragGhost("bounce_ramp", e);
                }}
                className="flex flex-col items-center justify-center gap-1.5 p-2 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/10 hover:border-orange-500/30 rounded-lg transition-all cursor-pointer select-none active:opacity-75 aspect-square text-center"
              >
                <div className="w-10 h-10 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 40 40" className="w-10 h-10 select-none pointer-events-none">
                    <rect x="5" y="15" width="30" height="10" rx="2" fill="#ffa500" stroke="#fff" strokeWidth="0.75" />
                    <path d="M10,21 L13,18 L16,21 M18,21 L21,18 L24,21 M26,21 L29,18 L32,21" stroke="#ffffff" strokeWidth="1" fill="none" />
                  </svg>
                </div>
                <div className="flex flex-col items-center justify-center min-w-0">
                  <span className="text-xs font-semibold text-orange-400 leading-tight">Bounce Ramp</span>
                </div>
              </button>
              <button
                onClick={() => {
                  sendAction("add-part", "pin");
                  setIsAddMenuOpen(false);
                }}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", "pin");
                  setupDragGhost("pin", e);
                }}
                className="flex flex-col items-center justify-center gap-1.5 p-2 bg-[#2d3139]/40 hover:bg-[#2d3139]/80 border border-white/5 hover:border-white/10 rounded-lg transition-all cursor-pointer select-none active:opacity-75 aspect-square text-center"
              >
                <div className="w-10 h-10 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 40 40" className="w-10 h-10 select-none pointer-events-none">
                    <circle cx="20" cy="20" r="9" fill="#4fc3f7" opacity="0.15" id="pin_svg_shadow" />
                    <circle cx="20" cy="20" r="7" fill="#1e293b" stroke="#475569" strokeWidth="1" id="pin_svg_border" />
                    <circle cx="20" cy="20" r="5" fill="url(#pinSphereGrad)" stroke="#4fc3f7" strokeWidth="0.5" id="pin_svg_body" />
                    <circle cx="18" cy="18" r="1.2" fill="#fff" opacity="0.8" id="pin_svg_glare" />
                    <defs>
                      <radialGradient id="pinSphereGrad" cx="35%" cy="35%" r="65%">
                        <stop offset="0%" stopColor="#e0f7fa" />
                        <stop offset="30%" stopColor="#4fc3f7" />
                        <stop offset="100%" stopColor="#0288d1" />
                      </radialGradient>
                    </defs>
                  </svg>
                </div>
                <div className="flex flex-col items-center justify-center min-w-0">
                  <span className="text-xs font-semibold text-white leading-tight">Pin</span>
                </div>
              </button>
              <button
                onClick={() => {
                  sendAction("add-part", "spinner");
                  setIsAddMenuOpen(false);
                }}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", "spinner");
                  setupDragGhost("spinner", e);
                }}
                className="flex flex-col items-center justify-center gap-1.5 p-2 bg-[#2d3139]/40 hover:bg-[#2d3139]/80 border border-white/5 hover:border-white/10 rounded-lg transition-all cursor-pointer select-none active:opacity-75 aspect-square text-center"
              >
                <div className="w-10 h-10 flex items-center justify-center shrink-0 animate-spin [animation-duration:3s]">
                  <svg viewBox="0 0 40 40" className="w-10 h-10 select-none pointer-events-none">
                    <circle cx="20" cy="20" r="14" fill="none" stroke="#ff5252" strokeWidth="1" strokeDasharray="3 3" opacity="0.25" id="spinner_svg_guide" />
                    <rect x="7" y="18" width="26" height="4" rx="1.5" fill="url(#spinnerGrad)" stroke="#b91c1c" strokeWidth="0.75" id="spinner_svg_blade" />
                    <circle cx="20" cy="20" r="3.5" fill="#1e293b" stroke="#f87171" strokeWidth="1" id="spinner_svg_pin" />
                    <circle cx="20" cy="20" r="1.2" fill="#f87171" id="spinner_svg_center" />
                    <defs>
                      <linearGradient id="spinnerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#fca5a5" />
                        <stop offset="40%" stopColor="#ff5252" />
                        <stop offset="100%" stopColor="#b91c1c" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <div className="flex flex-col items-center justify-center min-w-0">
                  <span className="text-xs font-semibold text-white leading-tight">Spinner</span>
                </div>
              </button>
              <button
                onClick={() => {
                  sendAction("add-part", "scatter_gate");
                  setIsAddMenuOpen(false);
                }}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", "scatter_gate");
                  setupDragGhost("scatter_gate", e);
                }}
                className="flex flex-col items-center justify-center gap-1.5 p-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/10 hover:border-yellow-500/30 rounded-lg transition-all cursor-pointer select-none active:opacity-75 aspect-square text-center"
              >
                <div className="w-10 h-10 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 40 40" className="w-10 h-10 select-none pointer-events-none">
                    <rect x="6" y="10" width="4" height="20" rx="1" fill="#4f526b" stroke="#1f2130" strokeWidth="0.75" id="scatter_svg_left_post" />
                    <polygon points="10,12 12,17 12,23 10,28" fill="#4f526b" id="scatter_svg_left_bracket" />
                    <rect x="30" y="10" width="4" height="20" rx="1" fill="#4f526b" stroke="#1f2130" strokeWidth="0.75" id="scatter_svg_right_post" />
                    <polygon points="30,12 28,17 28,23 30,28" fill="#4f526b" id="scatter_svg_right_bracket" />
                    <rect x="12" y="18" width="16" height="4" rx="1.5" fill="#fff59d" opacity="0.4" id="scatter_svg_field" />
                    <rect x="12" y="19.5" width="16" height="1" fill="#fff" opacity="0.95" id="scatter_svg_laser_glare" />
                    <line x1="12" y1="20" x2="28" y2="20" stroke="#fdeb1d" strokeWidth="1" id="scatter_svg_laser" />
                  </svg>
                </div>
                <div className="flex flex-col items-center justify-center min-w-0">
                  <span className="text-xs font-semibold text-yellow-500 leading-tight">Scatter</span>
                </div>
              </button>
              <button
                onClick={() => {
                  sendAction("add-part", "boost_gate");
                  setIsAddMenuOpen(false);
                }}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", "boost_gate");
                  setupDragGhost("boost_gate", e);
                }}
                className="flex flex-col items-center justify-center gap-1.5 p-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/10 hover:border-purple-500/30 rounded-lg transition-all cursor-pointer select-none active:opacity-75 aspect-square text-center"
              >
                <div className="w-10 h-10 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 40 40" className="w-10 h-10 select-none pointer-events-none">
                    <rect x="6" y="10" width="4" height="20" rx="1" fill="#4f526b" stroke="#1f2130" strokeWidth="0.75" id="boost_svg_left_post" />
                    <polygon points="10,12 12,17 12,23 10,28" fill="#4f526b" id="boost_svg_left_bracket" />
                    <rect x="30" y="10" width="4" height="20" rx="1" fill="#4f526b" stroke="#1f2130" strokeWidth="0.75" id="boost_svg_right_post" />
                    <polygon points="30,12 28,17 28,23 30,28" fill="#4f526b" id="boost_svg_right_bracket" />
                    <rect x="12" y="18" width="16" height="4" rx="1.5" fill="#e9d5ff" opacity="0.4" id="boost_svg_field" />
                    <rect x="12" y="19.5" width="16" height="1" fill="#fff" opacity="0.95" id="boost_svg_laser_glare" />
                    <path d="M16,16 L20,20 L24,16" stroke="#d946ef" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" id="boost_svg_arrow1" />
                    <path d="M16,21 L20,25 L24,21" stroke="#d946ef" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" id="boost_svg_arrow2" />
                  </svg>
                </div>
                <div className="flex flex-col items-center justify-center min-w-0">
                  <span className="text-xs font-semibold text-purple-400 leading-tight">Boost</span>
                </div>
              </button>
              <button
                onClick={() => {
                  sendAction("add-part", "finish_zone");
                  setIsAddMenuOpen(false);
                }}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", "finish_zone");
                  setupDragGhost("finish_zone", e);
                }}
                className="flex flex-col items-center justify-center gap-1.5 p-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/30 rounded-lg transition-all cursor-pointer select-none active:opacity-75 aspect-square text-center"
              >
                <div className="w-10 h-10 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 40 40" className="w-10 h-10 select-none pointer-events-none">
                    <rect x="5" y="10" width="30" height="20" rx="3" fill="#00e676" fillOpacity="0.12" stroke="#00e676" strokeWidth="1.5" strokeDasharray="3 2" id="finish_zone_svg_outer" />
                    <rect x="8" y="13" width="24" height="14" rx="1.5" fill="none" stroke="#00e676" strokeWidth="1" strokeOpacity="0.3" id="finish_zone_svg_inner" />
                    <g transform="translate(14, 13) scale(0.6)">
                      <line x1="4" y1="4" x2="4" y2="22" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" id="finish_zone_flagpole" />
                      <path d="M4.5 4 h12 v9 h-12 Z" fill="#ffffff" stroke="#ffffff" strokeWidth="0.5" id="finish_zone_flag" />
                      <rect x="4.5" y="4" width="4" height="4.5" fill="#111827" id="finish_zone_check1" />
                      <rect x="12.5" y="4" width="4" height="4.5" fill="#111827" id="finish_zone_check2" />
                      <rect x="8.5" y="8.5" width="4" height="4.5" fill="#111827" id="finish_zone_check3" />
                    </g>
                  </svg>
                </div>
                <div className="flex flex-col items-center justify-center min-w-0">
                  <span className="text-xs font-semibold text-emerald-400 leading-tight">Goal</span>
                </div>
              </button>
              <button
                onClick={() => {
                  sendAction("add-part", "marble");
                  setIsAddMenuOpen(false);
                }}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", "marble");
                  setupDragGhost("marble", e);
                }}
                className="flex flex-col items-center justify-center gap-1.5 p-2 bg-[#2d3139]/40 hover:bg-[#2d3139]/80 border border-white/5 hover:border-white/10 rounded-lg transition-all cursor-pointer select-none active:opacity-75 aspect-square text-center"
              >
                <div className="w-10 h-10 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 40 40" className="w-10 h-10 select-none pointer-events-none">
                    <circle cx="20" cy="20" r="10" fill="#ff4444" opacity="0.15" id="marble_svg_shadow" />
                    <circle cx="20" cy="20" r="8" fill="url(#marbleSphereGrad)" stroke="#ff4444" strokeWidth="0.5" id="marble_svg_body" />
                    <circle cx="17.5" cy="17.5" r="1.5" fill="#fff" opacity="0.8" id="marble_svg_glare" />
                    <defs>
                      <radialGradient id="marbleSphereGrad" cx="35%" cy="35%" r="65%">
                        <stop offset="0%" stopColor="#ffdcd1" />
                        <stop offset="40%" stopColor="#ff4444" />
                        <stop offset="100%" stopColor="#991b1b" />
                      </radialGradient>
                    </defs>
                  </svg>
                </div>
                <div className="flex flex-col items-center justify-center min-w-0">
                  <span className="text-xs font-semibold text-white leading-tight">Marble</span>
                </div>
              </button>
            </div>
          </motion.div>
        )}

        {mode === "edit" && isTrackMenuOpen && (
          <motion.div
            ref={trackMenuRef}
            key="tracks-window"
            drag
            dragConstraints={dragConstraintsRef}
            dragElastic={0}
            dragMomentum={false}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-4 left-32 z-30 flex flex-col p-4 bg-[#1a1b1e]/95 backdrop-blur-md rounded-xl shadow-2xl border border-white/10 w-[320px] max-h-[80vh] overflow-hidden"
          >
            <div className="flex items-center justify-between cursor-move handle mb-4 pb-2 border-b border-white/10">
              <div className="flex items-center gap-2 text-white/50">
                <GripHorizontal size={16} />
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                  Tracks
                </span>
              </div>
              <button
                onClick={() => setIsTrackMenuOpen(false)}
                className="text-white/40 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-4">
              <div>
                <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-2 px-1">
                  Built-in
                </h3>
                <div className="space-y-1.5">
                  {[
                    { id: "default", name: "Basic Track", icon: <Map size={14} className="text-gray-400" /> },
                    { id: "plinko", name: "Plinko Board", icon: <Layers size={14} className="text-gray-400" /> },
                    { id: "halfpipe", name: "Halfpipe", icon: <RefreshCw size={14} className="text-gray-400" /> },
                  ].map((track) => (
                    <button
                      key={track.id}
                      onClick={() => {
                        sendAction("load-built-in-track", track.id);
                        setTrackName(track.name);
                        setIsTrackMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between gap-3 px-3 py-2.5 bg-white/5 hover:bg-white/10 rounded-lg transition-all text-sm font-medium"
                    >
                      <div className="flex items-center gap-3">
                        {track.icon}
                        <span>{track.name}</span>
                      </div>
                      <Download size={14} className="text-sky-400" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2 px-1">
                  <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-widest">
                    Your Tracks
                  </h3>
                  <button
                    onClick={saveCurrentTrack}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors"
                  >
                    <Save size={12} />
                    Save Current
                  </button>
                </div>
                <div className="space-y-1.5">
                  {userTracks.length === 0 ? (
                    <div className="text-center py-4 text-xs text-white/30 italic bg-black/20 rounded-lg border border-white/5">
                      No saved tracks yet
                    </div>
                  ) : (
                    userTracks.map((track) => (
                      <div
                        key={track.id}
                        className="group w-full flex items-center justify-between gap-3 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all"
                      >
                        <button
                          className="flex-1 flex items-center gap-3 text-sm font-medium cursor-pointer text-left"
                          onClick={() => {
                            sendAction("load-state", track.data);
                            setTrackName(track.name);
                            setIsTrackMenuOpen(false);
                          }}
                        >
                          <Map size={14} className="text-amber-400" />
                          <span className="truncate">{track.name}</span>
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              sendAction("load-state", track.data);
                              setTrackName(track.name);
                              setIsTrackMenuOpen(false);
                            }}
                            className="p-1.5 rounded-md text-sky-400 hover:bg-sky-400/20 transition-colors"
                            title="Load track"
                          >
                            <Download size={14} />
                          </button>
                          <button
                            onClick={(e) => deleteTrack(track.id, e)}
                            className="p-1.5 rounded-md text-red-400 hover:bg-red-400/20 opacity-0 group-hover:opacity-100 transition-all"
                            title="Delete track"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
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

            {selectedPartType !== "marble" && selectedPartType !== "curved_ramp" && (
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

              {(selectedPartType === "finish_zone" || selectedPartType === "ramp" || selectedPartType === "scatter_gate" || selectedPartType === "boost_gate" || selectedPartType === "bounce_ramp") && selectedPartW !== null && selectedPartH !== null && (
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

                  {selectedPartType !== "ramp" && selectedPartType !== "scatter_gate" && selectedPartType !== "boost_gate" && selectedPartType !== "bounce_ramp" && (
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

              {selectedPartType === "curved_ramp" && selectedPartSegments !== null && (
                <div className="border border-white/10 rounded-lg p-3 bg-white/5 flex flex-col gap-2 font-sans w-full">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-white/40 tracking-wider uppercase">
                      Curved Ramp Segments
                    </span>
                    <div className="w-full h-px bg-white/10 mt-1" />
                  </div>

                  <div className="flex flex-col gap-1 mt-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-white/80">Segments</span>
                      <span className="font-mono text-emerald-400 font-bold">{selectedPartSegments}</span>
                    </div>

                    <input
                      type="range"
                      min="4"
                      max="60"
                      step="1"
                      value={selectedPartSegments}
                      onChange={(e) => {
                        const segments = parseInt(e.target.value, 10);
                        setSelectedPartSegments(segments);
                        sendAction("change-part-property", { segments });
                      }}
                      onMouseUp={() => sendAction("save-state")}
                      onTouchEnd={() => sendAction("save-state")}
                      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />

                    <div className="flex justify-between text-[9px] text-white/40 mt-1">
                      <span>Coarse (4)</span>
                      <span>Smooth (60)</span>
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

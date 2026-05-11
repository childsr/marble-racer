/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameContainer } from './game/GameContainer';
import { useState, useEffect } from 'react';
import { Play, Edit, Trash2, PlusCircle, RotateCw, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';

export default function App() {
  const [mode, setMode] = useState<'play' | 'edit'>('edit');
  const [hasSelection, setHasSelection] = useState(false);

  useEffect(() => {
    const handleStateChange = (e: any) => {
      if (e.detail.mode) setMode(e.detail.mode);
      if (e.detail.hasOwnProperty('hasSelection')) setHasSelection(e.detail.hasSelection);
    };
    window.addEventListener('phaser-state-change', handleStateChange);
    return () => window.removeEventListener('phaser-state-change', handleStateChange);
  }, []);

  const sendAction = (action: string, payload?: any) => {
    window.dispatchEvent(new CustomEvent('phaser-editor-action', { detail: { action, payload } }));
  };

  return (
    <div className="w-full h-screen bg-[#0a0a0a] text-white flex flex-col">
      <header className="w-full flex items-center justify-between px-4 py-3 shrink-0 z-10 transition-all relative bg-[#151619] border-b border-white/10">
        <div className="flex gap-2">
          <button 
            onClick={() => sendAction('toggle-mode')}
            className={`flex items-center gap-2 px-6 py-2 rounded-full font-medium transition-all shadow-lg ${mode === 'play' ? 'bg-green-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >
            <Play size={20} /> Play
          </button>
          <button 
            onClick={() => sendAction('toggle-mode')}
            className={`flex items-center gap-2 px-6 py-2 rounded-full font-medium transition-all shadow-lg ${mode === 'edit' ? 'bg-blue-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
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

        {mode === 'edit' && (
          <div className="flex gap-2 items-center overflow-x-auto">
            {hasSelection && (
              <>
                <button 
                  onClick={() => sendAction('rotate-part', 15)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full font-medium transition-all shadow-lg shrink-0"
                >
                  <RotateCw size={18} /> +15°
                </button>
                <button 
                  onClick={() => sendAction('rotate-part', -15)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full font-medium transition-all shadow-lg shrink-0"
                >
                  <RotateCw size={18} className="transform -scale-x-100" /> -15°
                </button>
                <button 
                  onClick={() => sendAction('scale-part', 1)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full font-medium transition-all shadow-lg shrink-0"
                >
                  <Maximize2 size={18} />
                </button>
                <button 
                  onClick={() => sendAction('scale-part', -1)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full font-medium transition-all shadow-lg shrink-0"
                >
                  <Minimize2 size={18} />
                </button>
                <button 
                  onClick={() => sendAction('delete-part')}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/80 hover:bg-red-500 rounded-full font-medium transition-all shadow-lg shrink-0"
                >
                  <Trash2 size={18} />
                </button>
                <div className="w-px h-8 bg-white/20 my-auto mx-2 shrink-0" />
              </>
            )}

            <button 
              onClick={() => sendAction('add-part', 'ramp')}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full font-medium transition-all shadow-lg shrink-0"
            >
              <PlusCircle size={18} /> <span className="hidden sm:inline">Ramp</span>
            </button>
            <button 
              onClick={() => sendAction('add-part', 'pin')}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full font-medium transition-all shadow-lg shrink-0"
            >
              <PlusCircle size={18} /> <span className="hidden sm:inline">Pin</span>
            </button>
            <button 
              onClick={() => sendAction('add-part', 'spinner')}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full font-medium transition-all shadow-lg shrink-0"
            >
              <PlusCircle size={18} /> <span className="hidden sm:inline">Spinner</span>
            </button>
            <button 
              onClick={() => sendAction('add-part', 'flipper-left')}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full font-medium transition-all shadow-lg shrink-0"
            >
              <PlusCircle size={18} /> <span className="hidden sm:inline">Flipper</span>
            </button>
          </div>
        )}

        {mode === 'play' && (
          <div className="flex gap-2 items-center">
              <button 
                  onClick={() => sendAction('shake-marbles')}
                  className="flex items-center gap-2 px-6 py-2 bg-cyan-500/80 hover:bg-cyan-500 rounded-full font-medium transition-all shadow-lg"
              >
                  ⚡ Shake
              </button>
              <button 
                  onClick={() => sendAction('reset-marbles')}
                  className="flex items-center gap-2 px-6 py-2 bg-red-500/80 hover:bg-red-500 rounded-full font-medium transition-all shadow-lg"
              >
                  <RefreshCw size={20} /> Reset
              </button>
          </div>
        )}
      </header>

      <main className="w-full flex-1 relative overflow-hidden bg-[#0a0a0a]">
        <GameContainer />
      </main>
    </div>
  );
}

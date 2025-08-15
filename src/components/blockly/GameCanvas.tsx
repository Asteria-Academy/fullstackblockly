// src/components/blockly/GameCanvas.tsx

"use client";
import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { GameRuntime } from '@/lib/blockly/game/engine';

export interface GameCanvasHandle {
  run: (code: string) => void;
  stop: () => void;
}

interface GameCanvasProps {
  onLog: (message: string) => void;
  onError: (message: string) => void;
  onRunStateChange: (isRunning: boolean) => void;
}

export const GameCanvas = forwardRef<GameCanvasHandle, GameCanvasProps>(
  ({ onLog, onError, onRunStateChange }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const runtimeRef = useRef<GameRuntime | null>(null);

    useEffect(() => {
      if (canvasRef.current) {
        runtimeRef.current = new GameRuntime(canvasRef.current, onLog, onError);
      }
      return () => runtimeRef.current?.cleanup();
    }, [onLog, onError]);
    
    useImperativeHandle(ref, () => ({
      run(code: string) {
        if (runtimeRef.current) {
          onLog("Running code...");
          runtimeRef.current.run(code);
          onRunStateChange(true);
        }
      },
      stop() {
        if (runtimeRef.current) {
          runtimeRef.current.stop();
          onRunStateChange(false);
        }
      },
    }));

    return (
      <div className="flex h-full flex-col rounded-md border bg-white shadow-sm">
        <div className="flex-shrink-0 border-b bg-gray-50 p-2">
          <h3 className="text-lg font-semibold">Game Preview</h3>
        </div>
        <div className="flex-grow bg-gray-200 p-2">
           <canvas ref={canvasRef} className="h-full w-full bg-white rounded-sm" />
        </div>
      </div>
    );
  }
);
GameCanvas.displayName = 'GameCanvas';
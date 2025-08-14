// src/components/blockly/GameCanvas.tsx

"use client";
import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

export interface GameCanvasHandle {
  run: (code: string) => void;
  stop: () => void;
}

interface GameCanvasProps {
  onLog: (message: string) => void;
  onError: (message: string) => void;
  onRunStateChange: (isRunning: boolean) => void;
}

class GameRuntime {
  private ctx: CanvasRenderingContext2D;
  private pressedKeys: Set<string> = new Set();
  private onStartCallback: () => void = () => {};
  private onTickCallback: () => void = () => {};
  private animationFrameId: number | null = null;
  public log: (message: string) => void;
  public error: (message: string) => void;

  constructor(canvas: HTMLCanvasElement, onLog: (msg: string) => void, onError: (msg: string) => void) {
    this.ctx = canvas.getContext('2d')!;
    this.log = onLog;
    this.error = onError;
    this.initEventListeners();
  }

  private initEventListeners() {
    window.addEventListener('keydown', (e) => this.pressedKeys.add(e.key));
    window.addEventListener('keyup', (e) => this.pressedKeys.delete(e.key));
  }

  private cleanupEventListeners() {
    window.removeEventListener('keydown', (e) => this.pressedKeys.add(e.key));
    window.removeEventListener('keyup', (e) => this.pressedKeys.delete(e.key));
  }

  onStart = (callback: () => void) => { this.onStartCallback = callback; };
  onTick = (callback: () => void) => { this.onTickCallback = callback; };
  isKeyDown = (key: string) => this.pressedKeys.has(key);
  clearCanvas = () => this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
  drawRect = (x: number, y: number, w: number, h: number, color: string) => {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, w, h);
  };
  drawText = (text: string, x: number, y: number, color: string, font: string) => {
    this.ctx.fillStyle = color;
    this.ctx.font = font;
    this.ctx.fillText(text, x, y);
  }

  run(code: string) {
    this.stop();
    this.pressedKeys.clear();
    this.onStartCallback = () => {};
    this.onTickCallback = () => {};

    try {
      new Function('game', code)(this);
      
      this.onStartCallback();
      this.log("Game started.");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.error(`Runtime Error: ${message}`);
      return;
    }

    const gameLoop = () => {
      this.onTickCallback();
      this.animationFrameId = requestAnimationFrame(gameLoop);
    };
    this.animationFrameId = requestAnimationFrame(gameLoop);
  }

  stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
      this.log("Game stopped.");
    }
  }

  cleanup() {
    this.stop();
    this.cleanupEventListeners();
  }
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
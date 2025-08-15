// src/components/BlocklyEditor.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { BlocklyWorkspace } from 'react-blockly';
import * as Blockly from 'blockly/core';
import 'blockly/blocks';
import { javascriptGenerator, Order } from 'blockly/javascript';

// --- Local Module Imports ---
import { AiChatbox } from './AiChatbox';
import { GameCanvas, type GameCanvasHandle } from './blockly/GameCanvas';
import { CodeConsolePanel } from './blockly/CodeConsolePanel';

// --- Blockly Lib Imports ---
import {
  initializeGenerators,
  registerDynamicCategories,
  coreToolbox,
  colourToolboxCategory,
  gameToolboxCategories
} from '@/lib/blockly';

// --- Blockly Configuration ---
const WORKSPACE_CONFIGURATION: Blockly.BlocklyOptions = {
  trashcan: true,
  zoom: { controls: true, wheel: true, startScale: 0.9, maxScale: 3, minScale: 0.3, scaleSpeed: 1.2 },
  grid: { spacing: 20, length: 3, colour: '#ccc', snap: true },
  move: { scrollbars: { horizontal: true, vertical: true }, drag: true, wheel: true },
};

const initialJson = {
  blocks: {
    languageVersion: 0,
    blocks: [
      {
        type: 'game_on_start',
        x: 30,
        y: 30,
        next: {
          block: {
            type: 'variables_set',
            fields: { VAR: { name: "player_x" }},
            inputs: { VALUE: { shadow: { type: 'math_number', fields: { NUM: 150 }}}},
            next: {
              block: { type: 'variables_set', fields: { VAR: { name: "player_y" }},
                inputs: { VALUE: { shadow: { type: 'math_number', fields: { NUM: 100 }}}}
              },
            }
          }
        }
      },
    ],
    variables: [ { name: "player_x" }, { name: "player_y" } ]
  },
};

initializeGenerators();

type RightPanel = 'canvas' | 'code' | 'chat';

export default function BlocklyEditor() {
  const [workspace, setWorkspace] = useState<Blockly.WorkspaceSvg | null>(null);
  const [jsCode, setJsCode] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [activeRightPanel, setActiveRightPanel] = useState<RightPanel>('canvas');
  const [isGameRunning, setIsGameRunning] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const gameCanvasRef = useRef<GameCanvasHandle>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const suppressChangeRef = useRef(false); // avoid recursive change events during programmatic loads

  const serializeWorkspace = useCallback(() => {
    if (!workspace) return null;
    try {
      return Blockly.serialization.workspaces.save(workspace);
    } catch {
      return null;
    }
  }, [workspace]);

  const persistToLocalStorage = useCallback(() => {
    const json = serializeWorkspace();
    if (json) localStorage.setItem('blockly-workspace', JSON.stringify(json));
  }, [serializeWorkspace]);

  const loadWorkspaceJson = useCallback((data: unknown) => {
    if (!data || typeof data !== 'object') return;
    if (!workspace) return;
    suppressChangeRef.current = true;
    try {
      workspace.clear();
      Blockly.serialization.workspaces.load(data, workspace);
      // refresh dynamic toolbox sprite dropdowns
      const tb = workspace.getToolbox();
      if (tb) tb.refreshSelection();
      localStorage.setItem('blockly-workspace', JSON.stringify(data));
      // Update generated code immediately
      const code = javascriptGenerator.workspaceToCode(workspace);
      setJsCode(code);
    } catch (e) {
      console.error('Failed to load workspace JSON', e);
    } finally {
      // small timeout to allow rendering updates
      setTimeout(() => { suppressChangeRef.current = false; }, 0);
    }
  }, [workspace]);

  const toolbox = useMemo(() => ({
    ...coreToolbox,
    contents: [
        { kind: 'block', type: 'sprite_create'}, 
        ...coreToolbox.contents, 
        colourToolboxCategory, 
        ...gameToolboxCategories
    ],
  }), []);

  const handleInject = useCallback((ws: Blockly.WorkspaceSvg) => {
    setWorkspace(ws);
    registerDynamicCategories(ws);
  }, []);

  const onWorkspaceChange = useCallback((ws: Blockly.WorkspaceSvg) => {
  if (suppressChangeRef.current) return; // programmatic load in progress
  if (isInitializing || ws.isDragging() || !ws.rendered) return;
    
    const event = ws.getUndoStack()[ws.getUndoStack().length - 1];
    if (event && (event.type === Blockly.Events.BLOCK_CREATE || event.type === Blockly.Events.BLOCK_DELETE)) {
        const blockEvent = event as Blockly.Events.BlockBase;
        const blockDef = ws.getBlockById(blockEvent.blockId || '')?.type;
        if (blockDef === 'sprite_create') {
            const toolbox = ws.getToolbox();
            if (toolbox) {
              toolbox.refreshSelection();
            }
        }
    }
    
  persistToLocalStorage();
        
    javascriptGenerator.forBlock['text_print'] = function(block, generator) {
      const msg = generator.valueToCode(block, 'TEXT', Order.NONE) || "''";
      return 'game.log(' + msg + ');\n';
    };
    const code = javascriptGenerator.workspaceToCode(ws);
    setJsCode(code);
  }, [isInitializing, persistToLocalStorage]);

  useEffect(() => {
    if (!workspace) return;

    const getFirstSpriteName = (): string | null => {
        const spriteCreateBlocks = workspace.getBlocksByType('sprite_create', false);
        if (spriteCreateBlocks.length > 0) {
            const firstSpriteNameBlock = spriteCreateBlocks[0].getInputTargetBlock('NAME');
            if (firstSpriteNameBlock) {
                return firstSpriteNameBlock.getFieldValue('TEXT');
            }
        }
        return null;
    };

    const handleBlockCreate = (event: Blockly.Events.Abstract) => {
      if (event.type === Blockly.Events.BLOCK_CREATE) {
        const createEvent = event as Blockly.Events.BlockCreate;
        const block = workspace.getBlockById(createEvent.blockId || '');

        if (block && block.type.startsWith('sprite_') && block.type !== 'sprite_create') {
          const nameField = block.getField('NAME') as Blockly.FieldDropdown | null;
          if (nameField && nameField.getValue() === 'NULL_SPRITE') {
            const firstSprite = getFirstSpriteName();
            if (firstSprite) {
              nameField.setValue(firstSprite);
            }
          }
        }
      }
    };

    workspace.addChangeListener(handleBlockCreate);
    return () => workspace.removeChangeListener(handleBlockCreate);
  }, [workspace]);

  useEffect(() => {
    if (!workspace) return;
    const savedData = localStorage.getItem('blockly-workspace');
    let json; 
    try {
      json = savedData ? JSON.parse(savedData) : initialJson;
    } catch {
      json = initialJson;
    }
    loadWorkspaceJson(json);
    setIsInitializing(false);
  }, [workspace, loadWorkspaceJson]);
  
  const addLog = useCallback((message: string) => {
    setLogs(prev => [...prev, message]);
  }, []);

  const addErrorLog = useCallback((message: string) => {
    setLogs(prev => [...prev, `❌ ${message}`]);
  }, []);

  const handleRunCode = () => {
    setLogs([]);
    gameCanvasRef.current?.run(jsCode);
  };
  
  const handleStopCode = () => {
    gameCanvasRef.current?.stop();
  };

  const handleAiCreateBlock = useCallback((args: { block_type: string }) => {
    if (!workspace) return { success: false, error: "Workspace not ready." };
    try {
      const newBlock = workspace.newBlock(args.block_type);
      newBlock.initSvg();
      newBlock.render();
      const { viewMetrics } = workspace.getMetricsManager().getUiMetrics();
      newBlock.moveBy(viewMetrics.left + 50, viewMetrics.top + 50);
      return { success: true, message: `Block '${args.block_type}' created.` };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  }, [workspace]);

  const handleAiCreateVariable = useCallback((args: { variable_name: string }) => {
    if (!workspace) return { success: false, error: "Workspace not ready." };
    try {
      workspace.getVariableMap().createVariable(args.variable_name);
      return { success: true, message: `Variable '${args.variable_name}' created.` };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  }, [workspace]);

  const RightPanelButton = ({ panel, label }: { panel: RightPanel; label: string }) => (
    <button
      onClick={() => setActiveRightPanel(panel)}
      className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
        activeRightPanel === panel
          ? 'bg-blue-600 text-white'
          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex h-screen w-screen flex-row">
      {/* Left Column: Blockly Editor */}
      <div className="flex h-full w-2/3 flex-col border-r bg-white">
        <div className="flex flex-shrink-0 items-center gap-4 border-b p-2">
          <h1 className="text-xl font-bold">Blockly Environment</h1>
          {/* Global Run/Stop Buttons */}
          {!isGameRunning ? (
            <button onClick={handleRunCode} className="flex items-center gap-2 rounded-md border bg-green-100 px-3 py-1.5 text-sm font-medium text-green-800 shadow-sm hover:bg-green-200">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5V19L19 12L8 5Z" /></svg>
                Run
            </button>
          ) : (
            <button onClick={handleStopCode} className="flex items-center gap-2 rounded-md border bg-red-100 px-3 py-1.5 text-sm font-medium text-red-800 shadow-sm hover:bg-red-200">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h12v12H6z" /></svg>
                Stop
            </button>
          )}
          <button
            onClick={() => {
              if (!workspace) return;
              const json = serializeWorkspace();
              if (!json) return;
              const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'blockly-workspace.json';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
            className="rounded-md border bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-800 shadow-sm hover:bg-blue-200"
          >Save</button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-md border bg-purple-100 px-3 py-1.5 text-sm font-medium text-purple-800 shadow-sm hover:bg-purple-200"
          >Load</button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file || !workspace) return;
              const reader = new FileReader();
              reader.onload = () => {
                try {
                  const data = JSON.parse(reader.result as string);
                  loadWorkspaceJson(data);
                  addLog('Workspace loaded.');
                } catch {
                  addErrorLog('Failed to load workspace file.');
                }
              };
              reader.readAsText(file);
            }}
          />
        </div>
        <div className="flex-grow" style={{ position: 'relative' }}>
          <BlocklyWorkspace
            className="h-full w-full"
            toolboxConfiguration={toolbox}
            workspaceConfiguration={WORKSPACE_CONFIGURATION}
            onWorkspaceChange={onWorkspaceChange}
            onInject={handleInject}
          />
        </div>
      </div>

      {/* Right Column: Tabbed Panels */}
      <div className="flex h-full w-1/3 flex-col bg-gray-50">
        {/* Tab Selector */}
        <div className="flex flex-shrink-0 justify-center gap-2 border-b bg-white p-2">
          <RightPanelButton panel="canvas" label="Canvas" />
          <RightPanelButton panel="code" label="Code & Console" />
          <RightPanelButton panel="chat" label="AI Chat" />
        </div>

        {/* Panel Content */}
        <div className="flex-grow p-4 min-h-0">
          <div style={{ display: activeRightPanel === 'canvas' ? 'block' : 'none', height: '100%' }}>
            <GameCanvas 
              ref={gameCanvasRef}
              onLog={addLog} 
              onError={addErrorLog}
              onRunStateChange={setIsGameRunning}
            />
          </div>
          <div style={{ display: activeRightPanel === 'code' ? 'block' : 'none', height: '100%' }}>
            <CodeConsolePanel
              code={jsCode}
              logs={logs}
              onClearLogs={() => setLogs([])}
            />
          </div>
          <div style={{ display: activeRightPanel === 'chat' ? 'block' : 'none', height: '100%' }}>
            <AiChatbox
              onAiCreateBlock={handleAiCreateBlock}
              onAiCreateVariable={handleAiCreateVariable}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
// src/components/BlocklyEditor.tsx

"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';

import { BlocklyWorkspace } from 'react-blockly';
import * as Blockly from 'blockly/core';
import 'blockly/blocks';
import { installAllBlocks } from '@blockly/field-colour';

import { javascriptGenerator } from 'blockly/javascript';
import { pythonGenerator } from 'blockly/python';
import { luaGenerator } from 'blockly/lua';
import { dartGenerator } from 'blockly/dart';
import { phpGenerator } from 'blockly/php';

import { AiChatbox } from './AiChatbox';
import { OutputConsole } from './OutputConsole';
import { ClientOnly } from './ClientOnly';

const toolboxCategories = {
  kind: 'categoryToolbox',
  contents: [
    { kind: 'category', name: 'Logic', colour: '#5C81A6', contents: [
        { kind: 'block', type: 'controls_if' },
        { kind: 'block', type: 'logic_compare' },
        { kind: 'block', type: 'logic_operation' },
        { kind: 'block', type: 'logic_negate' },
        { kind: 'block', type: 'logic_boolean' },
      ] },
    { kind: 'category', name: 'Loops', colour: '#5CA65C', contents: [
        { kind: 'block', type: 'controls_repeat_ext', inputs: { TIMES: { shadow: { type: 'math_number', fields: { NUM: 10 } } } } },
        { kind: 'block', type: 'controls_whileUntil' },
        { kind: 'block', type: 'controls_for', inputs: { FROM: { shadow: { type: 'math_number', fields: { NUM: 1 } } }, TO: { shadow: { type: 'math_number', fields: { NUM: 10 } } }, BY: { shadow: { type: 'math_number', fields: { NUM: 1 } } } } },
      ] },
    { kind: 'category', name: 'Math', colour: '#5C68A6', contents: [
        { kind: 'block', type: 'math_number', fields: { NUM: 0 } },
        { kind: 'block', type: 'math_arithmetic' },
        { kind: 'block', type: 'math_single' },
        { kind: 'block', type: 'math_round' },
        { kind: 'block', type: 'math_number_property' },
        { kind: 'block', type: 'math_random_int', inputs: { FROM: { shadow: { type: 'math_number', fields: { NUM: 1 } } }, TO: { shadow: { type: 'math_number', fields: { NUM: 100 } } } } },
      ] },
    { kind: 'category', name: 'Text', colour: '#685CA6', contents: [
        { kind: 'block', type: 'text' },
        { kind: 'block', type: 'text_join' },
        { kind: 'block', type: 'text_length' },
        { kind: 'block', type: 'text_print' },
      ] },
    { kind: 'category', name: 'Lists', colour: '#745CA6', contents: [
        { kind: 'block', type: 'lists_create_with' },
        { kind: 'block', type: 'lists_length' },
        { kind: 'block', type: 'lists_indexOf' },
        { kind: 'block', type: 'lists_getIndex' },
      ] },
    { kind: 'category', name: 'Colour', colour: '#A6745C', contents: [
         { kind: 'block', type: 'colour_picker' },
        { kind: 'block', type: 'colour_random' },
        {
          kind: 'block',
          type: 'colour_rgb',
          inputs: {
            RED: { shadow: { type: 'math_number', fields: { NUM: 100 } } },
            GREEN: { shadow: { type: 'math_number', fields: { NUM: 50 } } },
            BLUE: { shadow: { type: 'math_number', fields: { NUM: 0 } } },
          },
        },
      ] },
    { kind: 'sep' },
    { kind: 'category', name: 'Variables', custom: 'VARIABLE', colour: '#A65C81' },
    { kind: 'category', name: 'Functions', custom: 'PROCEDURE', colour: '#995ba5' },
  ],
};

const WORKSPACE_CONFIGURATION: Blockly.BlocklyOptions = {
  trashcan: true,
  zoom: {
    controls: true,
    wheel: true,
    startScale: 1.0,
    maxScale: 3,
    minScale: 0.3,
    scaleSpeed: 1.2,
  },
  grid: {
    spacing: 20,
    length: 3,
    colour: '#e0e0e0',
    snap: true,
  },
  move: {
    scrollbars: true,
    drag: true,
    wheel: true,
  },
};

const initialJson = {
  blocks: {
    languageVersion: 0,
    blocks: [{
      type: 'controls_if',
      x: 20,
      y: 20,
    }],
  },
};

installAllBlocks({
  javascript: javascriptGenerator,
  python: pythonGenerator,
  lua: luaGenerator,
  dart: dartGenerator,
  php: phpGenerator,
});


type Language = 'js' | 'py' | 'lua' | 'dart' | 'php';

interface LanguageOption {
  id: Language;
  name: string;
}

const LANGUAGES: LanguageOption[] = [
  { id: 'js', name: 'JavaScript' },
  { id: 'py', name: 'Python' },
  { id: 'lua', name: 'Lua' },
  { id: 'dart', name: 'Dart' },
  { id: 'php', name: 'PHP' },
];


function BlocklyEditor() {
  const [generatedCode, setGeneratedCode] = useState<Record<Language, string>>({
    js: '', py: '', lua: '', dart: '', php: ''
  });
  const [activeLanguage, setActiveLanguage] = useState<Language>('js');

  const [logs, setLogs] = useState<string[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  
  const isInitialized = useRef(false);
  const [workspace, setWorkspace] = useState<Blockly.WorkspaceSvg | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (!workspace) return;

    const savedData = localStorage.getItem('blockly-workspace');
    if (savedData) {
      try {
        const json = JSON.parse(savedData);
        Blockly.serialization.workspaces.load(json, workspace);
      } catch (e) {
        console.error("Error loading from localStorage, using default.", e);
        Blockly.serialization.workspaces.load(initialJson, workspace);
      }
    } else {
      Blockly.serialization.workspaces.load(initialJson, workspace);
    }

    setTimeout(() => {
      isInitialized.current = true;
    }, 0);
  }, [workspace]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source === iframeRef.current?.contentWindow) {
        const { type, message } = event.data;
        if (type === 'log' || type === 'error') {
          setLogs(prev => [...prev, message]);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleWorkspaceChange = useCallback((ws: Blockly.WorkspaceSvg) => {
    if (!workspace) {
      setWorkspace(ws);
    }

    // Only allow saving after initial load is complete
    if (!isInitialized.current || ws.isDragging() || !ws.rendered) {
      return;
    }

    setCanUndo(ws.getUndoStack().length > 0);
    setCanRedo(ws.getRedoStack().length > 0);

    const json = Blockly.serialization.workspaces.save(ws);
    localStorage.setItem('blockly-workspace', JSON.stringify(json));

    setGeneratedCode({
      js: javascriptGenerator.workspaceToCode(ws),
      py: pythonGenerator.workspaceToCode(ws),
      lua: luaGenerator.workspaceToCode(ws),
      dart: dartGenerator.workspaceToCode(ws),
      php: phpGenerator.workspaceToCode(ws),
    });
  }, [workspace]);

  const handleSaveToFile = () => {
    if (!workspace) return;
    const json = Blockly.serialization.workspaces.save(workspace);
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'workspace.json';
    link.click();
  };

  const handleLoadFromFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !workspace) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        Blockly.serialization.workspaces.load(json, workspace);
      } catch (err) {
        alert("Error: Could not load file. Ensure it is a valid workspace JSON file.");
        console.error(err);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleAiCreateBlock = useCallback((args: { block_type: string }) => {
    if (!workspace) return { success: false, error: "Workspace not ready." };
    if (!args.block_type) return { success: false, error: "Missing required parameter: block_type" };

    try {
      const newBlock = workspace.newBlock(args.block_type);
      newBlock.initSvg();
      newBlock.render();
      const viewMetrics = workspace.getMetricsManager().getUiMetrics().viewMetrics;
      newBlock.moveBy(viewMetrics.left + 50, viewMetrics.top + 50);

      console.log(`AI created block: ${args.block_type}`);
      return { success: true, message: `Block '${args.block_type}' created successfully.` };
    } catch (e: unknown) {
      console.error("AI failed to create block:", e);
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  }, [workspace]);

  const handleAiCreateVariable = useCallback((args: { variable_name: string }) => {
    if (!workspace) return { success: false, error: "Workspace not ready." };
    if (!args.variable_name) return { success: false, error: "Missing required parameter: variable_name" };

    try {
      const variable = workspace.getVariableMap().createVariable(args.variable_name);
      console.log(`AI created variable: ${variable.getName()} with ID: ${variable.getId()}`);
      const newBlock = workspace.newBlock('variables_set');
      newBlock.setFieldValue(variable.getId(), 'VAR');
      newBlock.initSvg();
      newBlock.render();
      return { success: true, message: `Variable '${args.variable_name}' created.` };
    } catch (e: unknown) {
      console.error("AI failed to create variable:", e);
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  }, [workspace]);
  
  const handleClearWorkspace = () => {
    if (workspace) {
      workspace.clear();
    }
  };

  const handleRunCode = () => {
    if (!iframeRef.current) return;
    setLogs([]);

    const codeToRun = `
      window.alert = (message) => {
        console.log(message);
      };
      ${generatedCode["js"]}
    `;

    const iframeContent = `
      <html>
        <body>
          <script>
            const originalLog = console.log;
            console.log = (...args) => {
              parent.postMessage({ type: 'log', message: args.join(' ') }, '*');
              originalLog(...args); // Keep original behavior for iframe's own console
            };
            window.onerror = (message) => {
              parent.postMessage({ type: 'error', message: 'Error: ' + message }, '*');
            };
            try {
              ${codeToRun}
            } catch (e) {
              parent.postMessage({ type: 'error', message: e.message }, '*');
            }
          </script>
        </body>
      </html>
    `;
    
    iframeRef.current.srcdoc = iframeContent;
  };

  const handleUndo = () => {
    if (workspace) {
      workspace.undo(false);
    }
  };

  const handleRedo = () => {
    if (workspace) {
      workspace.undo(true);
    }
  };

  return (
    <div className="flex h-full w-full flex-row gap-4">
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".json"
        onChange={handleLoadFromFile}
      />
      <ClientOnly>
        <iframe ref={iframeRef} style={{ display: 'none' }} title="Code Execution Sandbox" sandbox="allow-scripts"/>
      </ClientOnly>
      {/* Left Column */}
      <div className="flex flex-grow flex-col rounded-md border">
        {/* Toolbar */}
        <div className="flex flex-shrink-0 items-center gap-2 border-b bg-gray-50 p-2">
          {/* SAVE/LOAD BUTTONS */}
          <button onClick={handleSaveToFile} className="flex items-center gap-2 rounded-md border bg-white px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-gray-50">
            Save to File
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 rounded-md border bg-white px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-gray-50">
            Load from File
          </button>
          {/* RUN BUTTON */}
          <button
            onClick={handleRunCode}
            className="flex items-center gap-2 rounded-md border bg-white px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-green-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5V19L19 12L8 5Z" /></svg>
            Run Code
          </button>
          
          <div className="flex-grow" />
          {/* UNDO/REDO BUTTONS */}
          <div className="flex rounded-md border bg-white shadow-sm">
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              className="flex items-center gap-2 rounded-l-md border-r p-1.5 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Undo (Ctrl+Z)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
              </svg>
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo}
              className="flex items-center gap-2 rounded-r-md p-1.5 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Redo (Ctrl+Y)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="m15 15 6-6m0 0-6-6m6 6H9a6 6 0 0 0 0 12h3" />
              </svg>
            </button>
          </div>

          <div className="flex-grow" />
          <button
            onClick={handleClearWorkspace}
            className="flex items-center gap-2 rounded-md border bg-white px-3 py-1.5 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            Clear All
          </button>
        </div>

        {/* Blockly Workspace Container */}
        <div className="flex-grow overflow-hidden" style={{ position: 'relative' }}>
          <BlocklyWorkspace
            className="h-full w-full"
            toolboxConfiguration={toolboxCategories}
            onWorkspaceChange={handleWorkspaceChange}
            workspaceConfiguration={WORKSPACE_CONFIGURATION}
          />
        </div>
      </div>

      {/* Right Column: Sidebar */}
      <div className="flex w-1/3 flex-col gap-4">
        {/* Section 1: Generated Code (This is where we build the tabs) */}
        <div className="flex h-[35%] flex-col rounded-md border">
          <div className="flex flex-shrink-0 border-b">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.id}
                onClick={() => setActiveLanguage(lang.id)}
                className={`flex-grow p-2 text-sm font-medium ${
                  activeLanguage === lang.id
                    ? 'border-b-2 border-blue-600 bg-white text-blue-700' // Active tab style
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100' // Inactive tab style
                }`}
              >
                {lang.name}
              </button>
            ))}
          </div>
          <pre className="flex-grow bg-gray-50 p-2 text-xs overflow-auto font-mono">
            <code>{generatedCode[activeLanguage]}</code>
          </pre>
        </div>

        {/* Section 2: AI Chatbox */}
        <div className="flex h-[35%] flex-col">
          <AiChatbox
            onAiCreateBlock={handleAiCreateBlock}
            onAiCreateVariable={handleAiCreateVariable}
          />
        </div>

        {/* Section 3: Output Console */}
        <div className="flex h-[30%] flex-col">
          <OutputConsole logs={logs} />
        </div>
      </div>
    </div>
  );
}

export default BlocklyEditor;
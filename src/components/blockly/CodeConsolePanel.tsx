// src/components/blockly/CodeConsolePanel.tsx
"use client";

import { OutputConsole } from '../OutputConsole';

interface CodeConsolePanelProps {
  code: string;
  logs: string[];
  onClearLogs: () => void;
}

export function CodeConsolePanel({ code, logs, onClearLogs }: CodeConsolePanelProps) {
  return (
    <div className="flex h-full flex-col gap-4">
      {/* Generated Code Section */}
      <div className="flex h-2/3 flex-col rounded-md border bg-white shadow-sm">
        <div className="flex-shrink-0 border-b bg-gray-50 p-2">
          <h3 className="text-lg font-semibold">Generated Code (JavaScript)</h3>
        </div>
        <pre className="flex-grow bg-gray-50 p-2 text-xs overflow-auto font-mono">
          <code>{code || '// Blocks will generate code here...'}</code>
        </pre>
      </div>

      {/* Console Section */}
      <div className="flex h-1/3 flex-col">
        <OutputConsole logs={logs} onClear={onClearLogs} />
      </div>
    </div>
  );
}
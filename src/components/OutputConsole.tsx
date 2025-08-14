// src/components/OutputConsole.tsx
"use client";

interface OutputConsoleProps {
  logs: string[];
  onClear: () => void;
}

export function OutputConsole({ logs, onClear }: OutputConsoleProps) {
  return (
    <div className="flex h-full flex-col rounded-md border p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Console</h3>
        <button 
          onClick={onClear} 
          className="text-xs text-gray-500 hover:text-gray-800"
          title="Clear console"
        >
          Clear
        </button>
      </div>
      <pre className="flex-grow rounded-md border bg-gray-900 p-2 text-xs text-white overflow-auto font-mono">
        {logs.length > 0 ? (
          logs.map((log, index) => <div key={index}>{`> ${log}`}</div>)
        ) : (
          <span className="text-gray-500">Run the game to see output...</span>
        )}
      </pre>
    </div>
  );
}
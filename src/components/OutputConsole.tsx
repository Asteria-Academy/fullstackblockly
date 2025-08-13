// src/components/OutputConsole.tsx

"use client";

interface OutputConsoleProps {
  logs: string[];
}

export function OutputConsole({ logs }: OutputConsoleProps) {
  return (
    <div className="flex h-full flex-col rounded-md border p-4">
      <h3 className="mb-2 text-lg font-semibold">Console</h3>
      <pre className="flex-grow rounded-md border bg-gray-900 text-white p-2 text-xs overflow-auto font-mono">
        {logs.length > 0 ? (
          logs.map((log, index) => <div key={index}>{`> ${log}`}</div>)
        ) : (
          <span className="text-gray-500">Click &quot;Run Code&quot; to see output...</span>
        )}
      </pre>
    </div>
  );
}
// src/app/page.tsx

import BlocklyEditor from "@/components/BlocklyEditor";

export default function Home() {
  return (
    <main className="h-screen w-screen p-8 box-border">
      <div className="flex h-full w-full flex-col rounded-lg border bg-white shadow-md">
        <h1 className="flex-shrink-0 p-4 text-3xl font-bold text-center border-b">
          AI-Powered Blockly Editor
        </h1>
        <div className="flex-grow p-4 min-h-0">
          <BlocklyEditor />
        </div>
      </div>
    </main>
  );
}
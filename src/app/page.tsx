// src/app/page.tsx

import BlocklyEditor from "@/components/BlocklyEditor";

export default function Home() {
  return (
    <main className="h-screen w-screen bg-gray-100">
      <BlocklyEditor />
    </main>
  );
}
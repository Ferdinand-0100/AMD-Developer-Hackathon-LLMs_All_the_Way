"use client";

import Link from "next/link";

interface Props {
  projectId: string;
  projectName: string;
}

export default function WorkspacePlaceholder({ projectId, projectName }: Props) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-zinc-500 hover:text-white transition-colors text-sm"
          >
            ← Dashboard
          </Link>
          <span className="text-zinc-700">/</span>
          <h1 className="text-sm font-semibold text-white">{projectName}</h1>
        </div>
        <Link
          href={`/project/${projectId}/onboard`}
          className="text-xs text-zinc-500 hover:text-indigo-400 transition-colors"
        >
          AI Settings
        </Link>
      </header>

      {/* Placeholder */}
      <main className="flex-1 flex flex-col items-center justify-center gap-5 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-3xl">
          🛠️
        </div>
        <div>
          <h2 className="text-xl font-semibold">Workspace coming in Step 4</h2>
          <p className="text-zinc-400 text-sm mt-2 max-w-sm">
            The collaborative editor, file tree, AI chat panel, and sticky notes
            will live here.
          </p>
        </div>
        <div className="px-4 py-2 rounded-full bg-zinc-800 border border-zinc-700 text-xs text-zinc-500 font-mono">
          Step 3 complete — AI Onboarding ✓
        </div>
      </main>
    </div>
  );
}

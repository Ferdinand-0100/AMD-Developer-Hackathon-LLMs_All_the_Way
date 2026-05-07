"use client";

import { useEffect, useState, useTransition } from "react";
import { generateAwaySummary, touchLastSeen } from "@/app/actions/onboarding";
import WorkspacePlaceholder from "@/components/workspace/WorkspacePlaceholder";

interface Props {
  projectId: string;
  projectName: string;
  lastSeenAt: string | null;
}

type GateState = "checking" | "summary" | "workspace";

export default function ProjectEntryGate({
  projectId,
  projectName,
  lastSeenAt,
}: Props) {
  const [state, setState] = useState<GateState>("checking");
  const [summary, setSummary] = useState<string>("");
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    // If user has never visited, skip the summary
    if (!lastSeenAt) {
      touchLastSeen(projectId);
      setState("workspace");
      return;
    }

    // Check if there's been any activity since last visit
    startTransition(async () => {
      const result = await generateAwaySummary(projectId, lastSeenAt);

      if (result.summary === "Nothing new since your last visit.") {
        // Nothing to show — go straight in
        await touchLastSeen(projectId);
        setState("workspace");
        return;
      }

      setSummary(result.summary);
      if (result.error) setSummaryError(result.error);
      setState("summary");
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function enterWorkspace() {
    startTransition(async () => {
      await touchLastSeen(projectId);
      setState("workspace");
    });
  }

  if (state === "checking") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-zinc-400">
          <div className="w-8 h-8 border-2 border-zinc-700 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm">Checking for updates…</p>
        </div>
      </div>
    );
  }

  if (state === "summary") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b border-zinc-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-lg">
              🤖
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                Welcome back to {projectName}
              </h2>
              <p className="text-xs text-zinc-400">
                Here&apos;s what happened while you were away
              </p>
            </div>
          </div>

          {/* Summary */}
          <div className="px-6 py-5">
            {summaryError ? (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-amber-400 text-sm">
                <p className="font-medium mb-1">Couldn&apos;t generate summary</p>
                <p className="text-xs opacity-80">{summaryError}</p>
              </div>
            ) : (
              <p className="text-zinc-300 text-sm leading-relaxed">{summary}</p>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 pb-5">
            <button
              onClick={enterWorkspace}
              className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 text-sm transition-colors"
            >
              Enter workspace →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <WorkspacePlaceholder projectId={projectId} projectName={projectName} />
  );
}

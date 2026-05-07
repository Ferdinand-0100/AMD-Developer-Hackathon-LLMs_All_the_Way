"use client";

import { useRouter } from "next/navigation";
import type { ProjectWithMembers } from "@/lib/types";

interface Props {
  project: ProjectWithMembers;
}

// Deterministic color from project id
function projectColor(id: string): string {
  const colors = [
    "from-indigo-500/20 to-indigo-600/10 border-indigo-500/20",
    "from-violet-500/20 to-violet-600/10 border-violet-500/20",
    "from-sky-500/20 to-sky-600/10 border-sky-500/20",
    "from-emerald-500/20 to-emerald-600/10 border-emerald-500/20",
    "from-amber-500/20 to-amber-600/10 border-amber-500/20",
    "from-rose-500/20 to-rose-600/10 border-rose-500/20",
  ];
  const index =
    id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;
  return colors[index];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ProjectCard({ project }: Props) {
  const router = useRouter();
  const activeMembers = project.project_members.filter(
    (m) => m.status === "active"
  );
  const colorClass = projectColor(project.id);

  return (
    <div
      className={`group relative flex flex-col rounded-2xl border bg-gradient-to-br ${colorClass} p-5 cursor-pointer hover:scale-[1.02] transition-transform min-h-[160px]`}
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/project/${project.id}`)}
      onKeyDown={(e) => e.key === "Enter" && router.push(`/project/${project.id}`)}
    >
      {/* Project name */}
      <h3 className="text-base font-semibold text-white leading-snug mb-1 pr-4">
        {project.name}
      </h3>

      {/* Created date */}
      <p className="text-xs text-zinc-500 mb-auto">
        Created {formatDate(project.created_at)}
      </p>

      {/* Members */}
      <div className="mt-4 flex items-center justify-between">
        {/* Avatar stack */}
        <div className="flex -space-x-2">
          {activeMembers.slice(0, 5).map((m) => (
            <div
              key={m.id}
              title={`@${m.profiles.username}`}
              className="w-7 h-7 rounded-full bg-zinc-700 border-2 border-zinc-900 flex items-center justify-center text-xs font-bold text-zinc-300 uppercase"
            >
              {m.profiles.username[0]}
            </div>
          ))}
          {activeMembers.length > 5 && (
            <div className="w-7 h-7 rounded-full bg-zinc-700 border-2 border-zinc-900 flex items-center justify-center text-[10px] font-bold text-zinc-400">
              +{activeMembers.length - 5}
            </div>
          )}
        </div>

        <span className="text-xs text-zinc-500">
          {activeMembers.length} member{activeMembers.length !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}

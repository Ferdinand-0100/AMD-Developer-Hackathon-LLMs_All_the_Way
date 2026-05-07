"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CreateProjectModal from "./CreateProjectModal";
import ProjectCard from "./ProjectCard";
import type { ProjectWithMembers } from "@/lib/types";

interface Props {
  projects: ProjectWithMembers[];
}

export default function DashboardContent({ projects }: Props) {
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  function handleProjectCreated(projectId: string) {
    setShowModal(false);
    router.refresh();
    // Future: router.push(`/project/${projectId}`)
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Projects</h2>
          <p className="text-zinc-400 text-sm mt-1">
            {projects.length === 0
              ? "No projects yet — create your first one."
              : `${projects.length} project${projects.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {/* Create project button */}
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 text-sm transition-colors"
        >
          <span className="text-lg leading-none">+</span>
          New project
        </button>
      </div>

      {/* Project grid */}
      {projects.length === 0 ? (
        <EmptyState onCreateClick={() => setShowModal(true)} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}

          {/* "+" card */}
          <button
            onClick={() => setShowModal(true)}
            className="group flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 hover:bg-indigo-500/5 min-h-[160px] transition-colors"
          >
            <span className="w-10 h-10 rounded-full border-2 border-zinc-700 group-hover:border-indigo-500 flex items-center justify-center text-zinc-500 group-hover:text-indigo-400 text-xl transition-colors">
              +
            </span>
            <span className="text-sm text-zinc-500 group-hover:text-zinc-300 transition-colors">
              New project
            </span>
          </button>
        </div>
      )}

      {/* Create project modal */}
      {showModal && (
        <CreateProjectModal
          onClose={() => setShowModal(false)}
          onCreated={handleProjectCreated}
        />
      )}
    </main>
  );
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
      <div className="w-16 h-16 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-3xl">
        📁
      </div>
      <div>
        <h3 className="text-lg font-semibold text-white">No projects yet</h3>
        <p className="text-zinc-400 text-sm mt-1 max-w-xs">
          Create your first project and invite your team. Each member gets their
          own personal AI assistant.
        </p>
      </div>
      <button
        onClick={onCreateClick}
        className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-2.5 text-sm transition-colors"
      >
        Create your first project
      </button>
    </div>
  );
}

"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { createProject, type InvitedMember } from "@/app/actions/projects";

interface Props {
  onClose: () => void;
  onCreated: (projectId: string) => void;
}

interface MemberRow {
  id: string; // local key only
  username: string;
  role: string;
  usernameStatus: "idle" | "checking" | "found" | "not_found";
}

function newMemberRow(): MemberRow {
  return {
    id: crypto.randomUUID(),
    username: "",
    role: "",
    usernameStatus: "idle",
  };
}

export default function CreateProjectModal({ onClose, onCreated }: Props) {
  const [projectName, setProjectName] = useState("");
  const [members, setMembers] = useState<MemberRow[]>([newMemberRow()]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const debounceRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  function updateMember(id: string, patch: Partial<MemberRow>) {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...patch } : m))
    );
  }

  function handleUsernameChange(id: string, value: string) {
    const username = value.toLowerCase();
    updateMember(id, { username, usernameStatus: "checking" });

    if (debounceRefs.current[id]) clearTimeout(debounceRefs.current[id]);

    if (!username || username.length < 3) {
      updateMember(id, { usernameStatus: "idle" });
      return;
    }

    debounceRefs.current[id] = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/check-username?username=${encodeURIComponent(username)}`
        );
        const data = await res.json();
        // available = false means the username EXISTS (which is what we want for invites)
        updateMember(id, {
          usernameStatus: data.available ? "not_found" : "found",
        });
      } catch {
        updateMember(id, { usernameStatus: "idle" });
      }
    }, 400);
  }

  function addMemberRow() {
    setMembers((prev) => [...prev, newMemberRow()]);
  }

  function removeMemberRow(id: string) {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);

    if (!projectName.trim()) {
      setServerError("Project name is required.");
      return;
    }

    const invitedMembers: InvitedMember[] = members
      .filter((m) => m.username.trim().length >= 3)
      .map((m) => ({ username: m.username.trim(), role: m.role.trim() || "Member" }));

    startTransition(async () => {
      const result = await createProject(projectName.trim(), invitedMembers);

      if (result.error) {
        setServerError(result.error);
        return;
      }

      onCreated(result.projectId!);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-white">New Project</h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Project name */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Project name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. OpenCode Backend"
              required
              className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2.5 text-white placeholder-zinc-500 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
            />
          </div>

          {/* Invite members */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Invite members{" "}
              <span className="text-zinc-500 font-normal">(optional)</span>
            </label>

            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.id} className="flex gap-2 items-start">
                  {/* Username */}
                  <div className="flex-1">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">
                        @
                      </span>
                      <input
                        type="text"
                        value={member.username}
                        onChange={(e) =>
                          handleUsernameChange(member.id, e.target.value)
                        }
                        placeholder="username"
                        className={`w-full rounded-lg bg-zinc-800 border pl-7 pr-3 py-2 text-white placeholder-zinc-500 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                          member.usernameStatus === "not_found"
                            ? "border-red-500"
                            : member.usernameStatus === "found"
                            ? "border-emerald-500"
                            : "border-zinc-700"
                        }`}
                      />
                    </div>
                    {member.usernameStatus === "not_found" && (
                      <p className="text-red-400 text-xs mt-1">User not found</p>
                    )}
                    {member.usernameStatus === "found" && (
                      <p className="text-emerald-400 text-xs mt-1">✓ Found</p>
                    )}
                  </div>

                  {/* Role */}
                  <input
                    type="text"
                    value={member.role}
                    onChange={(e) =>
                      updateMember(member.id, { role: e.target.value })
                    }
                    placeholder="Role (e.g. Designer)"
                    className="flex-1 rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-white placeholder-zinc-500 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                  />

                  {/* Remove row */}
                  {members.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMemberRow(member.id)}
                      className="mt-0.5 text-zinc-500 hover:text-red-400 transition-colors text-lg leading-none px-1"
                      aria-label="Remove member"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addMemberRow}
              className="mt-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              + Add another member
            </button>
          </div>

          {/* Errors */}
          {serverError && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-400 text-sm">
              {serverError}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 py-2.5 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !projectName.trim()}
              className="flex-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed text-white font-semibold py-2.5 text-sm transition-colors"
            >
              {isPending ? "Creating…" : "Create project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveOnboardingProfile } from "@/app/actions/onboarding";

interface Props {
  projectId: string;
  projectName: string;
  defaultRole: string;
}

const TIMEZONES = [
  "UTC", "UTC-8 (PST)", "UTC-7 (MST)", "UTC-6 (CST)", "UTC-5 (EST)",
  "UTC+0 (GMT)", "UTC+1 (CET)", "UTC+2 (EET)", "UTC+3 (MSK)",
  "UTC+5:30 (IST)", "UTC+8 (CST/SGT)", "UTC+9 (JST)", "UTC+10 (AEST)",
];

export default function OnboardingForm({ projectId, projectName, defaultRole }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [docText, setDocText] = useState("");
  const [docFileName, setDocFileName] = useState("");

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocFileName(file.name);
    // Read as plain text — works for .txt, .md, code files
    const text = await file.text();
    // Truncate to ~2000 chars to stay within token budget
    setDocText(text.slice(0, 2000));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("project_id", projectId);
    formData.set("extra_context", docText);

    startTransition(async () => {
      const result = await saveOnboardingProfile(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push(`/project/${projectId}`);
    });
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-indigo-400 text-sm font-medium mb-3">
            <span>🤖</span>
            <span>AI Setup</span>
          </div>
          <h1 className="text-2xl font-bold text-white">
            Set up your AI assistant
          </h1>
          <p className="text-zinc-400 mt-2">
            Your answers shape how your personal AI works inside{" "}
            <span className="text-white font-medium">{projectName}</span>.
            This takes about 2 minutes.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Role */}
          <Field label="Your role in this project" hint="Pre-filled from your invite — feel free to edit.">
            <input
              name="role"
              type="text"
              defaultValue={defaultRole}
              placeholder="e.g. Frontend Developer"
              required
              className={inputCls}
            />
          </Field>

          {/* Responsibilities */}
          <Field label="Main responsibilities" hint="What will you primarily be working on?">
            <textarea
              name="responsibilities"
              rows={3}
              placeholder="e.g. Building the React UI, reviewing PRs, writing component tests"
              className={textareaCls}
            />
          </Field>

          {/* Communication style */}
          <Field label="Preferred response style">
            <div className="grid grid-cols-2 gap-3">
              <RadioCard
                name="communication_style"
                value="bullets"
                label="Brief bullets"
                description="Short, scannable points"
                defaultChecked={false}
              />
              <RadioCard
                name="communication_style"
                value="detailed"
                label="Detailed explanations"
                description="Full context and reasoning"
                defaultChecked={true}
              />
            </div>
          </Field>

          {/* Tone */}
          <Field label="Preferred tone">
            <div className="grid grid-cols-2 gap-3">
              <RadioCard
                name="tone"
                value="casual"
                label="Casual"
                description="Friendly and relaxed"
                defaultChecked={true}
              />
              <RadioCard
                name="tone"
                value="formal"
                label="Formal"
                description="Professional and precise"
                defaultChecked={false}
              />
            </div>
          </Field>

          {/* Working hours */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Working hours" hint="e.g. 9am–6pm">
              <input
                name="working_hours"
                type="text"
                placeholder="9am – 6pm"
                className={inputCls}
              />
            </Field>
            <Field label="Timezone">
              <select name="timezone" className={inputCls}>
                <option value="">Select timezone</option>
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {/* AI restrictions */}
          <Field
            label="Things your AI should never do"
            hint="Optional. e.g. Don't send messages without asking me first"
          >
            <textarea
              name="ai_restrictions"
              rows={2}
              placeholder="Leave blank if no restrictions"
              className={textareaCls}
            />
          </Field>

          {/* Document upload */}
          <Field
            label="Upload context document"
            hint="Optional. A style guide, past work sample, or notes. Plain text / .md / code files work best."
          >
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="flex-1 rounded-lg bg-zinc-800 border border-zinc-700 border-dashed px-4 py-3 text-sm text-zinc-400 group-hover:border-indigo-500 group-hover:text-zinc-300 transition-colors">
                {docFileName ? (
                  <span className="text-indigo-300">📄 {docFileName}</span>
                ) : (
                  "Click to upload a file…"
                )}
              </div>
              <input
                type="file"
                accept=".txt,.md,.ts,.tsx,.js,.jsx,.py,.json,.yaml,.yml,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            {docText && (
              <p className="text-xs text-zinc-500 mt-1">
                {docText.length} characters loaded
              </p>
            )}
          </Field>

          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="flex-1 rounded-xl border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 py-3 text-sm font-medium transition-colors"
            >
              Back to dashboard
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed text-white font-semibold py-3 text-sm transition-colors"
            >
              {isPending ? "Saving…" : "Set up my AI →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Small helpers ────────────────────────────────────────────

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-300 mb-1.5">
        {label}
      </label>
      {hint && <p className="text-xs text-zinc-500 mb-2">{hint}</p>}
      {children}
    </div>
  );
}

function RadioCard({
  name,
  value,
  label,
  description,
  defaultChecked,
}: {
  name: string;
  value: string;
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="relative flex cursor-pointer">
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />
      <div className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm transition-colors peer-checked:border-indigo-500 peer-checked:bg-indigo-500/10">
        <p className="font-medium text-white">{label}</p>
        <p className="text-zinc-400 text-xs mt-0.5">{description}</p>
      </div>
    </label>
  );
}

const inputCls =
  "w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2.5 text-white placeholder-zinc-500 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors";

const textareaCls =
  "w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2.5 text-white placeholder-zinc-500 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors resize-none";

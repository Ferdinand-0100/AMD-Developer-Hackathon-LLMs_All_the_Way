"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { chatCompletion } from "@/lib/ai/hf-inference";

// ─── Save / update onboarding profile ───────────────────────────────────────

export async function saveOnboardingProfile(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const projectId = formData.get("project_id") as string;

  const payload = {
    user_id: user.id,
    project_id: projectId,
    role: (formData.get("role") as string).trim(),
    responsibilities: (formData.get("responsibilities") as string).trim(),
    communication_style: formData.get("communication_style") as string,
    tone: formData.get("tone") as string,
    working_hours: (formData.get("working_hours") as string).trim(),
    timezone: (formData.get("timezone") as string).trim(),
    ai_restrictions: (formData.get("ai_restrictions") as string).trim(),
    extra_context: (formData.get("extra_context") as string).trim(),
  };

  const { error } = await supabase
    .from("project_profiles")
    .upsert(payload, { onConflict: "user_id,project_id" });

  if (error) return { error: error.message };

  // Log the member joining as an activity event
  await supabase.from("activity_log").insert({
    project_id: projectId,
    user_id: user.id,
    event_type: "member_onboarded",
    description: `A team member completed onboarding as ${payload.role || "a member"}.`,
  });

  revalidatePath(`/project/${projectId}`);
  return { success: true };
}

// ─── Generate away summary ───────────────────────────────────────────────────

export async function generateAwaySummary(
  projectId: string,
  lastSeenAt: string | null
): Promise<{ summary: string; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { summary: "", error: "Not authenticated." };

  // Fetch recent activity since last_seen_at (max 30 events)
  let query = supabase
    .from("activity_log")
    .select("event_type, description, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (lastSeenAt) {
    query = query.gt("created_at", lastSeenAt);
  }

  const { data: events } = await query;

  if (!events || events.length === 0) {
    return { summary: "Nothing new since your last visit." };
  }

  // Fetch project name
  const { data: project } = await supabase
    .from("projects")
    .select("name")
    .eq("id", projectId)
    .single();

  const eventLines = events
    .map(
      (e) =>
        `- [${new Date(e.created_at).toLocaleString()}] ${e.event_type}: ${e.description}`
    )
    .join("\n");

  const messages = [
    {
      role: "system" as const,
      content:
        "You are a helpful project assistant. Summarize recent project activity concisely in plain language. Be brief — 3 to 5 sentences max. Do not use markdown headers.",
    },
    {
      role: "user" as const,
      content: `Project: ${project?.name ?? "Unknown"}\n\nRecent activity since the user was last online:\n${eventLines}\n\nWrite a short, friendly summary of what happened.`,
    },
  ];

  try {
    const { text, log } = await chatCompletion(messages, {
      maxTokens: 256,
      temperature: 0.5,
    });

    // Log the inference call for AMD Developer Cloud ROCm report
    await supabase.from("inference_logs").insert({
      user_id: user.id,
      project_id: projectId,
      model: log.model,
      prompt_tokens: log.prompt_tokens,
      completion_tokens: log.completion_tokens,
      latency_ms: log.latency_ms,
      endpoint: log.endpoint,
      context_type: "away_summary",
    });

    return { summary: text };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Inference failed.";
    return { summary: "", error: message };
  }
}

// ─── Update last_seen_at ─────────────────────────────────────────────────────

export async function touchLastSeen(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("project_members")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("project_id", projectId)
    .eq("user_id", user.id);
}

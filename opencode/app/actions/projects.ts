"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface InvitedMember {
  username: string;
  role: string;
}

// ─── Create Project ──────────────────────────────────────────────────────────

export async function createProject(
  name: string,
  invitedMembers: InvitedMember[]
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  // Delegate everything to the security-definer DB function.
  // It creates the project, adds the owner, invites members, and
  // sends notifications — all in one atomic transaction, bypassing RLS.
  const { data, error } = await supabase.rpc("create_project", {
    p_name: name.trim(),
    p_owner_id: user.id,
    p_members: invitedMembers.map((m) => ({
      username: m.username.trim().toLowerCase(),
      role: m.role.trim() || "Member",
    })),
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { projectId: data as string };
}

// ─── Accept Invite ───────────────────────────────────────────────────────────

export async function acceptInvite(notificationId: string, projectId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error: memberError } = await supabase
    .from("project_members")
    .update({ status: "active" })
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .eq("status", "invited"); // only update if still pending

  if (memberError) return { error: memberError.message };

  // Always delete the notification regardless
  await supabase.from("notifications").delete().eq("id", notificationId);

  revalidatePath("/dashboard");
  return { success: true };
}

// ─── Decline Invite ──────────────────────────────────────────────────────────

export async function declineInvite(notificationId: string, projectId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  // Only decline if still in invited state — never touch an active member
  const { data: membership } = await supabase
    .from("project_members")
    .select("status")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  if (membership?.status === "active") {
    // Already accepted — just remove the stale notification, leave membership alone
    await supabase.from("notifications").delete().eq("id", notificationId);
    revalidatePath("/dashboard");
    return { success: true };
  }

  await supabase
    .from("project_members")
    .update({ status: "declined" })
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .eq("status", "invited");

  await supabase.from("notifications").delete().eq("id", notificationId);

  revalidatePath("/dashboard");
  return { success: true };
}

// ─── Mark Notification Read ──────────────────────────────────────────────────

export async function markNotificationRead(notificationId: string) {
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId);
  revalidatePath("/dashboard");
}

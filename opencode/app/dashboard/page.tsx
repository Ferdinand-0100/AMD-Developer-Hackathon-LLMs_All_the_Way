import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardContent from "@/components/dashboard/DashboardContent";
import type { ProjectWithMembers } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch the user's profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  // Fetch all projects the user is an active member of
  const { data: projects } = await supabase
    .from("projects")
    .select(
      `
      *,
      project_members!inner (
        id,
        user_id,
        role,
        status,
        joined_at,
        profiles!inner (username)
      )
    `
    )
    .eq("project_members.user_id", user.id)
    .eq("project_members.status", "active")
    .order("created_at", { ascending: false });

  const projectsWithMembers = (projects ?? []) as ProjectWithMembers[];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <DashboardHeader userId={user.id} username={profile?.username ?? "user"} />
      <DashboardContent projects={projectsWithMembers} />
    </div>
  );
}

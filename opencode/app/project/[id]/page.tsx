import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProjectEntryGate from "@/components/onboarding/ProjectEntryGate";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: Props) {
  const { id: projectId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verify active membership
  const { data: membership } = await supabase
    .from("project_members")
    .select("role, status, last_seen_at")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!membership || membership.status !== "active") {
    redirect("/dashboard");
  }

  // Check if onboarded
  const { data: profile } = await supabase
    .from("project_profiles")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect(`/project/${projectId}/onboard`);
  }

  // Fetch project info
  const { data: project } = await supabase
    .from("projects")
    .select("name")
    .eq("id", projectId)
    .single();

  return (
    <ProjectEntryGate
      projectId={projectId}
      projectName={project?.name ?? "Project"}
      lastSeenAt={membership.last_seen_at ?? null}
    />
  );
}

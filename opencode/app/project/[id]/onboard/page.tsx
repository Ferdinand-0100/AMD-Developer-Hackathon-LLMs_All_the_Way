import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OnboardingForm from "@/components/onboarding/OnboardingForm";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function OnboardPage({ params }: Props) {
  const { id: projectId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verify the user is an active member of this project
  const { data: membership } = await supabase
    .from("project_members")
    .select("role, status")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!membership || membership.status !== "active") {
    redirect("/dashboard");
  }

  // If already onboarded, go straight to the workspace
  const { data: existingProfile } = await supabase
    .from("project_profiles")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingProfile) {
    redirect(`/project/${projectId}`);
  }

  // Fetch project name for display
  const { data: project } = await supabase
    .from("projects")
    .select("name")
    .eq("id", projectId)
    .single();

  return (
    <OnboardingForm
      projectId={projectId}
      projectName={project?.name ?? "this project"}
      defaultRole={membership.role}
    />
  );
}

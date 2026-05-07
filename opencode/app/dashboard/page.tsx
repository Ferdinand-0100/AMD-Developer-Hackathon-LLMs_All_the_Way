import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logOut } from "@/app/actions/auth";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch the user's profile to display their username
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">
          Open<span className="text-indigo-400">Code</span>
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-400">
            @{profile?.username ?? user.email}
          </span>
          <form action={logOut}>
            <button
              type="submit"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Log out
            </button>
          </form>
        </div>
      </header>

      {/* Placeholder content */}
      <main className="flex flex-col items-center justify-center min-h-[calc(100vh-65px)] gap-4 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-3xl">
          🚀
        </div>
        <h2 className="text-2xl font-semibold">
          Welcome, {profile?.username ?? "there"}!
        </h2>
        <p className="text-zinc-400 max-w-sm">
          Your dashboard is coming in Step 2. Projects, team members, and your
          personal AI assistant will live here.
        </p>
        <div className="mt-4 px-4 py-2 rounded-full bg-zinc-800 border border-zinc-700 text-xs text-zinc-500 font-mono">
          Step 1 complete — Auth &amp; User System ✓
        </div>
      </main>
    </div>
  );
}

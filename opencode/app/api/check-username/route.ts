import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/check-username?username=<value>
 * Returns { available: boolean }
 * Used for real-time username uniqueness feedback on the signup form.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username")?.trim().toLowerCase();

  if (!username || username.length < 3) {
    return NextResponse.json({ available: false, reason: "too_short" });
  }

  if (!/^[a-z0-9_-]+$/.test(username)) {
    return NextResponse.json({ available: false, reason: "invalid_chars" });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { available: false, reason: "server_error" },
      { status: 500 }
    );
  }

  return NextResponse.json({ available: data === null });
}

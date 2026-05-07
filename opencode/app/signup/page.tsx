"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import { signUp } from "@/app/actions/auth";

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

export default function SignupPage() {
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Real-time username uniqueness check
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (username.length === 0) {
      setUsernameStatus("idle");
      return;
    }

    if (username.length < 3) {
      setUsernameStatus("invalid");
      return;
    }

    if (!/^[a-z0-9_-]+$/i.test(username)) {
      setUsernameStatus("invalid");
      return;
    }

    setUsernameStatus("checking");

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/check-username?username=${encodeURIComponent(username)}`
        );
        const data = await res.json();
        setUsernameStatus(data.available ? "available" : "taken");
      } catch {
        setUsernameStatus("idle");
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [username]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);

    // Block only on known-bad states; "idle" and "checking" are allowed through
    // (the server action will catch duplicates as a fallback)
    if (usernameStatus === "taken") {
      setServerError("That username is already taken. Please choose another.");
      return;
    }
    if (usernameStatus === "invalid") {
      setServerError("Username must be 3–30 characters: letters, numbers, _ or -");
      return;
    }

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await signUp(formData);
      if (result?.error) {
        setServerError(result.error);
      }
    });
  }

  const usernameHint = {
    idle: null,
    checking: (
      <span className="text-zinc-400 text-sm">Checking availability…</span>
    ),
    available: (
      <span className="text-emerald-600 text-sm font-medium">
        ✓ Username is available
      </span>
    ),
    taken: (
      <span className="text-red-500 text-sm font-medium">
        ✗ Username is already taken
      </span>
    ),
    invalid: (
      <span className="text-amber-500 text-sm">
        Use 3+ characters: letters, numbers, _ or -
      </span>
    ),
  }[usernameStatus];

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Open<span className="text-indigo-400">Code</span>
          </h1>
          <p className="mt-2 text-zinc-400 text-sm">
            Collaborative dev, powered by your own AI
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl">
          <h2 className="text-xl font-semibold text-white mb-6">
            Create your account
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-zinc-300 mb-1.5"
              >
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="your_handle"
                className={`w-full rounded-lg bg-zinc-800 border px-4 py-2.5 text-white placeholder-zinc-500 text-sm outline-none transition-colors focus:ring-2 focus:ring-indigo-500 ${
                  usernameStatus === "taken" || usernameStatus === "invalid"
                    ? "border-red-500"
                    : usernameStatus === "available"
                    ? "border-emerald-500"
                    : "border-zinc-700"
                }`}
              />
              <div className="mt-1.5 min-h-[20px]">{usernameHint}</div>
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-zinc-300 mb-1.5"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2.5 text-white placeholder-zinc-500 text-sm outline-none transition-colors focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-zinc-300 mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="Min. 8 characters"
                className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2.5 text-white placeholder-zinc-500 text-sm outline-none transition-colors focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Server error */}
            {serverError && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-400 text-sm">
                {serverError}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={
                isPending ||
                username.length < 3 ||
                usernameStatus === "taken" ||
                usernameStatus === "invalid"
              }
              className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed text-white font-semibold py-2.5 text-sm transition-colors"
            >
              {isPending ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-indigo-400 hover:text-indigo-300 font-medium"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { logOut } from "@/app/actions/auth";
import { useNotifications } from "@/lib/hooks/useNotifications";
import InboxPanel from "./InboxPanel";
import type { Notification } from "@/lib/types";

interface Props {
  userId: string;
  username: string;
}

export default function DashboardHeader({ userId, username }: Props) {
  const [inboxOpen, setInboxOpen] = useState(false);
  const { notifications } = useNotifications(userId);

  // Local copy shared between the badge and the panel so optimistic
  // removals in the panel immediately update the unread count too.
  const [localNotifications, setLocalNotifications] =
    useState<Notification[]>(notifications);

  // Sync whenever the realtime hook delivers a fresh list
  useEffect(() => {
    setLocalNotifications(notifications);
  }, [notifications]);

  const unreadCount = localNotifications.filter((n) => !n.read).length;

  return (
    <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between relative">
      {/* Brand */}
      <h1 className="text-xl font-bold tracking-tight text-white">
        Open<span className="text-indigo-400">Code</span>
      </h1>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Inbox bell */}
        <div className="relative">
          <button
            onClick={() => setInboxOpen((v) => !v)}
            className="relative p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            aria-label="Open inbox"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>

            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {inboxOpen && (
            <InboxPanel
              notifications={localNotifications}
              onNotificationsChange={setLocalNotifications}
              onClose={() => setInboxOpen(false)}
            />
          )}
        </div>

        {/* Username */}
        <span className="text-sm text-zinc-400">@{username}</span>

        {/* Logout */}
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
  );
}

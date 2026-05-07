"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { acceptInvite, declineInvite, markNotificationRead } from "@/app/actions/projects";
import type { Notification } from "@/lib/types";
import { useRouter } from "next/navigation";

interface Props {
  notifications: Notification[];
  onNotificationsChange: (updated: Notification[]) => void;
  onClose: () => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function InboxPanel({ notifications, onNotificationsChange, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Local copy so we can optimistically remove items immediately
  const [localNotifications, setLocalNotifications] = useState(notifications);

  function setAndPropagate(updated: Notification[]) {
    setLocalNotifications(updated);
    onNotificationsChange(updated); // keeps the badge in sync
  }

  // Sync when the parent's realtime hook delivers a new list
  useEffect(() => {
    setLocalNotifications(notifications);
  }, [notifications]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  function removeLocally(id: string) {
    setAndPropagate(localNotifications.filter((n) => n.id !== id));
  }

  function handleAccept(n: Notification) {
    // Remove immediately so the user can't double-click
    removeLocally(n.id);
    startTransition(async () => {
      await acceptInvite(n.id, n.project_id!);
      router.refresh(); // refreshes the project grid
    });
  }

  function handleDecline(n: Notification) {
    removeLocally(n.id);
    startTransition(async () => {
      await declineInvite(n.id, n.project_id!);
      router.refresh();
    });
  }

  function handleMarkRead(n: Notification) {
    if (!n.read) {
      setAndPropagate(
        localNotifications.map((x) => (x.id === n.id ? { ...x, read: true } : x))
      );
      startTransition(async () => {
        await markNotificationRead(n.id);
      });
    }
  }

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-12 w-96 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
        <h3 className="text-sm font-semibold text-white">Inbox</h3>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-white transition-colors text-lg leading-none"
          aria-label="Close inbox"
        >
          ×
        </button>
      </div>

      {/* Notification list */}
      <div className="max-h-[480px] overflow-y-auto divide-y divide-zinc-800">
        {localNotifications.length === 0 ? (
          <div className="px-5 py-10 text-center text-zinc-500 text-sm">
            You&apos;re all caught up 🎉
          </div>
        ) : (
          localNotifications.map((n) => (
            <div
              key={n.id}
              className={`px-5 py-4 transition-colors ${
                !n.read ? "bg-indigo-500/5" : ""
              }`}
              onClick={() => handleMarkRead(n)}
            >
              {n.type === "project_invite" ? (
                <ProjectInviteItem
                  notification={n}
                  onAccept={() => handleAccept(n)}
                  onDecline={() => handleDecline(n)}
                />
              ) : (
                <PingItem notification={n} />
              )}
              <p className="text-xs text-zinc-600 mt-2">
                {timeAgo(n.created_at)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ProjectInviteItem({
  notification,
  onAccept,
  onDecline,
}: {
  notification: Notification;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const projectName = notification.projects?.name ?? "a project";
  const role = notification.role ?? "Member";

  return (
    <div>
      <div className="flex items-start gap-2 mb-3">
        <span className="text-lg">📬</span>
        <div>
          <p className="text-sm text-white leading-snug">
            You&apos;ve been invited to{" "}
            <span className="font-semibold">{projectName}</span>
          </p>
          <p className="text-xs text-zinc-400 mt-0.5">
            Role: <span className="text-indigo-300">{role}</span>
          </p>
        </div>
        {!notification.read && (
          <span className="ml-auto w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-1" />
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAccept();
          }}
          className="flex-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-1.5 transition-colors"
        >
          Accept
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDecline();
          }}
          className="flex-1 rounded-lg border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white text-xs font-semibold py-1.5 transition-colors"
        >
          Decline
        </button>
      </div>
    </div>
  );
}

function PingItem({ notification }: { notification: Notification }) {
  const sender = notification.sender?.username ?? "Someone";

  return (
    <div className="flex items-start gap-2">
      <span className="text-lg">💬</span>
      <div className="flex-1">
        <p className="text-sm text-white leading-snug">
          <span className="font-semibold">@{sender}</span> pinged you
        </p>
        {notification.message && (
          <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
            {notification.message}
          </p>
        )}
      </div>
      {!notification.read && (
        <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-1" />
      )}
    </div>
  );
}

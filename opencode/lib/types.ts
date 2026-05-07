/**
 * Shared TypeScript types for OpenCode.
 * Mirrors the Supabase database schema.
 */

export interface Profile {
  id: string;
  username: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  status: "active" | "invited" | "declined";
  joined_at: string;
}

export interface ProjectWithMembers extends Project {
  project_members: (ProjectMember & { profiles: Pick<Profile, "username"> })[];
}

export type NotificationType = "project_invite" | "ping";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  project_id: string | null;
  role: string | null;
  sender_id: string | null;
  message: string | null;
  read: boolean;
  created_at: string;
  // joined from server queries
  projects?: Pick<Project, "name"> | null;
  sender?: Pick<Profile, "username"> | null;
}

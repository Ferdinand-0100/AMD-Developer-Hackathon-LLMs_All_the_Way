# OpenCode

**A collaborative project management platform where every team member has their own personalized AI assistant powered by open-source models.**

Built with:
- **Frontend + Backend:** Next.js (App Router)
- **Database + Auth:** Supabase
- **AI Model:** Qwen2.5-Coder-7B-Instruct (Hugging Face Hub)
- **Agent Orchestration:** CrewAI
- **Inference:** AMD Developer Cloud (ROCm-compatible)
- **Styling:** Tailwind CSS
- **Real-time Collaboration:** Supabase Realtime + CRDT library

---

## Step 1 — Auth & User System ✅

**What's built:**
- Signup and login pages with email/password authentication
- Real-time username uniqueness validation (checks against the database as you type)
- Supabase Auth integration with automatic profile creation
- Protected routes via Next.js middleware
- Dashboard placeholder (redirects after login)

**What to test:**
1. Sign up with a new account (email, password, unique username)
2. Try signing up with a duplicate username — you should see "Username is already taken"
3. Log out and log back in
4. Try accessing `/dashboard` without being logged in — you should be redirected to `/login`

---

## Setup Instructions

### 1. Clone and Install

```bash
cd opencode
npm install
```

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once your project is ready, go to **Settings → API** and copy:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **Anon/Public Key** (starts with `eyJ...`)

3. Create a `.env.local` file in the `opencode` directory:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Run the Database Migration

1. In your Supabase dashboard, go to **SQL Editor**
2. Open the file `supabase/migrations/001_auth_and_profiles.sql`
3. Copy the entire SQL script and paste it into the SQL Editor
4. Click **Run** to execute the migration

This will:
- Create the `profiles` table
- Set up Row Level Security (RLS) policies
- Create a trigger to auto-create a profile when a user signs up
- Enforce username format constraints (lowercase, alphanumeric + `_` or `-`, 3–30 chars)

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

You'll be redirected to `/login`. Click **Sign up** to create your first account.

---

## Project Structure

```
opencode/
├── app/
│   ├── actions/
│   │   └── auth.ts              # Server actions for signup/login/logout
│   ├── api/
│   │   └── check-username/
│   │       └── route.ts         # API route for real-time username validation
│   ├── dashboard/
│   │   └── page.tsx             # Dashboard placeholder (Step 2+)
│   ├── login/
│   │   └── page.tsx             # Login page
│   ├── signup/
│   │   └── page.tsx             # Signup page with real-time username check
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Root page (redirects to /login)
│   └── globals.css              # Global styles
├── lib/
│   ├── supabase/
│   │   ├── client.ts            # Browser-side Supabase client
│   │   └── server.ts            # Server-side Supabase client
│   └── types.ts                 # Shared TypeScript types
├── supabase/
│   └── migrations/
│       └── 001_auth_and_profiles.sql  # Database schema for Step 1
├── middleware.ts                # Auth middleware (session refresh + route guards)
├── .env.local                   # Environment variables (not committed)
└── package.json
```

---

## How It Works

### Authentication Flow

1. **Signup:**
   - User enters email, password, and username
   - Username is validated in real-time via `/api/check-username`
   - On submit, `signUp()` server action creates the auth user
   - A database trigger (`handle_new_user()`) automatically creates a `profiles` row
   - User is redirected to `/dashboard`

2. **Login:**
   - User enters email and password
   - `logIn()` server action authenticates via Supabase Auth
   - User is redirected to `/dashboard`

3. **Protected Routes:**
   - Middleware (`middleware.ts`) runs on every request
   - Refreshes the Supabase session
   - Redirects unauthenticated users to `/login`
   - Redirects authenticated users away from `/login` and `/signup`

### Database Schema (Step 1)

**`profiles` table:**
- `id` (uuid, primary key, references `auth.users.id`)
- `username` (text, unique, lowercase, 3–30 chars, alphanumeric + `_` or `-`)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**Row Level Security (RLS):**
- Anyone can read profiles (needed for username lookup and invites)
- Users can only update their own profile
- Profile creation is handled by a trigger (not directly by the user)

---

## Next Steps

**Step 2 — Dashboard & Project Creation** (coming next):
- Dashboard shows all projects the user is a member of
- "+" button to create a new project
- Invite members by username and assign roles
- Inbox/notification system for project invites and pings

**Step 3 — AI Onboarding** (per user, per project):
- Onboarding form when entering a project for the first time
- Initialize a CrewAI agent for each user in each project
- "Away summary" feature (what changed while you were gone)

**Step 4 — Project Workspace** (3-section layout):
- AI Training page
- Collaborative Dev Environment (file tree + Monaco Editor + AI chat)
- Private Sticky Notes

---

## Tech Stack Details

### Why Qwen2.5-Coder-7B-Instruct?
- Open-source, code-focused LLM from Hugging Face Hub
- Optimized for code generation and understanding
- Runs efficiently on AMD Developer Cloud (ROCm-compatible)

### Why CrewAI?
- Enables multi-agent orchestration
- Each user's personal AI is a CrewAI agent with its own role, backstory, and goals
- Agents can delegate tasks to each other (cross-agent coordination)

### Why Supabase?
- Postgres database with built-in auth
- Row Level Security (RLS) for data privacy
- Realtime subscriptions for collaborative features
- Easy to deploy and scale

---

## Troubleshooting

### "Invalid login credentials" error
- Make sure you're using the correct email and password
- If you just signed up, check your email for a confirmation link (Supabase may require email confirmation depending on your project settings)

### Username validation not working
- Make sure the Supabase migration has been run
- Check the browser console for errors
- Verify that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set correctly in `.env.local`

### Build errors
- Run `npm install` to ensure all dependencies are installed
- Delete `.next` folder and rebuild: `rm -rf .next && npm run build`

---

## License

MIT

---

**Built for the AMD Developer Hackathon — LLMs All the Way**

import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Lock, Globe, FileVideo, Scissors, Activity, Users, CreditCard } from "lucide-react";

export const metadata: Metadata = {
  title: "API Documentation — ClipForge",
  description: "Integrate with the ClipForge API to upload videos, manage clips, and track processing jobs.",
};

interface Endpoint {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  description: string;
  auth?: boolean;
  body?: string;
}

interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  endpoints: Endpoint[];
}

const SECTIONS: Section[] = [
  {
    id: "videos",
    title: "Videos",
    icon: <FileVideo className="h-5 w-5" />,
    description: "Upload long-form videos, list them, manage captions, and trigger processing.",
    endpoints: [
      {
        method: "POST",
        path: "/api/v1/videos/presigned-upload?filename={name}",
        description: "Get a presigned URL to upload the source video directly to object storage.",
        auth: true,
      },
      {
        method: "POST",
        path: "/api/v1/videos",
        description: "Register a new video after the file has been uploaded to storage.",
        auth: true,
        body: "{ title, source_key, source_language, target_language, subtitle_*, audio_mode, voice }",
      },
      {
        method: "GET",
        path: "/api/v1/videos",
        description: "List all videos for the authenticated user.",
        auth: true,
      },
      {
        method: "POST",
        path: "/api/v1/videos/{video_id}/complete",
        description: "Mark the upload as complete and queue the split/processing job.",
        auth: true,
      },
      {
        method: "GET",
        path: "/api/v1/videos/{video_id}/clips",
        description: "List clips generated for a specific video.",
        auth: true,
      },
      {
        method: "GET",
        path: "/api/v1/videos/{video_id}/transcript",
        description: "Get the transcript/captions for a video.",
        auth: true,
      },
      {
        method: "PUT",
        path: "/api/v1/videos/{video_id}/transcript",
        description: "Update the transcript/captions for a video.",
        auth: true,
        body: "{ segments: [{ start, end, text }] }",
      },
      {
        method: "DELETE",
        path: "/api/v1/videos/{video_id}",
        description: "Delete a video and all its clips from storage and the database.",
        auth: true,
      },
    ],
  },
  {
    id: "clips",
    title: "Clips",
    icon: <Scissors className="h-5 w-5" />,
    description: "Manage generated vertical clips: download, edit timing, regenerate, or delete.",
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/clips/{clip_id}/download",
        description: "Get a temporary presigned download URL for a finished clip.",
        auth: true,
      },
      {
        method: "PATCH",
        path: "/api/v1/clips/{clip_id}",
        description: "Update a clip's start/end time and caption style.",
        auth: true,
        body: "{ start_time, end_time, subtitle_* }",
      },
      {
        method: "POST",
        path: "/api/v1/clips/{clip_id}/regenerate",
        description: "Re-process a clip with updated timing or caption settings.",
        auth: true,
      },
      {
        method: "DELETE",
        path: "/api/v1/clips/{clip_id}",
        description: "Delete a single clip from storage and the database.",
        auth: true,
      },
    ],
  },
  {
    id: "jobs",
    title: "Jobs",
    icon: <Activity className="h-5 w-5" />,
    description: "Track the status and progress of background processing jobs.",
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/jobs/{job_id}",
        description: "Get the current status, progress, and error message for a job.",
        auth: true,
      },
    ],
  },
  {
    id: "users",
    title: "Users",
    icon: <Users className="h-5 w-5" />,
    description: "Access the current user's profile and activity feed.",
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/users/me",
        description: "Get the current authenticated user.",
        auth: true,
      },
      {
        method: "GET",
        path: "/api/v1/users/me/activity?limit=20",
        description: "Get a combined feed of recent uploads and job updates.",
        auth: true,
      },
    ],
  },
  {
    id: "public",
    title: "Public",
    icon: <Globe className="h-5 w-5" />,
    description: "Unauthenticated endpoints for demos and public clip sharing.",
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/public/demo-clips?limit=3",
        description: "Return a small set of finished clips for landing-page demos.",
      },
      {
        method: "GET",
        path: "/api/v1/public/clips/{clip_id}",
        description: "Return a single finished clip for public sharing pages.",
      },
      {
        method: "POST",
        path: "/api/v1/waitlist",
        description: "Join the waitlist with an email address.",
        body: "{ email, source? }",
      },
    ],
  },
  {
    id: "billing",
    title: "Billing",
    icon: <CreditCard className="h-5 w-5" />,
    description: "Subscription portal and Paddle webhook handling.",
    endpoints: [
      {
        method: "POST",
        path: "/api/v1/billing/portal",
        description: "Create a Paddle customer portal session for self-service billing.",
        auth: true,
      },
      {
        method: "GET",
        path: "/api/v1/billing/subscription",
        description: "Get the current user's active subscription details.",
        auth: true,
      },
      {
        method: "POST",
        path: "/api/v1/billing/webhook",
        description: "Receive Paddle webhook events (subscription lifecycle, customer updates).",
      },
    ],
  },
];

const METHOD_STYLES: Record<Endpoint["method"], string> = {
  GET: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  POST: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
  PUT: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  PATCH: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  DELETE: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
};

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <h1 className="mt-6 text-3xl font-bold tracking-tight">ClipForge API</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Build integrations on top of ClipForge. Upload videos, manage clips, and track processing
          jobs programmatically.
        </p>

        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-lg font-semibold">Base URL</h2>
          <code className="mt-2 block rounded-lg bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-900">
            https://api.clipforge.app
          </code>
          <p className="mt-2 text-sm text-zinc-500">
            Local development uses{" "}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-900">http://localhost:8000</code>.
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Lock className="h-5 w-5 text-zinc-500" />
            Authentication
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Authenticated endpoints require a Clerk session token in the Authorization header:
          </p>
          <code className="mt-3 block rounded-lg bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-900">
            Authorization: Bearer {'<clerk-session-token>'}
          </code>
          <p className="mt-3 text-sm text-zinc-500">
            Use the <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-900">getToken()</code>{" "}
            helper from <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-900">@clerk/nextjs</code>{" "}
            on the client, or a valid Clerk JWT from your backend.
          </p>
        </div>

        <div className="mt-10 space-y-8">
          {SECTIONS.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex items-center gap-2">
                <span className="text-zinc-500">{section.icon}</span>
                <h2 className="text-lg font-semibold">{section.title}</h2>
              </div>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{section.description}</p>

              <div className="mt-4 space-y-3">
                {section.endpoints.map((endpoint, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-zinc-100 p-4 dark:border-zinc-800"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-semibold ${METHOD_STYLES[endpoint.method]}`}
                      >
                        {endpoint.method}
                      </span>
                      <code className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {endpoint.path}
                      </code>
                      {endpoint.auth && (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                          AUTH
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {endpoint.description}
                    </p>
                    {endpoint.body && (
                      <code className="mt-2 block rounded-lg bg-zinc-100 px-3 py-2 text-xs dark:bg-zinc-900">
                        Body: {endpoint.body}
                      </code>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-lg font-semibold">Response format</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Successful responses return JSON with the requested resource. Errors use standard HTTP
            status codes:
          </p>
          <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
            <li>
              <strong>400</strong> — Bad request (invalid payload or parameters)
            </li>
            <li>
              <strong>401</strong> — Unauthorized (missing or invalid token)
            </li>
            <li>
              <strong>404</strong> — Resource not found
            </li>
            <li>
              <strong>500</strong> — Internal server error
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

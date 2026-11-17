import type {
  FullUserProfile,
  User,
  MemorySpace,
  MediaItem,
  CampusSpot,
  SpaceMember,
  MemberRole,
  Reaction,
  Comment,
  MediaTag,
  NotificationItem,
  DBMSInspectData,
  ReactionType,
} from "../types";
import type { demoApi } from "./api";

export async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: "same-origin",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Cannot reach the API. Start MySQL and run npm run dev.");
  }
  const data = await res.json().catch(() => ({
    message: "API is unavailable. Check the server terminal.",
  }));
  if (!res.ok)
    throw Object.assign(new Error(data.message || "Request failed"), {
      status: res.status,
    });
  return normalize(data) as T;
}
// MySQL DATETIME values are stored as UTC, and booleans arrive as 0/1.
function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => {
        if (["is_time_locked", "is_read"].includes(key)) return [key, !!item];
        if (
          typeof item === "string" &&
          /(_at|_date)$/.test(key) &&
          /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(item)
        )
          return [key, item.replace(" ", "T") + "Z"];
        return [key, normalize(item)];
      }),
    );
  return value;
}
export const sessionApi = {
  me: () => request<FullUserProfile>("/auth/me"),
  logout: () => request("/auth/logout", "POST"),
  health: () => request<{ status: string; database: string }>("/health"),
};
export const liveApi: Omit<typeof demoApi, "getDBMSMeta"> & {
  getDBMSMeta: (
    type: "space" | "media" | "user" | "comment",
    id: number,
  ) => Promise<DBMSInspectData>;
} = {
  login: (email, password) =>
    request("/auth/login", "POST", { email, password }),
  register: (userData, specialized) =>
    request("/auth/register", "POST", { ...userData, ...specialized }),
  getUserProfile: (id) => request<FullUserProfile>(`/users/${id}`),
  updateProfile: (id, data) => request(`/users/${id}`, "PATCH", data),
  getAllUsers: () => request<User[]>("/users"),
  getCampusSpots: () => request<CampusSpot[]>("/spots"),
  getCampusSpotById: (id) => request(`/spots/${id}`),
  getMemorySpaces: () => request<MemorySpace[]>("/spaces"),
  getMemorySpaceById: (id) => request(`/spaces/${id}`),
  createMemorySpace: (_creatorId, data) =>
    request("/spaces", "POST", {
      ...data,
      unlock_date: data.unlock_date
        ? new Date(data.unlock_date).toISOString()
        : null,
    }),
  updateMemorySpace: (id, data) => request(`/spaces/${id}`, "PATCH", data),
  deleteMemorySpace: (id) => request(`/spaces/${id}`, "DELETE"),
  getSpaceMembers: (id) =>
    request<(SpaceMember & { user: FullUserProfile })[]>(
      `/spaces/${id}/members`,
    ),
  getUserSpaces: (id) =>
    request<(MemorySpace & { user_role: MemberRole })[]>(`/users/${id}/spaces`),
  addSpaceMember: (sid, uid, role) =>
    request(`/spaces/${sid}/members`, "POST", { user_id: uid, role }),
  removeSpaceMember: (sid, uid) =>
    request(`/spaces/${sid}/members/${uid}`, "DELETE"),
  getAllMedia: () => request<MediaItem[]>("/media"),
  getMediaBySpaceId: (id) => request<MediaItem[]>(`/spaces/${id}/media`),
  getMediaById: (id) => request(`/media/${id}`),
  addMediaItem: (sid, _uid, data) =>
    request(`/spaces/${sid}/media`, "POST", data),
  deleteMediaItem: (id) => request(`/media/${id}`, "DELETE"),
  getMediaTags: (id) =>
    request<(MediaTag & { user: FullUserProfile })[]>(`/media/${id}/tags`),
  tagUser: (mid, uid) => request(`/media/${mid}/tags`, "POST", { userId: uid }),
  removeTag: (mid, uid) => request(`/media/${mid}/tags/${uid}`, "DELETE"),
  getMediaReactions: (id) => request<Reaction[]>(`/media/${id}/reactions`),
  toggleReaction: (mid, _uid, type: ReactionType) =>
    request(`/media/${mid}/reactions`, "POST", { type }),
  getMediaComments: (id) =>
    request<(Comment & { user: FullUserProfile })[]>(`/media/${id}/comments`),
  addComment: (mid, _uid, text) =>
    request(`/media/${mid}/comments`, "POST", { text }),
  deleteComment: (mid, no) => request(`/media/${mid}/comments/${no}`, "DELETE"),
  getNotifications: (_uid) => request<NotificationItem[]>("/notifications"),
  markNotificationAsRead: (id) => request(`/notifications/${id}/read`, "PATCH"),
  markAllNotificationsAsRead: (_uid) =>
    request("/notifications/read-all", "PATCH"),
  getGlobalStats: () => request("/stats"),
  getDBMSMeta: (type, id) => request(`/inspect/${type}/${id}`),
  resetDemoDatabase: () => {
    throw new Error(
      "MySQL reset requires the explicit npm run db:reset command.",
    );
  },
};
export function uploadMemory(
  spaceId: number,
  file: File,
  caption: string,
  tags: number[],
  meta: { width?: number; height?: number; duration_seconds?: number },
  onProgress: (percent: number) => void,
): Promise<MediaItem> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    form.append("caption", caption);
    form.append("tags", JSON.stringify(tags));
    form.append(
      "photo_meta",
      JSON.stringify({ width: meta.width, height: meta.height }),
    );
    form.append(
      "video_meta",
      JSON.stringify({ duration_seconds: meta.duration_seconds }),
    );
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/spaces/${spaceId}/upload`);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300)
          resolve(normalize(body) as MediaItem);
        else reject(new Error(body.message || "Upload failed"));
      } catch {
        reject(new Error("Upload failed. Check the API server."));
      }
    };
    xhr.onerror = () => reject(new Error("Upload connection interrupted"));
    xhr.send(form);
  });
}

export async function uploadAvatar(
  file: File,
  updates: Partial<User>,
): Promise<FullUserProfile> {
  const body = new FormData();
  body.append("file", file);
  body.append("profile", JSON.stringify(updates));
  const response = await fetch("/api/profile/avatar", {
    method: "POST",
    body,
    credentials: "same-origin",
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.message || "Could not upload profile photo");
  return normalize(data) as FullUserProfile;
}

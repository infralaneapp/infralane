"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/formatters";

type Notification = {
  id: string;
  title: string;
  message: string;
  href: string | null;
  read: boolean;
  createdAt: string;
};

type NotificationResponse = {
  data: {
    notifications: Notification[];
    unreadCount: number;
  };
};

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const json: NotificationResponse = await res.json();
      setNotifications(json.data.notifications);
      setUnreadCount(json.data.unreadCount);
    } catch {
      // silently ignore fetch errors
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10_000);

    function onFocus() {
      fetchNotifications();
    }

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") fetchNotifications();
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchNotifications]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function handleMarkAllRead() {
    try {
      await fetch("/api/notifications", { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // silently ignore
    }
  }

  async function handleNotificationClick(notification: Notification) {
    setOpen(false);
    if (!notification.read) {
      setNotifications((prev) => prev.map((n) => n.id === notification.id ? { ...n, read: true } : n));
      setUnreadCount((c) => Math.max(0, c - 1));
      fetch(`/api/notifications/${notification.id}`, { method: "PATCH" }).catch(() => {});
    }
    if (notification.href) {
      router.push(notification.href);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Notifications"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold tracking-heading text-foreground">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <CheckCheck className="size-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No notifications yet.
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`flex w-full flex-col gap-0.5 border-b border-border px-4 py-3 text-left transition-colors last:border-0 hover:bg-muted/50 ${
                    !notification.read ? "bg-muted/30" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`text-sm font-medium ${
                        notification.read ? "text-muted-foreground" : "text-foreground"
                      }`}
                    >
                      {notification.title}
                    </span>
                    {!notification.read && (
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-blue-500" />
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {notification.message}
                  </span>
                  <span className="text-[11px] text-muted-foreground/70">
                    {formatRelativeTime(notification.createdAt)}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

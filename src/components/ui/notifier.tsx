"use client";

import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  Info,
  X,
  ArrowRight,
} from "lucide-react";
import {
  useNotificationStore,
  NotificationItem,
  NotificationType,
} from "@/stores/notification-store";

interface ThemeConfig {
  icon: React.ReactNode;
  iconColor: string;
  progressColor: string;
  accentBorder: string;
}

const THEME_STYLES: Record<NotificationType, ThemeConfig> = {
  success: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    iconColor: "text-emerald-600 dark:text-emerald-400",
    progressColor: "bg-emerald-600 dark:bg-emerald-500",
    accentBorder: "border-l-emerald-600 dark:border-l-emerald-500",
  },
  error: {
    icon: <AlertOctagon className="h-4 w-4" />,
    iconColor: "text-rose-600 dark:text-rose-400",
    progressColor: "bg-rose-600 dark:bg-rose-500",
    accentBorder: "border-l-rose-600 dark:border-l-rose-500",
  },
  warning: {
    icon: <AlertTriangle className="h-4 w-4" />,
    iconColor: "text-amber-600 dark:text-amber-400",
    progressColor: "bg-amber-600 dark:bg-amber-500",
    accentBorder: "border-l-amber-600 dark:border-l-amber-500",
  },
  info: {
    icon: <Info className="h-4 w-4" />,
    iconColor: "text-sky-600 dark:text-sky-400",
    progressColor: "bg-sky-600 dark:bg-sky-500",
    accentBorder: "border-l-sky-600 dark:border-l-sky-500",
  },
};

function NotificationCard({
  item,
  onDismiss,
}: {
  item: NotificationItem;
  onDismiss: () => void;
}) {
  const theme = THEME_STYLES[item.type] || THEME_STYLES.info;
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!item.duration || item.duration <= 0) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / item.duration!) * 100);
      setProgress(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        onDismiss();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [item.duration, onDismiss]);

  return (
    <div
      role="alert"
      className={`pointer-events-auto relative w-full max-w-[360px] bg-card text-card-foreground border border-border border-l-[3.5px] rounded-lg p-3 shadow-lg shadow-black/5 dark:shadow-black/25 flex items-start gap-2.5 transition-all duration-200 animate-in slide-in-from-bottom-2 fade-in-0 ${theme.accentBorder}`}
    >
      {/* Status Icon */}
      <div className={`shrink-0 mt-0.5 ${theme.iconColor}`}>
        {theme.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-xs font-semibold text-foreground leading-snug">
            {item.title}
          </p>
          {item.code && (
            <span className="font-mono text-[9.5px] text-muted-foreground bg-muted/80 px-1 py-0.2 rounded border border-border/50">
              {item.code}
            </span>
          )}
        </div>

        {item.reason && (
          <p className="text-[11.5px] text-muted-foreground leading-normal mt-0.5">
            {item.reason}
          </p>
        )}

        {item.action && (
          <button
            type="button"
            onClick={() => {
              item.action?.onClick();
              onDismiss();
            }}
            className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
          >
            <span>{item.action.label}</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Dismiss Button */}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        title="Dismiss notification"
        className="p-1 -mr-1 -mt-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer shrink-0"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {/* Progress Line */}
      {item.duration && item.duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-muted/40 overflow-hidden rounded-b-lg">
          <div
            className={`h-full transition-all linear duration-75 ${theme.progressColor}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Global Notifier Container placed unobtrusively at the bottom-right corner.
 */
export function CentralNotifier() {
  const notifications = useNotificationStore((s) => s.notifications);
  const removeNotification = useNotificationStore((s) => s.removeNotification);

  if (notifications.length === 0) return null;

  return (
    <aside
      aria-live="polite"
      aria-label="System notifications"
      className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2 max-w-[360px] w-[calc(100vw-2.5rem)] pointer-events-none"
    >
      {notifications.map((item) => (
        <NotificationCard
          key={item.id}
          item={item}
          onDismiss={() => removeNotification(item.id)}
        />
      ))}
    </aside>
  );
}


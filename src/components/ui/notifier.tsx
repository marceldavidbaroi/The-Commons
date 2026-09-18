"use client";

import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  Sparkles,
  X,
  ArrowRight,
} from "lucide-react";
import { useNotificationStore, NotificationItem, NotificationType } from "@/stores/notification-store";
import { CommonsSealVector } from "@/components/brand/logo";

const THEME_STYLES: Record<
  NotificationType,
  {
    kicker: string;
    kickerColor: string;
    borderColor: string;
    iconBg: string;
    iconColor: string;
    icon: React.ReactNode;
  }
> = {
  success: {
    kicker: "§ CONFIRMED",
    kickerColor: "text-emerald-700 dark:text-emerald-400 border-emerald-600/30 bg-emerald-600/10",
    borderColor: "border-emerald-600/40 dark:border-emerald-500/40 shadow-emerald-950/10",
    iconBg: "bg-emerald-600/15 border-emerald-600/30",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
  },
  error: {
    kicker: "§ SYSTEM NOTICE",
    kickerColor: "text-[#8C3A27] dark:text-[#E59375] border-[#8C3A27]/30 bg-[#8C3A27]/10",
    borderColor: "border-[#8C3A27]/50 dark:border-[#D94A4A]/50 shadow-red-950/10",
    iconBg: "bg-[#8C3A27]/15 border-[#8C3A27]/30",
    iconColor: "text-[#8C3A27] dark:text-[#E59375]",
    icon: <AlertOctagon className="h-4 w-4 text-[#8C3A27] dark:text-[#E59375]" />,
  },
  warning: {
    kicker: "§ ATTENTION",
    kickerColor: "text-amber-700 dark:text-amber-400 border-amber-600/30 bg-amber-500/10",
    borderColor: "border-amber-600/40 dark:border-amber-500/40 shadow-amber-950/10",
    iconBg: "bg-amber-500/15 border-amber-500/30",
    iconColor: "text-amber-600 dark:text-amber-400",
    icon: <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
  },
  info: {
    kicker: "§ DISPATCH",
    kickerColor: "text-[#3368A0] dark:text-[#66A3BF] border-[#3368A0]/30 bg-[#3368A0]/10",
    borderColor: "border-[#3368A0]/40 dark:border-[#66A3BF]/40 shadow-sky-950/10",
    iconBg: "bg-[#3368A0]/15 border-[#3368A0]/30",
    iconColor: "text-[#3368A0] dark:text-[#66A3BF]",
    icon: <Sparkles className="h-4 w-4 text-[#3368A0] dark:text-[#66A3BF]" />,
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
      className={`pointer-events-auto relative w-full max-w-md bg-card dark:bg-[#152232] border rounded-xl p-3.5 sm:p-4 shadow-xl flex items-start gap-3 transition-all duration-300 transform animate-in slide-in-from-bottom-5 fade-in-0 ${theme.borderColor}`}
    >
      {/* Icon Badge */}
      <div
        className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${theme.iconBg}`}
      >
        {theme.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-2 space-y-1">
        <div className="flex items-center gap-2">
          <span
            className={`font-mono text-[9.5px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border leading-none ${theme.kickerColor}`}
          >
            {theme.kicker}
          </span>
          {item.code && (
            <span className="font-mono text-[9px] text-muted-foreground/80">
              [{item.code}]
            </span>
          )}
        </div>

        <h4 className="font-serif text-sm font-bold text-foreground leading-snug">
          {item.title}
        </h4>

        {item.reason && (
          <p className="font-serif italic text-xs text-muted-foreground leading-relaxed">
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
            className="mt-1.5 inline-flex items-center gap-1 font-serif text-xs font-semibold text-[#3368A0] dark:text-[#66A3BF] hover:underline cursor-pointer"
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
        title="Dismiss notification"
        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer shrink-0 mt-0.5"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {/* Progress Line */}
      {item.duration && item.duration > 0 && (
        <div className="absolute bottom-0 left-3 right-3 h-[2px] bg-muted overflow-hidden rounded-full">
          <div
            className={`h-full transition-all linear duration-75 ${
              item.type === "success"
                ? "bg-emerald-500"
                : item.type === "error"
                ? "bg-[#8C3A27] dark:bg-[#D94A4A]"
                : item.type === "warning"
                ? "bg-amber-500"
                : "bg-[#3368A0]"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Global Notifier Container placed at the bottom-center of the viewport.
 */
export function CentralNotifier() {
  const notifications = useNotificationStore((s) => s.notifications);
  const removeNotification = useNotificationStore((s) => s.removeNotification);

  if (notifications.length === 0) return null;

  return (
    <aside
      aria-live="polite"
      aria-label="System notifications"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2.5 max-w-md w-full px-4 pointer-events-none"
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

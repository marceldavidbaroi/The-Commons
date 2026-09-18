import { useNotificationStore, NotificationType, NotificationAction } from "@/stores/notification-store";

export interface NotifyOptions {
  reason?: string;
  code?: string;
  duration?: number;
  action?: NotificationAction;
}

/**
 * Extracts a human-friendly title, reason, and error code from unknown errors.
 */
function parseErrorPayload(
  titleOrError: unknown,
  customReason?: string,
  options?: NotifyOptions
): { title: string; reason?: string; code?: string } {
  if (typeof titleOrError === "string") {
    return {
      title: titleOrError,
      reason: customReason || options?.reason,
      code: options?.code,
    };
  }

  if (titleOrError instanceof Error) {
    const errObj = titleOrError as any;
    const code = errObj.code || options?.code;
    const message = errObj.message || "An unexpected system error occurred.";

    // Provide tailored human-friendly headlines for common Supabase/Auth/DB issues
    let headline = "Operation Incomplete";
    let explanation = customReason || message;

    if (message.includes("Not authenticated") || code === "UNAUTHENTICATED") {
      headline = "Sanctuary Clearance Required";
      explanation = "Your active session has expired or requires authentication.";
    } else if (message.includes("violates foreign key") || message.includes("profiles")) {
      headline = "Profile Synchronization Failed";
      explanation = "Your citizen profile could not be verified against the ledger.";
    } else if (message.includes("unique constraint") || message.includes("already taken")) {
      headline = "Record Already Exists";
      explanation = "A volume or handle with these specifications is already inscribed.";
    } else if (message.includes("Failed to fetch") || message.includes("NetworkError")) {
      headline = "Connection Interrupted";
      explanation = "Could not reach the database. Please check your internet connection.";
    }

    return {
      title: headline,
      reason: explanation,
      code,
    };
  }

  return {
    title: "System Exception",
    reason: customReason || "An unspecified error occurred.",
    code: options?.code,
  };
}

export const notify = {
  success: (title: string, reason?: string, options?: NotifyOptions): string => {
    return useNotificationStore.getState().addNotification({
      type: "success",
      title,
      reason,
      code: options?.code,
      duration: options?.duration,
      action: options?.action,
    });
  },

  error: (titleOrError: unknown, reason?: string, options?: NotifyOptions): string => {
    const parsed = parseErrorPayload(titleOrError, reason, options);
    return useNotificationStore.getState().addNotification({
      type: "error",
      title: parsed.title,
      reason: parsed.reason,
      code: parsed.code,
      duration: options?.duration,
      action: options?.action,
    });
  },

  warning: (title: string, reason?: string, options?: NotifyOptions): string => {
    return useNotificationStore.getState().addNotification({
      type: "warning",
      title,
      reason,
      code: options?.code,
      duration: options?.duration,
      action: options?.action,
    });
  },

  info: (title: string, reason?: string, options?: NotifyOptions): string => {
    return useNotificationStore.getState().addNotification({
      type: "info",
      title,
      reason,
      code: options?.code,
      duration: options?.duration,
      action: options?.action,
    });
  },

  dismiss: (id: string): void => {
    useNotificationStore.getState().removeNotification(id);
  },

  clearAll: (): void => {
    useNotificationStore.getState().clearAll();
  },
};

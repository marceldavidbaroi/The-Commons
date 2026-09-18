import { create } from "zustand";

export type NotificationType = "success" | "error" | "warning" | "info";

export interface NotificationAction {
  label: string;
  onClick: () => void;
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  reason?: string;
  code?: string;
  duration?: number; // ms, default 4500, 0 for persistent
  action?: NotificationAction;
  createdAt: number;
}

export interface NotificationStoreState {
  notifications: NotificationItem[];
  addNotification: (notification: Omit<NotificationItem, "id" | "createdAt">) => string;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

export const useNotificationStore = create<NotificationStoreState>((set) => ({
  notifications: [],

  addNotification: (notification) => {
    const id = generateId();
    const item: NotificationItem = {
      ...notification,
      id,
      duration: notification.duration ?? (notification.type === "error" ? 6000 : 4500),
      createdAt: Date.now(),
    };

    set((state) => {
      // Keep maximum 3 notifications simultaneously to avoid screen clutter
      const current = state.notifications.slice(-2);
      return { notifications: [...current, item] };
    });

    return id;
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  clearAll: () => set({ notifications: [] }),
}));

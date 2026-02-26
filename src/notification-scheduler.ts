export class NotificationScheduler {
  scheduleNext(dueDate: Date, cardCount: number): void {
    const sw = navigator.serviceWorker?.controller;
    if (!sw) return;

    sw.postMessage({
      type: "SCHEDULE_NOTIFICATION",
      dueDate: dueDate.toISOString(),
      cardCount,
    });
  }

  cancel(): void {
    const sw = navigator.serviceWorker?.controller;
    if (!sw) return;

    sw.postMessage({ type: "CANCEL_NOTIFICATION" });
  }

  async requestPermission(): Promise<NotificationPermission> {
    return Notification.requestPermission();
  }

  get permission(): NotificationPermission {
    return Notification.permission;
  }

  get isSupported(): boolean {
    return "Notification" in globalThis && "serviceWorker" in navigator;
  }
}

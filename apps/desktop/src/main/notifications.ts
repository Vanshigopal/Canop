import { Notification } from 'electron';

// Native OS notification — Toast on Windows, Banner on macOS,
// libnotify popup on Linux (requires notification daemon, which most
// modern desktops have running).

export function showNativeNotification(title: string, body: string): void {
  if (!Notification.isSupported()) return;

  const notification = new Notification({
    title,
    body,
    silent: false,
  });

  notification.show();
}

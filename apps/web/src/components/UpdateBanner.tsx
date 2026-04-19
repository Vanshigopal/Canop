import { useEffect, useState } from "react";
import { electron, isElectron } from "@/lib/platform";

// Renders a floating "Update ready" pill in the bottom-right corner when the
// Electron auto-updater has downloaded a new version. Only mounts in Electron.
// Reload restarts the app — electron-updater installs the update on quit.

export function UpdateBanner() {
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);

  useEffect(() => {
    if (!isElectron || !electron) return;
    const off = electron.onUpdateDownloaded((version: string) => {
      setUpdateVersion(version);
    });
    return off;
  }, []);

  if (!updateVersion) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-2xl px-4 py-3 shadow-lg"
      style={{
        background: "#E0E0FF",
        border: "1px solid #4F46E5",
        color: "#0F0066",
      }}
    >
      <span className="text-sm font-medium">Update v{updateVersion} ready</span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-full px-3 py-1 text-sm font-medium"
        style={{ background: "#4F46E5", color: "white" }}
      >
        Restart
      </button>
    </div>
  );
}

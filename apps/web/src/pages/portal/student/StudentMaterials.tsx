import { Download, FileText, Image as ImageIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { api } from "@/lib/api";
import {
  Empty,
  PortalSkeleton,
  SectionHeader,
} from "@/components/portal/PortalPrimitives";

interface MaterialRow {
  id: string;
  title: string;
  description: string | null;
  fileName: string;
  fileSize: number;
  type: "PDF" | "DOCX" | "PPT" | "IMAGE" | "OTHER";
  subject: { id: string; name: string } | null;
  createdAt: string;
}

function fmtSize(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function iconFor(type: MaterialRow["type"]) {
  if (type === "IMAGE") return ImageIcon;
  return FileText;
}

function colorFor(type: MaterialRow["type"]) {
  switch (type) {
    case "PDF":
      return { bg: "#FEE2E2", fg: "#DC2626" };
    case "DOCX":
      return { bg: "#DBEAFE", fg: "#1E40AF" };
    case "PPT":
      return { bg: "#FED7AA", fg: "#C2410C" };
    case "IMAGE":
      return { bg: "#DCFCE7", fg: "#15803D" };
    default:
      return { bg: "#E8E3DA", fg: "#5F5E5A" };
  }
}

export function StudentMaterials() {
  const [items, setItems] = useState<MaterialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/api/v1/materials");
      setItems(data.data ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useSocket("material:created", load);
  useSocket("material:deleted", load);

  const download = async (m: MaterialRow) => {
    try {
      const { data } = await api.get(`/api/v1/materials/${m.id}/download`);
      const url = data.data?.url;
      if (url) {
        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener";
        a.download = m.fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      await api.post(`/api/v1/materials/${m.id}/view`).catch(() => {});
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Download failed");
      setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader title="Materials" />

      {toast && (
        <div
          className="glass-panel p-3 text-sm font-medium"
          style={{ color: "#7F1D1D", backgroundColor: "#FEE2E2" }}
        >
          {toast}
        </div>
      )}

      {loading && items.length === 0 ? (
        <div className="flex flex-col gap-2">
          <PortalSkeleton height={72} />
          <PortalSkeleton height={72} />
        </div>
      ) : items.length === 0 ? (
        <Empty
          icon={<FileText size={20} />}
          title="No materials yet"
          body="Study material from your teachers will appear here."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((m) => {
            const Icon = iconFor(m.type);
            const c = colorFor(m.type);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => download(m)}
                className="glass-panel p-4 flex items-center gap-3 text-left transition-transform active:scale-[0.99]"
                style={{ minHeight: 72 }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: c.bg, color: c.fg }}
                >
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "#2C2C2A" }}>
                    {m.title}
                  </p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: "#6B6A66" }}>
                    {m.subject?.name ?? "—"} · {m.type} · {fmtSize(m.fileSize)}
                  </p>
                </div>
                <Download size={16} color="#4F46E5" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

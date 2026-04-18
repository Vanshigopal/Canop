import { useAuthStore } from "@/stores/auth";
import { Badge, Button } from "@/components/primitives";
import { useSocket } from "@/hooks/useSocket";
import { api } from "@/lib/api";
import {
  Download,
  FileText,
  Image as ImageIcon,
  File,
  FileSpreadsheet,
  FolderOpen,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { UploadMaterialModal } from "./UploadMaterialModal";

type MaterialType = "PDF" | "DOCX" | "PPT" | "IMAGE" | "OTHER";
type AccessType = "BATCH" | "SUBJECT" | "INSTITUTE";

interface Material {
  id: string;
  title: string;
  description: string | null;
  materialType: MaterialType;
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  chapterNumber: number | null;
  chapterTitle: string | null;
  accessType: AccessType;
  viewCount: number;
  downloadCount: number;
  createdAt: string;
  subject: { id: string; name: string } | null;
  uploadedBy: { id: string; name: string };
  batchAccess: Array<{ batch: { id: string; name: string } }>;
  _count?: { accessLogs: number };
}

const TYPE_ICON: Record<MaterialType, typeof FileText> = {
  PDF: FileText,
  DOCX: File,
  PPT: FileSpreadsheet,
  IMAGE: ImageIcon,
  OTHER: File,
};

const TYPE_TONE: Record<MaterialType, "accent" | "info" | "warning" | "success" | "neutral"> = {
  PDF: "accent",
  DOCX: "info",
  PPT: "warning",
  IMAGE: "success",
  OTHER: "neutral",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MaterialsPage() {
  const user = useAuthStore((s) => s.user);
  const isStudent = user?.role === "STUDENT";
  const canManage = user?.role === "ADMIN" || user?.role === "TEACHER";

  const [materials, setMaterials] = useState<Material[]>([]);
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [toast, setToast] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (subjectFilter) params.subjectId = subjectFilter;
    if (search) params.search = search;
    api
      .get("/api/v1/materials", { params })
      .then((r) => setMaterials(r.data.data as Material[]))
      .catch(() => setMaterials([]))
      .finally(() => setLoading(false));
  }, [subjectFilter, search]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api
      .get("/api/v1/subjects")
      .then((r) => setSubjects(r.data.data))
      .catch(() => setSubjects([]));
  }, []);

  useSocket<{ materialId: string }>("material:created", load);
  useSocket<{ materialId: string }>("material:deleted", load);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  async function download(m: Material) {
    try {
      const r = await api.get(`/api/v1/materials/${m.id}/download`);
      const url = r.data.data.downloadUrl as string;
      const fullUrl = url.startsWith("http")
        ? url
        : `${import.meta.env.VITE_API_URL || "http://localhost:3001"}${url}`;

      if (isStudent) {
        await api.post(`/api/v1/materials/${m.id}/view`);
      }

      const link = document.createElement("a");
      link.href = fullUrl;
      link.download = m.fileName;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setToast("Download started");
    } catch {
      setToast("Download failed");
    }
  }

  async function remove(m: Material) {
    if (!confirm(`Delete "${m.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/v1/materials/${m.id}`);
      setToast("Deleted");
      load();
    } catch {
      setToast("Delete failed");
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl tracking-tight">Materials</h1>
          <p className="text-text-muted text-sm mt-1">
            Study PDFs, notes, and documents organized by subject and chapter
          </p>
        </div>
        {canManage && (
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus size={14} />}
            onClick={() => setUploadOpen(true)}
          >
            Upload Material
          </Button>
        )}
      </div>

      <div className="flex gap-3 flex-wrap mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim"
          />
          <input
            type="text"
            placeholder="Search materials..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-md border border-border-soft bg-white/92 text-sm"
          />
        </div>
        <select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="text-sm rounded-md border border-border-soft bg-white/92 px-3 py-2"
        >
          <option value="">All subjects</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="text-center text-text-dim text-xs py-12">Loading materials...</div>
      )}

      {!loading && materials.length === 0 && (
        <div className="glass-panel text-center py-16">
          <FolderOpen size={32} className="mx-auto text-text-dim mb-3" />
          <p className="text-sm text-text-muted">No materials yet</p>
          {canManage && (
            <p className="text-xs text-text-dim mt-1">Upload PDFs, notes, or presentations.</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {materials.map((m) => {
          const Icon = TYPE_ICON[m.materialType];
          return (
            <div key={m.id} className="glass-panel p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="shrink-0 w-10 h-10 rounded-lg bg-surface-hover flex items-center justify-center">
                  <Icon size={18} className="text-text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{m.title}</div>
                  {m.description && (
                    <div className="text-xs text-text-muted line-clamp-2 mt-0.5">
                      {m.description}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap mb-3">
                <Badge tone={TYPE_TONE[m.materialType]}>{m.materialType}</Badge>
                {m.subject && <Badge tone="neutral">{m.subject.name}</Badge>}
                {m.chapterNumber && (
                  <Badge tone="info">Ch. {m.chapterNumber}</Badge>
                )}
              </div>

              <div className="text-xs text-text-dim space-y-1 mb-3">
                <div>Size: {formatBytes(m.fileSize)}</div>
                <div>Uploaded: {new Date(m.createdAt).toLocaleDateString()}</div>
                {!isStudent && (
                  <div>
                    {m.viewCount} views · {m.downloadCount} downloads
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Download size={13} />}
                  onClick={() => download(m)}
                  className="flex-1"
                >
                  Download
                </Button>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => remove(m)}
                    title="Delete"
                    className="p-2 rounded-md hover:bg-surface-hover text-text-dim hover:text-danger"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {uploadOpen && (
        <UploadMaterialModal
          subjects={subjects}
          onClose={() => setUploadOpen(false)}
          onUploaded={() => {
            setUploadOpen(false);
            setToast("Uploaded");
            load();
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 rounded-md bg-text-primary text-white text-xs px-4 py-2.5 shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

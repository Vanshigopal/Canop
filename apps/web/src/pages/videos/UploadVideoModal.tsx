import { Button } from "@/components/primitives";
import { api } from "@/lib/api";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

interface Batch {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
}

interface UploadVideoModalProps {
  subjects: Subject[];
  onClose: () => void;
  onUploaded: () => void;
}

export function UploadVideoModal({ subjects, onClose, onUploaded }: UploadVideoModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [chapterNumber, setChapterNumber] = useState("");
  const [chapterTitle, setChapterTitle] = useState("");
  const [accessType, setAccessType] = useState<"BATCH" | "INSTITUTE">("BATCH");
  const [batchIds, setBatchIds] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/api/v1/batches")
      .then((r) => setBatches(r.data.data as Batch[]))
      .catch(() => setBatches([]));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!file) {
      setError("Please select a video file");
      return;
    }
    if (!title.trim()) {
      setError("Title required");
      return;
    }

    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", title);
    if (description) fd.append("description", description);
    if (subjectId) fd.append("subjectId", subjectId);
    if (chapterNumber) fd.append("chapterNumber", chapterNumber);
    if (chapterTitle) fd.append("chapterTitle", chapterTitle);
    fd.append("accessType", accessType);
    if (accessType === "BATCH" && batchIds.length > 0) {
      fd.append("batchIds", batchIds.join(","));
    }

    setUploading(true);
    setProgress(0);
    try {
      await api.post("/api/v1/videos", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 5 * 60 * 1000,
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      onUploaded();
    } catch (err) {
      const axiosErr = err as { response?: { data?: { error?: { title?: string } } } };
      setError(axiosErr.response?.data?.error?.title ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <form
        onSubmit={submit}
        className="bg-surface rounded-xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-5 border-b border-border-soft">
          <h2 className="font-display text-lg">Upload Video</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded hover:bg-surface-hover text-text-dim"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">
              Video file *
            </label>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm"
            />
            {file && (
              <div className="text-xs text-text-dim mt-1">
                {file.name} ({(file.size / (1024 * 1024)).toFixed(1)} MB)
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              className="w-full px-3 py-2 rounded-md border border-border-soft bg-white/92 text-sm"
              placeholder="e.g. Chemical Bonding — Introduction"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              rows={2}
              className="w-full px-3 py-2 rounded-md border border-border-soft bg-white/92 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Subject</label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border-soft bg-white/92 text-sm"
              >
                <option value="">—</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Chapter #</label>
              <input
                type="number"
                min="1"
                value={chapterNumber}
                onChange={(e) => setChapterNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border-soft bg-white/92 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Chapter title</label>
            <input
              type="text"
              value={chapterTitle}
              onChange={(e) => setChapterTitle(e.target.value)}
              maxLength={200}
              className="w-full px-3 py-2 rounded-md border border-border-soft bg-white/92 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Access</label>
            <select
              value={accessType}
              onChange={(e) => setAccessType(e.target.value as "BATCH" | "INSTITUTE")}
              className="w-full px-3 py-2 rounded-md border border-border-soft bg-white/92 text-sm"
            >
              <option value="BATCH">Selected batches</option>
              <option value="INSTITUTE">Everyone at institute</option>
            </select>
          </div>

          {accessType === "BATCH" && (
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Batches</label>
              <div className="space-y-1 max-h-40 overflow-y-auto border border-border-soft rounded-md p-2">
                {batches.map((b) => (
                  <label key={b.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={batchIds.includes(b.id)}
                      onChange={(e) => {
                        if (e.target.checked) setBatchIds([...batchIds, b.id]);
                        else setBatchIds(batchIds.filter((id) => id !== b.id));
                      }}
                    />
                    {b.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          {uploading && (
            <div>
              <div className="h-1.5 bg-surface-hover rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-xs text-text-dim mt-1">
                Uploading... {progress}% (then transcoding)
              </div>
            </div>
          )}

          {error && <div className="text-xs text-danger">{error}</div>}
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-border-soft">
          <Button variant="ghost" size="sm" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={uploading}>
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </div>
      </form>
    </div>
  );
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Badge, Button, Card } from "@/components/primitives";
import { api } from "@/lib/api";

interface Subject {
  id: string;
  name: string;
  code: string | null;
}

interface ClassRow {
  id: string;
  name: string;
  orderIndex: number;
  subjects?: Subject[];
  batchCount?: number;
}

export function ClassesSettingsPage() {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [newClassOpen, setNewClassOpen] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [addingSubjectFor, setAddingSubjectFor] = useState<string | null>(null);
  const [newSubjectInput, setNewSubjectInput] = useState("");

  const { data: classes, isLoading: loadingClasses } = useQuery<ClassRow[]>({
    queryKey: ["classes", "with-subjects"],
    queryFn: () =>
      api.get("/api/v1/classes?includeSubjects=true").then((r) => r.data.data),
  });

  const { data: subjects } = useQuery<Subject[]>({
    queryKey: ["subjects"],
    queryFn: () => api.get("/api/v1/subjects?pageSize=100").then((r) => r.data.data),
  });

  const createClass = useMutation({
    mutationFn: (name: string) => api.post("/api/v1/classes", { name }),
    onSuccess: () => {
      setNewClassName("");
      setNewClassOpen(false);
      setError(null);
      qc.invalidateQueries({ queryKey: ["classes"] });
    },
    onError: (e: any) => setError(e?.response?.data?.title || "Failed"),
  });

  const deleteClass = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/classes/${id}`),
    onSuccess: () => {
      setError(null);
      qc.invalidateQueries({ queryKey: ["classes"] });
    },
    onError: (e: any) => setError(e?.response?.data?.title || "Failed"),
  });

  const createSubject = useMutation({
    mutationFn: (name: string) => api.post("/api/v1/subjects", { name }),
    onSuccess: () => {
      setNewSubjectInput("");
      setAddingSubjectFor(null);
      setError(null);
      qc.invalidateQueries({ queryKey: ["subjects"] });
      qc.invalidateQueries({ queryKey: ["classes"] });
    },
    onError: (e: any) => setError(e?.response?.data?.title || "Failed"),
  });

  const deleteSubject = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/subjects/${id}`),
    onSuccess: () => {
      setError(null);
      qc.invalidateQueries({ queryKey: ["subjects"] });
      qc.invalidateQueries({ queryKey: ["classes"] });
    },
    onError: (e: any) => setError(e?.response?.data?.title || "Failed"),
  });

  const emptyState = !loadingClasses && classes && classes.length === 0;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="font-display text-2xl">Classes & Subjects</h1>
        <p className="text-text-muted text-sm mt-1">
          Configure the classes your institute offers and the subjects taught.
        </p>
      </div>

      {error && (
        <Card className="border border-danger/30 bg-danger/5">
          <div className="text-sm text-danger flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)}>
              <X size={14} />
            </button>
          </div>
        </Card>
      )}

      {loadingClasses ? (
        <Card>
          <p className="text-text-muted text-sm">Loading…</p>
        </Card>
      ) : emptyState ? (
        <Card>
          <div className="py-8 text-center">
            <BookOpen size={40} className="text-text-muted mx-auto mb-3" />
            <h2 className="font-medium">Add your first class</h2>
            <p className="text-text-muted text-sm mb-4">
              Start by adding the classes your institute offers.
            </p>
            <Button onClick={() => setNewClassOpen(true)}>
              <Plus size={14} className="mr-1" /> Add Class
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {classes?.map((cls) => (
            <Card key={cls.id}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="font-medium text-lg">{cls.name}</h2>
                  {(cls.batchCount ?? 0) > 0 && (
                    <span className="text-xs text-text-muted">
                      {cls.batchCount} batch{cls.batchCount === 1 ? "" : "es"} linked
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Delete class "${cls.name}"?`)) {
                      deleteClass.mutate(cls.id);
                    }
                  }}
                  className="p-1.5 rounded-md hover:bg-danger/10 text-danger"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {subjects?.length ? (
                  subjects.map((s) => (
                    <Badge tone="neutral" key={s.id}>
                      {s.name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-text-muted">No subjects yet</span>
                )}
              </div>
            </Card>
          ))}
          <Button variant="secondary" onClick={() => setNewClassOpen(true)}>
            <Plus size={14} className="mr-1" /> Add Class
          </Button>
        </>
      )}

      <Card>
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="font-medium">Subjects</h2>
            <p className="text-xs text-text-muted">
              Shared across all classes. These populate every subject dropdown.
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setAddingSubjectFor("all")}
          >
            <Plus size={14} className="mr-1" /> Add Subject
          </Button>
        </div>
        {subjects && subjects.length > 0 ? (
          <ul className="divide-y divide-border-soft/50">
            {subjects.map((s) => (
              <li key={s.id} className="py-2 flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{s.name}</div>
                  {s.code && (
                    <div className="text-xs text-text-muted">{s.code}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Delete subject "${s.name}"?`)) {
                      deleteSubject.mutate(s.id);
                    }
                  }}
                  className="p-1.5 rounded-md hover:bg-danger/10 text-danger"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-text-muted text-sm">No subjects yet</p>
        )}
      </Card>

      {newClassOpen && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="glass-panel rounded-xl p-6 w-full max-w-sm">
            <h2 className="font-display text-xl mb-3">New class</h2>
            <input
              type="text"
              placeholder="e.g. Class 11"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              autoFocus
              className="w-full px-3 py-2 rounded-lg bg-bg-warm border border-border-soft text-sm mb-3"
            />
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setNewClassOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => createClass.mutate(newClassName)}
                disabled={!newClassName.trim() || createClass.isPending}
              >
                Create
              </Button>
            </div>
          </div>
        </div>
      )}

      {addingSubjectFor && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="glass-panel rounded-xl p-6 w-full max-w-sm">
            <h2 className="font-display text-xl mb-3">New subject</h2>
            <input
              type="text"
              placeholder="e.g. Physics"
              value={newSubjectInput}
              onChange={(e) => setNewSubjectInput(e.target.value)}
              autoFocus
              className="w-full px-3 py-2 rounded-lg bg-bg-warm border border-border-soft text-sm mb-3"
            />
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setAddingSubjectFor(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => createSubject.mutate(newSubjectInput)}
                disabled={!newSubjectInput.trim() || createSubject.isPending}
              >
                Create
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

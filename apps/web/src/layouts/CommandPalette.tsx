import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, FileText, Users, GraduationCap, Calendar } from "lucide-react";
import { api } from "@/lib/api";
import { getAllNavItems } from "@/lib/navigation";
import { fuzzySearch, applyRecencyBoost } from "@/lib/search";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useRecentItems } from "@/hooks/useRecentItems";

interface SearchHit {
  id: string;
  type: "student" | "teacher" | "batch" | "exam";
  title: string;
  subtitle: string | null;
}

const typeMeta: Record<SearchHit["type"], { path: (id: string) => string; icon: typeof Users; label: string }> = {
  student: { path: (id) => `/students/${id}`, icon: Users, label: "Student" },
  teacher: { path: (id) => `/teachers/${id}`, icon: GraduationCap, label: "Teacher" },
  batch: { path: (id) => `/batches/${id}`, icon: Calendar, label: "Batch" },
  exam: { path: (id) => `/exams/${id}`, icon: FileText, label: "Exam" },
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [entityHits, setEntityHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebouncedValue(query, 300);

  const { recentIds: recentStudentIds } = useRecentItems("student");
  const { recentIds: recentBatchIds } = useRecentItems("batch");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const handleCustom = () => setOpen(true);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-command-palette", handleCustom);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-command-palette", handleCustom);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setEntityHits([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    if (!debouncedQuery.trim()) {
      setEntityHits([]);
      return;
    }
    setSearching(true);
    api
      .get("/api/v1/search", { params: { q: debouncedQuery, limit: 4 } })
      .then((r) => {
        if (!cancelled) setEntityHits(r.data?.data?.results ?? []);
      })
      .catch(() => {
        if (!cancelled) setEntityHits([]);
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, open]);

  const navItems = getAllNavItems();
  const navResults = query
    ? fuzzySearch(navItems, query, ["name", "path"], 10)
    : navItems;

  // Apply recency boost to entity hits
  const boostedEntityHits = applyRecencyBoost(entityHits, [
    ...recentStudentIds,
    ...recentBatchIds,
  ]);

  const allResults: Array<
    | { kind: "nav"; item: (typeof navItems)[number] }
    | { kind: "entity"; hit: SearchHit }
  > = [
    ...boostedEntityHits.map((hit) => ({ kind: "entity" as const, hit })),
    ...navResults.map((item) => ({ kind: "nav" as const, item })),
  ];

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = (r: (typeof allResults)[number]) => {
    if (r.kind === "nav") navigate(r.item.path);
    else {
      const meta = typeMeta[r.hit.type];
      navigate(meta.path(r.hit.id));
      api.post("/api/v1/search/track", {
        entityType: r.hit.type,
        entityId: r.hit.id,
      }).catch(() => {});
    }
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, allResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && allResults[selectedIndex]) {
      handleSelect(allResults[selectedIndex]);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]"
      style={{
        background: "rgba(0,0,0,0.3)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div
        className="glass-panel w-full max-w-[560px] mx-4 overflow-hidden"
        style={{ animation: "scaleIn 0.15s ease-out" }}
      >
        <div className="p-4 border-b border-border-soft">
          <div className="flex items-center gap-3">
            <Search size={18} className="text-text-dim shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search students, batches, exams, pages…"
              className="flex-1 bg-transparent outline-none text-sm text-text-primary placeholder:text-text-dim"
            />
            {searching && (
              <span className="text-2xs text-text-dim font-mono">searching…</span>
            )}
            <span
              className="shrink-0"
              style={{
                padding: "2px 8px",
                background: "#F5EFE6",
                borderRadius: 5,
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 10,
                color: "#7A716B",
              }}
            >
              ESC
            </span>
          </div>
        </div>
        <div className="max-h-[400px] overflow-y-auto p-2">
          {boostedEntityHits.length > 0 && (
            <div className="px-2 py-1 text-2xs font-semibold uppercase tracking-wider text-text-dim">
              People & Entities
            </div>
          )}
          {allResults.map((r, i) => {
            const selected = i === selectedIndex;
            const onSelect = () => handleSelect(r);
            if (r.kind === "entity") {
              const meta = typeMeta[r.hit.type];
              const Icon = meta.icon;
              return (
                <button
                  key={`entity-${r.hit.type}-${r.hit.id}`}
                  onClick={onSelect}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
                  style={{
                    background: selected ? "rgba(255,255,255,0.8)" : "transparent",
                  }}
                  onMouseEnter={() => setSelectedIndex(i)}
                >
                  <Icon size={16} className="text-text-dim shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-text-body truncate">{r.hit.title}</div>
                    {r.hit.subtitle && (
                      <div className="text-2xs text-text-dim truncate">{r.hit.subtitle}</div>
                    )}
                  </div>
                  <span className="ml-auto text-2xs text-text-dim font-mono">{meta.label}</span>
                </button>
              );
            }
            const Icon = r.item.icon;
            if (i === boostedEntityHits.length && boostedEntityHits.length > 0) {
              return (
                <div key="nav-divider">
                  <div className="px-2 py-1 mt-2 text-2xs font-semibold uppercase tracking-wider text-text-dim">
                    Navigation
                  </div>
                  <button
                    key={r.item.path}
                    onClick={onSelect}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
                    style={{
                      background: selected ? "rgba(255,255,255,0.8)" : "transparent",
                    }}
                    onMouseEnter={() => setSelectedIndex(i)}
                  >
                    <Icon size={16} className="text-text-dim shrink-0" />
                    <span className="text-sm text-text-body">{r.item.name}</span>
                    <span className="ml-auto text-2xs text-text-dim font-mono">{r.item.path}</span>
                  </button>
                </div>
              );
            }
            return (
              <button
                key={r.item.path}
                onClick={onSelect}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
                style={{
                  background: selected ? "rgba(255,255,255,0.8)" : "transparent",
                }}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <Icon size={16} className="text-text-dim shrink-0" />
                <span className="text-sm text-text-body">{r.item.name}</span>
                <span className="ml-auto text-2xs text-text-dim font-mono">{r.item.path}</span>
              </button>
            );
          })}
          {allResults.length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-text-dim">No results found</div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { getAllNavItems } from "@/lib/navigation";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

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
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const allItems = getAllNavItems();
  const filtered = query
    ? allItems.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()))
    : allItems;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      handleSelect(filtered[selectedIndex].path);
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
              placeholder="Search modules..."
              className="flex-1 bg-transparent outline-none text-sm text-text-primary placeholder:text-text-dim"
            />
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
        <div className="max-h-[320px] overflow-y-auto p-2">
          {filtered.map((item, i) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => handleSelect(item.path)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
                style={{
                  background: i === selectedIndex ? "rgba(255,255,255,0.8)" : "transparent",
                }}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <Icon size={16} className="text-text-dim shrink-0" />
                <span className="text-sm text-text-body">{item.name}</span>
                <span className="ml-auto text-2xs text-text-dim font-mono">{item.path}</span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-text-dim">No results found</div>
          )}
        </div>
      </div>
    </div>
  );
}

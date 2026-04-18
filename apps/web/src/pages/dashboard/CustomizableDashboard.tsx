import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers, Plus, RotateCcw, Save, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { Responsive, useContainerWidth } from "react-grid-layout";
import { Button } from "@/components/primitives";
import { api } from "@/lib/api";
import { debounce } from "@/lib/debounce";
import {
  AtRiskStudentsWidget,
  AnomalyAlertsWidget,
  AttendanceTodayWidget,
  AttendanceTrendWidget,
  AtRiskWidget,
  BatchComparisonWidget,
  CollectionTrendWidget,
  ContentWidget,
  EngagementDistWidget,
  OverdueAgingWidget,
  PassRateWidget,
  PendingRetestsWidget,
  RecentActivityWidget,
  RevenueMTDWidget,
  StudentCountWidget,
  SubjectPerfWidget,
  TopPerformersWidget,
} from "./widgets";

interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface WidgetInstance {
  id: string;
  type: string;
  config: Record<string, unknown>;
}

interface CatalogItem {
  type: string;
  label: string;
  category: string;
  description: string;
  defaultSize: { w: number; h: number };
  chartType: string;
}

function WidgetRenderer({
  type,
  config,
}: {
  type: string;
  config: Record<string, unknown>;
}) {
  switch (type) {
    case "student_count":
      return <StudentCountWidget />;
    case "attendance_today":
      return <AttendanceTodayWidget />;
    case "revenue_mtd":
      return <RevenueMTDWidget />;
    case "pending_retests":
      return <PendingRetestsWidget />;
    case "attendance_trend":
      return <AttendanceTrendWidget config={config} />;
    case "collection_trend":
      return <CollectionTrendWidget config={config} />;
    case "top_performers":
      return <TopPerformersWidget />;
    case "at_risk_students":
      return <AtRiskStudentsWidget config={config} />;
    case "overdue_aging":
      return <OverdueAgingWidget config={config} />;
    case "engagement_distribution":
      return <EngagementDistWidget config={config} />;
    case "pass_rate_evolution":
      return <PassRateWidget config={config} />;
    case "recent_activity":
      return <RecentActivityWidget config={config} />;
    case "batch_comparison":
      return <BatchComparisonWidget config={config} />;
    case "subject_performance":
      return <SubjectPerfWidget config={config} />;
    case "content_consumption":
      return <ContentWidget config={config} />;
    case "anomaly_alerts":
      return <AnomalyAlertsWidget />;
    case "at_risk":
      return <AtRiskWidget />;
    default:
      return (
        <div className="p-4 text-sm text-text-muted">Unknown widget: {type}</div>
      );
  }
}

export function CustomizableDashboard() {
  const qc = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [layout, setLayout] = useState<LayoutItem[]>([]);
  const [widgets, setWidgets] = useState<WidgetInstance[]>([]);
  const [showDrawer, setShowDrawer] = useState(false);
  const { width, containerRef } = useContainerWidth();

  const { data: config } = useQuery<{
    layout: LayoutItem[];
    widgets: WidgetInstance[];
    isDefault?: boolean;
  }>({
    queryKey: ["dashboard-layout"],
    queryFn: () => api.get("/api/v1/dashboard/layout").then((r) => r.data.data),
  });

  const { data: catalog } = useQuery<CatalogItem[]>({
    queryKey: ["dashboard-catalog"],
    queryFn: () => api.get("/api/v1/dashboard/widgets/catalog").then((r) => r.data.data),
  });

  useEffect(() => {
    if (config) {
      setLayout(config.layout);
      setWidgets(config.widgets);
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: (payload: { layout: LayoutItem[]; widgets: WidgetInstance[] }) =>
      api.put("/api/v1/dashboard/layout", payload),
  });

  const resetMutation = useMutation({
    mutationFn: () => api.post("/api/v1/dashboard/layout/reset"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard-layout"] }),
  });

  const debouncedSave = useRef(
    debounce((payload: { layout: LayoutItem[]; widgets: WidgetInstance[] }) => {
      saveMutation.mutate(payload);
    }, 500),
  ).current;

  function handleLayoutChange(newLayout: ReadonlyArray<LayoutItem>) {
    if (!isEditing) return;
    const normalized = newLayout.map((l) => ({
      i: l.i,
      x: l.x,
      y: l.y,
      w: l.w,
      h: l.h,
    }));
    setLayout(normalized);
    debouncedSave({ layout: normalized, widgets });
  }

  function addWidget(catalogItem: CatalogItem) {
    const newId = `w-${catalogItem.type}-${Date.now()}`;
    const maxY = layout.reduce((m, l) => Math.max(m, l.y + l.h), 0);
    const nextLayout: LayoutItem = {
      i: newId,
      x: 0,
      y: maxY,
      w: catalogItem.defaultSize.w,
      h: catalogItem.defaultSize.h,
    };
    const nextWidget: WidgetInstance = {
      id: newId,
      type: catalogItem.type,
      config: {},
    };
    const newLayout = [...layout, nextLayout];
    const newWidgets = [...widgets, nextWidget];
    setLayout(newLayout);
    setWidgets(newWidgets);
    saveMutation.mutate({ layout: newLayout, widgets: newWidgets });
    setShowDrawer(false);
  }

  function removeWidget(id: string) {
    const newLayout = layout.filter((l) => l.i !== id);
    const newWidgets = widgets.filter((w) => w.id !== id);
    setLayout(newLayout);
    setWidgets(newWidgets);
    saveMutation.mutate({ layout: newLayout, widgets: newWidgets });
  }

  const widgetById = useMemo(
    () => new Map(widgets.map((w) => [w.id, w])),
    [widgets],
  );

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display text-3xl">Dashboard</h1>
          <p className="text-xs text-text-muted mt-1">
            {isEditing ? "Drag widgets to rearrange · changes save automatically" : "Your workspace at a glance"}
          </p>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="secondary" onClick={() => setShowDrawer(true)} size="sm">
                <Plus size={14} className="mr-1" /> Add Widget
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  if (confirm("Reset dashboard to default layout?")) {
                    resetMutation.mutate();
                    setIsEditing(false);
                  }
                }}
                size="sm"
              >
                <RotateCcw size={14} className="mr-1" /> Reset
              </Button>
              <Button onClick={() => setIsEditing(false)} size="sm">
                <Save size={14} className="mr-1" /> Done
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={() => setIsEditing(true)} size="sm">
              <Layers size={14} className="mr-1" /> Customize
            </Button>
          )}
        </div>
      </div>

      {layout.length === 0 ? (
        <div className="glass-panel rounded-xl p-12 text-center">
          <p className="text-text-muted text-sm mb-4">Your dashboard is empty.</p>
          <Button onClick={() => resetMutation.mutate()}>Restore default layout</Button>
        </div>
      ) : (
        <div ref={containerRef as React.RefObject<HTMLDivElement>}>
          <Responsive
            className="layout"
            width={width || 1200}
            layouts={{ lg: layout, md: layout, sm: layout, xs: layout }}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
            cols={{ lg: 12, md: 9, sm: 6, xs: 3 }}
            rowHeight={80}
            dragConfig={{ enabled: isEditing }}
            resizeConfig={{ enabled: isEditing }}
            onLayoutChange={handleLayoutChange}
            margin={[16, 16]}
          >
            {layout.map((l) => {
              const widget = widgetById.get(l.i);
              if (!widget) return null;
              return (
                <div
                  key={l.i}
                  className="glass-panel rounded-xl overflow-hidden relative group"
                >
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => removeWidget(l.i)}
                      className="absolute top-2 right-2 z-10 p-1 rounded-md bg-danger/10 text-danger hover:bg-danger/20"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                  <WidgetRenderer type={widget.type} config={widget.config} />
                </div>
              );
            })}
          </Responsive>
        </div>
      )}

      {showDrawer && catalog && (
        <WidgetDrawer
          catalog={catalog}
          onClose={() => setShowDrawer(false)}
          onAdd={addWidget}
        />
      )}
    </div>
  );
}

function WidgetDrawer({
  catalog,
  onClose,
  onAdd,
}: {
  catalog: CatalogItem[];
  onClose: () => void;
  onAdd: (item: CatalogItem) => void;
}) {
  const [category, setCategory] = useState<string>("all");
  const categories = ["all", ...new Set(catalog.map((c) => c.category))];
  const filtered = category === "all" ? catalog : catalog.filter((c) => c.category === category);

  return (
    <div
      className="fixed inset-0 bg-black/30 z-50 flex items-stretch justify-end"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-bg-warm border-l border-border-soft overflow-y-auto p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl">Widget library</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md hover:bg-white/50"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex gap-1 flex-wrap mb-4">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                category === c
                  ? "bg-indigo text-white"
                  : "bg-white/70 text-text-body hover:bg-white"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {filtered.map((item) => (
            <button
              key={item.type}
              type="button"
              onClick={() => onAdd(item)}
              className="w-full text-left p-3 rounded-xl bg-white/70 hover:bg-white transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm">{item.label}</div>
                <span className="text-xs text-text-muted uppercase tracking-wide">
                  {item.chartType}
                </span>
              </div>
              <p className="text-xs text-text-muted mt-1">{item.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
} from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import { STAGE_LABELS, STAGES, type Stage } from "@/lib/constants";
import { formatINR } from "@/lib/format";
import type { Lead } from "@/types/crm";

const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length ? hits : rectIntersection(args);
};

function Card({ lead }: { lead: Lead }) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 20 } : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border bg-white p-3 shadow-sm ${isDragging ? "opacity-70" : ""}`}
    >
      <div className="flex items-start gap-2">
        <button className="min-w-0 flex-1 text-left" onClick={() => router.push(`/leads/${lead.id}`)}>
          <p className="text-sm font-medium">{lead.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {lead.contact.name}
            {lead.contact.company ? ` · ${lead.contact.company.name}` : ""}
          </p>
        </button>
        <button className="cursor-grab text-slate-400" aria-label="Drag lead" {...listeners} {...attributes}>
          <GripVertical className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="font-medium">{formatINR(lead.dealValue)}</span>
        <span className="text-muted-foreground">{lead.owner.name.split(" ")[0]}</span>
      </div>
    </div>
  );
}

function Column({ stage, leads }: { stage: Stage; leads: Lead[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const value = leads.reduce((sum, lead) => sum + lead.dealValue, 0);
  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="text-sm font-medium">
          {STAGE_LABELS[stage]} <span className="text-muted-foreground">{leads.length}</span>
        </p>
        <p className="text-xs text-muted-foreground">{formatINR(value)}</p>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-48 flex-1 flex-col gap-2 rounded-xl bg-slate-100/80 p-2 ${isOver ? "ring-2 ring-indigo-400" : ""}`}
      >
        {leads.map((lead) => (
          <Card key={lead.id} lead={lead} />
        ))}
      </div>
    </div>
  );
}

export function KanbanBoard({ leads, onMove }: { leads: Lead[]; onMove: (lead: Lead, stage: Stage) => void }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function onDragEnd(event: DragEndEvent) {
    const overId = String(event.over?.id ?? "");
    if (!STAGES.includes(overId as Stage)) return;
    const lead = leads.find((item) => item.id === String(event.active.id));
    if (!lead || lead.stage === overId) return;
    onMove(lead, overId as Stage);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={collision} onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {STAGES.map((stage) => (
          <Column key={stage} stage={stage} leads={leads.filter((lead) => lead.stage === stage)} />
        ))}
      </div>
    </DndContext>
  );
}

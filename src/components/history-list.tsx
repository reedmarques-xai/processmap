"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Trash2, ExternalLink, FileText } from "lucide-react";
import { SavedMap } from "@/lib/types";
import { deleteMap } from "@/lib/storage";
import { formatDate, truncate } from "@/lib/utils";

interface HistoryListProps {
  maps: SavedMap[];
  onDelete: () => void; // callback to refresh list
}

export default function HistoryList({ maps, onDelete }: HistoryListProps) {
  const router = useRouter();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    deleteMap(id);
    setConfirmDeleteId(null);
    onDelete();
  };

  if (maps.length === 0) {
    return (
      <div className="text-center py-16">
        <FileText className="w-12 h-12 text-muted/30 mx-auto mb-4" />
        <p className="text-muted text-sm mb-1">No process maps yet</p>
        <p className="text-muted/60 text-xs">
          Upload a Gong transcript to generate your first map
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs uppercase tracking-wider text-muted font-medium mb-3 flex items-center gap-2">
        <Clock className="w-3.5 h-3.5" />
        Recent Maps ({maps.length})
      </h3>

      {maps.map((map) => (
        <div
          key={map.id}
          className="group bg-surface border border-border rounded-xl p-4 hover:border-border-hover hover:bg-surface-hover transition-all cursor-pointer"
          onClick={() => router.push(`/editor/${map.id}`)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm text-foreground truncate">
                {map.title}
              </h4>
              <p className="text-xs text-muted mt-1">
                {truncate(map.summary, 100)}
              </p>
              <p className="text-xs text-muted/60 mt-2">
                {formatDate(map.updatedAt)}
              </p>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/editor/${map.id}`);
                }}
                className="p-2 rounded-lg hover:bg-background text-muted hover:text-accent transition-all"
                title="Open in editor"
              >
                <ExternalLink className="w-4 h-4" />
              </button>

              {confirmDeleteId === map.id ? (
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleDelete(map.id)}
                    className="px-2 py-1 text-xs rounded bg-danger text-white hover:bg-danger-hover transition-all"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="px-2 py-1 text-xs rounded bg-surface text-muted hover:text-foreground transition-all"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDeleteId(map.id);
                  }}
                  className="p-2 rounded-lg hover:bg-background text-muted hover:text-danger transition-all"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
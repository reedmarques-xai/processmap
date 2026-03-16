"use client";

import { useState } from "react";
import { UseCase } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronUp,
  Users,
  Wrench,
  ArrowRight,
  Sparkles,
  ArrowLeft,
  ListTree,
} from "lucide-react";
import GrokReasoningBlock from "@/components/ui/grok-reasoning-block";

interface UseCaseSelectorProps {
  useCases: UseCase[];
  transcriptSummary: string;
  onSelectUseCase: (useCase: UseCase) => void;
  onBack: () => void;
  loading: boolean;
  reasoningText?: string;
}

export default function UseCaseSelector({
  useCases,
  transcriptSummary,
  onSelectUseCase,
  onBack,
  loading,
  reasoningText = "",
}: UseCaseSelectorProps) {
  // Allow multiple use cases to be expanded simultaneously
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(useCases.length === 1 ? [useCases[0].id] : [])
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedUseCase = useCases.find((uc) => uc.id === selectedId);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelect = (useCase: UseCase) => {
    setSelectedId(useCase.id);
  };

  const handleGenerate = () => {
    if (selectedUseCase) {
      onSelectUseCase(selectedUseCase);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      {/* Transcript Summary */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
            <ListTree className="w-4 h-4 text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground mb-1">
              Transcript Analysis
            </h3>
            <p className="text-sm text-muted">{transcriptSummary}</p>
            <p className="text-xs text-muted/70 mt-2">
              {useCases.length} use case{useCases.length !== 1 ? "s" : ""} identified
            </p>
          </div>
        </div>
      </div>

      {/* Use Cases Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">
            Select a use case to map
          </h3>
          <p className="text-xs text-muted">
            Click cards to expand details • Compare side by side
          </p>
        </div>

        {/* Side-by-side grid layout - items-start prevents cards from stretching */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
          {useCases.map((useCase) => {
            const isExpanded = expandedIds.has(useCase.id);
            const isSelected = selectedId === useCase.id;

            return (
              <div
                key={useCase.id}
                className={cn(
                  "border rounded-xl transition-all duration-200 overflow-hidden flex flex-col",
                  isSelected
                    ? "border-accent bg-accent/5 ring-2 ring-accent/30"
                    : "border-border bg-surface hover:border-border-hover"
                )}
              >
                {/* Use Case Header */}
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => handleSelect(useCase)}
                >
                  <div className="flex items-start gap-3">
                    {/* Selection Radio */}
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                        isSelected
                          ? "border-accent bg-accent"
                          : "border-border"
                      )}
                    >
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-foreground leading-tight">
                        {useCase.title}
                      </h4>
                      <p className="text-sm text-muted mt-1 line-clamp-2">
                        {useCase.description}
                      </p>

                      {/* Quick preview tags */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {useCase.participants && useCase.participants.length > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-xs">
                            <Users className="w-3 h-3" />
                            {useCase.participants.length}
                          </span>
                        )}
                        {useCase.systems && useCase.systems.length > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 text-xs">
                            <Wrench className="w-3 h-3" />
                            {useCase.systems.length}
                          </span>
                        )}
                        {useCase.details.length > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-xs">
                            {useCase.details.length} details
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expand/Collapse Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(useCase.id);
                  }}
                  className={cn(
                    "w-full flex items-center justify-center gap-1.5 py-2 text-xs border-t transition-colors",
                    isExpanded
                      ? "bg-surface-hover border-border text-foreground"
                      : "border-border/50 text-muted hover:text-foreground hover:bg-surface-hover"
                  )}
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      Hide Details
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      Show Details
                    </>
                  )}
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-3 border-t border-border/50 bg-background/50">
                    {/* Details */}
                    {useCase.details.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
                          Key Details
                        </p>
                        <ul className="space-y-1">
                          {useCase.details.map((detail, i) => (
                            <li
                              key={i}
                              className="text-sm text-foreground/80 flex items-start gap-2"
                            >
                              <span className="text-muted mt-0.5">•</span>
                              <span className="flex-1">{detail}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Participants */}
                    {useCase.participants && useCase.participants.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                          <Users className="w-3 h-3" />
                          Participants
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {useCase.participants.map((p, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-xs"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Systems */}
                    {useCase.systems && useCase.systems.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                          <Wrench className="w-3 h-3" />
                          Systems & Tools
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {useCase.systems.map((s, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 text-xs"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Reasoning Block - shows when generating */}
      <GrokReasoningBlock
        reasoningText={reasoningText}
        isLoading={loading}
        title={`Generating "${selectedUseCase?.title}"...`}
      />

      {/* Generate Button */}
      {!loading && (
        <button
          onClick={handleGenerate}
          disabled={!selectedId}
          className="w-full flex items-center justify-center gap-2 h-12 rounded-xl
            bg-accent hover:bg-accent-hover text-white font-medium
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-all duration-200"
        >
          <Sparkles className="w-5 h-5" />
          Generate Process Map
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
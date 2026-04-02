"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Map, LogOut, ChevronDown, Cpu, Sun, Moon } from "lucide-react";
import { GROK_MODELS, GrokModelId, DEFAULT_MODEL_ID } from "@/lib/types";

const STORAGE_KEY = "grokessmap_model";

interface HeaderProps {
  showBack?: boolean;
  title?: string;
  actions?: React.ReactNode;
}

const THEME_KEY = "grokessmap_theme";

export default function Header({ showBack, title, actions }: HeaderProps) {
  const router = useRouter();
  const [selectedModel, setSelectedModel] = useState<GrokModelId>(DEFAULT_MODEL_ID);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isLightTheme, setIsLightTheme] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load saved model on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as GrokModelId | null;
    if (saved && GROK_MODELS.some((m) => m.id === saved)) {
      setSelectedModel(saved);
    }
  }, []);

  // Load and apply saved theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    // Default to light mode unless explicitly set to "dark"
    const shouldBeLight = savedTheme !== "dark";
    setIsLightTheme(shouldBeLight);
    if (shouldBeLight) {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  }, []);

  // Toggle theme
  const toggleTheme = () => {
    const newIsLight = !isLightTheme;
    setIsLightTheme(newIsLight);
    if (newIsLight) {
      document.documentElement.classList.add("light");
      localStorage.setItem(THEME_KEY, "light");
    } else {
      document.documentElement.classList.remove("light");
      localStorage.setItem(THEME_KEY, "dark");
    }
  };

  // Persist on change
  const handleSelectModel = (modelId: GrokModelId) => {
    setSelectedModel(modelId);
    localStorage.setItem(STORAGE_KEY, modelId);
    setDropdownOpen(false);
    // Dispatch custom event so other components can react
    window.dispatchEvent(new CustomEvent("grokessmap:model-change", { detail: modelId }));
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("grokessmap_auth");
    router.replace("/");
  };

  const activeModel = GROK_MODELS.find((m) => m.id === selectedModel);

  return (
    <header className="h-14 border-b border-border bg-surface/80 backdrop-blur-sm flex items-center px-4 gap-3 sticky top-0 z-50">
      {showBack ? (
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 text-muted hover:text-foreground transition-colors text-sm"
        >
          <Map className="w-4 h-4" />
          <span>Dashboard</span>
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <Map className="w-5 h-5 text-accent" />
          <span className="font-semibold text-sm tracking-tight">GrokessMap</span>
        </div>
      )}

      {title && (
        <>
          <div className="w-px h-5 bg-border mx-1" />
          <span className="text-sm text-muted truncate max-w-[300px]">{title}</span>
        </>
      )}

      <div className="ml-auto flex items-center gap-2">
        {/* Model Selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface border border-border hover:border-border-hover text-sm text-muted hover:text-foreground transition-all"
            title="Select Grok model"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span className="hidden sm:inline max-w-[120px] truncate">{activeModel?.label ?? "Model"}</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-1 w-56 bg-surface border border-border rounded-lg shadow-xl z-50 py-1">
              {GROK_MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleSelectModel(model.id)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    model.id === selectedModel
                      ? "bg-accent/10 text-accent"
                      : "text-muted hover:text-foreground hover:bg-surface-hover"
                  }`}
                >
                  <div className="font-medium">{model.label}</div>
                  <div className="text-[10px] text-muted/70 mt-0.5 font-mono truncate">
                    {model.config.apiModelId}
                    {model.config.reasoningEffort && ` (${model.config.reasoningEffort})`}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {actions}
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-surface-hover transition-all"
          title={isLightTheme ? "Switch to dark mode" : "Switch to light mode"}
        >
          {isLightTheme ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>
        <button
          onClick={handleLogout}
          className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-surface-hover transition-all"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
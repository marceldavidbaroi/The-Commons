"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { type DocItem, type DocCategoryGroup } from "@/lib/docs-loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  Database,
  Layers,
  FileCode,
  Search,
  Copy,
  Check,
  FileText,
  Clock,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  Sun,
  Moon,
  ArrowUp,
  Folder,
  FolderOpen,
  Terminal,
  AlertCircle,
  Info,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from "lucide-react";

import mermaid from "mermaid";

interface Props {
  initialDocs: DocItem[];
  categoryGroups: DocCategoryGroup[];
}

export default function DocumentReaderClient({ initialDocs, categoryGroups }: Props) {
  const [selectedDocId, setSelectedDocId] = useState<string>(
    initialDocs[0]?.id || ""
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBadgeFilter, setSelectedBadgeFilter] = useState<string | null>(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<"rendered" | "raw">("rendered");
  
  // Track open feature subfolder state in sidebar
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({
    "Authentication": true,
    "Daily Diary": true,
    "Citizen Passport": true,
    "Boilerplate Template": true,
  });

  const selectDocument = (docId: string, updateUrl = true) => {
    setSelectedDocId(docId);
    setIsMobileNavOpen(false);

    if (updateUrl && typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("doc", docId);
      window.history.replaceState({ docId }, "", url.toString());
    }

    const doc = initialDocs.find((d) => d.id === docId);
    if (doc?.featureFolder) {
      setOpenFolders((prev) => ({ ...prev, [doc.featureFolder!]: true }));
    }
  };

  // Sync selected doc with URL ?doc= slug on initial load & popstate (browser back/forward)
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const syncFromUrl = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const urlDoc = searchParams.get("doc") || searchParams.get("slug") || window.location.hash.replace("#", "");

      if (urlDoc) {
        const matched = initialDocs.find(
          (d) =>
            d.id.toLowerCase() === urlDoc.toLowerCase() ||
            d.relativePath.toLowerCase().includes(urlDoc.toLowerCase()) ||
            d.id.toLowerCase().endsWith(urlDoc.toLowerCase())
        );
        if (matched) {
          selectDocument(matched.id, false);
          return;
        }
      } else if (initialDocs.length > 0) {
        const defaultDoc = initialDocs[0];
        const url = new URL(window.location.href);
        url.searchParams.set("doc", defaultDoc.id);
        window.history.replaceState({ docId: defaultDoc.id }, "", url.toString());
      }
    };

    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, [initialDocs]);

  const toggleFolder = (folderName: string) => {
    setOpenFolders((prev) => ({
      ...prev,
      [folderName]: !prev[folderName],
    }));
  };

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return next;
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Filtered documents
  const filteredDocs = useMemo(() => {
    return initialDocs.filter((doc) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        query === "" ||
        doc.title.toLowerCase().includes(query) ||
        doc.content.toLowerCase().includes(query) ||
        doc.filePath.toLowerCase().includes(query);

      const matchesBadge =
        !selectedBadgeFilter || doc.typeBadge === selectedBadgeFilter;

      return matchesSearch && matchesBadge;
    });
  }, [initialDocs, searchQuery, selectedBadgeFilter]);

  // Current doc
  const currentDoc = useMemo(() => {
    return initialDocs.find((d) => d.id === selectedDocId) || initialDocs[0];
  }, [initialDocs, selectedDocId]);

  // Extract headings for Table of Contents
  const tableOfContents = useMemo(() => {
    if (!currentDoc) return [];
    const lines = currentDoc.content.split("\n");
    const headings: { text: string; level: number; id: string }[] = [];

    lines.forEach((line) => {
      const h2Match = line.match(/^##\s+(.*)/);
      const h3Match = line.match(/^###\s+(.*)/);

      if (h2Match) {
        const text = h2Match[1].replace(/\[(.*?)\]\(.*?\)/g, "$1").trim();
        const id = text.toLowerCase().replace(/[^\w]+/g, "-");
        headings.push({ text, level: 2, id });
      } else if (h3Match) {
        const text = h3Match[1].replace(/\[(.*?)\]\(.*?\)/g, "$1").trim();
        const id = text.toLowerCase().replace(/[^\w]+/g, "-");
        headings.push({ text, level: 3, id });
      }
    });

    return headings;
  }, [currentDoc]);

  const scrollToHeading = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName) {
      case "Overview":
        return <BookOpen className="h-4 w-4 text-blue-500" />;
      case "Architecture & DB":
        return <Database className="h-4 w-4 text-emerald-500" />;
      case "Features":
        return <Layers className="h-4 w-4 text-indigo-500" />;
      case "Templates & Stubs":
        return <FileCode className="h-4 w-4 text-amber-500" />;
      default:
        return <FileText className="h-4 w-4 text-slate-400" />;
    }
  };

  const getBadgeStyle = (type: DocItem["typeBadge"]) => {
    switch (type) {
      case "PRD":
        return "bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      case "TDD":
        return "bg-purple-50 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 border-purple-200 dark:border-purple-800";
      case "Schema":
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      case "Matrix":
        return "bg-teal-50 text-teal-700 dark:bg-teal-950/70 dark:text-teal-300 border-teal-200 dark:border-teal-800";
      case "API Contract":
        return "bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case "Architecture":
        return "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/70 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800";
      case "Code Stub":
        return "bg-orange-50 text-orange-700 dark:bg-orange-950/70 dark:text-orange-300 border-orange-200 dark:border-orange-800";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    }
  };

  return (
    <div
      className={`min-h-screen ${
        isDarkMode ? "dark bg-[#0B0F17]" : "bg-[#F8FAFC]"
      } text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200`}
    >
      {/* Top Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/90 dark:bg-[#0E1422]/90 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
              className="p-1.5 rounded-md md:hidden border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Toggle navigation"
            >
              {isMobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            <Link href="/dev/document" className="flex items-center gap-2.5 group">
              <div className="h-7 w-7 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
                C
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-semibold text-sm tracking-tight text-slate-900 dark:text-white">
                  The Commons
                </span>
                <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  Feature Specs Codex
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleDarkMode}
              className="h-8 px-2.5 text-xs gap-1.5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            >
              {isDarkMode ? (
                <Sun className="h-3.5 w-3.5 text-amber-400" />
              ) : (
                <Moon className="h-3.5 w-3.5 text-slate-600" />
              )}
              <span className="hidden sm:inline">
                {isDarkMode ? "Light" : "Dark"}
              </span>
            </Button>

            <Link
              href="/dev/design-system"
              className="text-xs text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium hidden sm:inline px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Design System
            </Link>

            <Link
              href="/home"
              className="text-xs text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <span>App</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row min-h-[calc(100vh-3.5rem)]">
        
        {/* Left Navigation Tree */}
        <aside
          className={`fixed inset-y-0 left-0 z-30 w-72 bg-white dark:bg-[#0B0F17] border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-3 transform transition-transform duration-200 md:translate-x-0 md:sticky md:top-14 md:h-[calc(100vh-3.5rem)] md:self-start ${
            isMobileNavOpen ? "translate-x-0 shadow-2xl pt-16" : "-translate-x-full"
          }`}
        >
          {/* Search Bar */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search specs, actions, schemas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-blue-500 rounded-md"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Badge Filter Pills */}
            <div className="flex flex-wrap gap-1">
              {["PRD", "Schema", "API Contract", "TDD", "Code Stub"].map((badge) => (
                <button
                  key={badge}
                  onClick={() =>
                    setSelectedBadgeFilter(
                      selectedBadgeFilter === badge ? null : badge
                    )
                  }
                  className={`text-[10px] px-2 py-0.5 rounded font-mono transition-colors border ${
                    selectedBadgeFilter === badge
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {badge}
                </button>
              ))}
            </div>
          </div>

          {/* Grouped & Nested Document List */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs overscroll-contain">
            {searchQuery || selectedBadgeFilter ? (
              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2">
                  Matching Specs ({filteredDocs.length})
                </div>
                {filteredDocs.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => selectDocument(doc.id)}
                    className={`w-full text-left p-2 rounded-md transition-colors flex flex-col gap-0.5 ${
                      selectedDocId === doc.id
                        ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-medium"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate">{doc.title}</span>
                      <span
                        className={`text-[9px] px-1 py-0.2 rounded font-mono border ${getBadgeStyle(
                          doc.typeBadge
                        )}`}
                      >
                        {doc.typeBadge}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono truncate">
                      {doc.filePath}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              categoryGroups.map((group) => (
                <div key={group.name} className="space-y-1">
                  {/* Category Header */}
                  <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {getCategoryIcon(group.name)}
                    <span>{group.name}</span>
                    <span className="text-[10px] text-slate-400 font-normal ml-auto">
                      {group.docs.length}
                    </span>
                  </div>

                  {/* If category has nested feature sub-groups (e.g. Features & Templates) */}
                  {group.featureSubGroups && group.featureSubGroups.length > 0 ? (
                    <div className="space-y-2 pl-1">
                      {group.featureSubGroups.map((subGroup) => {
                        const isOpen = openFolders[subGroup.featureName] ?? true;
                        return (
                          <div key={subGroup.featureName} className="space-y-0.5">
                            {/* Feature Folder Dropdown Header */}
                            <button
                              onClick={() => toggleFolder(subGroup.featureName)}
                              className="w-full flex items-center justify-between px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200 font-medium text-xs transition-colors"
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                {isOpen ? (
                                  <FolderOpen className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                ) : (
                                  <Folder className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                )}
                                <span className="truncate">{subGroup.featureName}</span>
                              </div>
                              <ChevronDown
                                className={`h-3 w-3 text-slate-400 transition-transform ${
                                  isOpen ? "transform rotate-0" : "transform -rotate-90"
                                }`}
                              />
                            </button>

                            {/* Feature Child Documents (01-prd, 02-data-model, etc.) */}
                            {isOpen && (
                              <div className="pl-4 space-y-0.5 border-l border-slate-200/80 dark:border-slate-800/80 ml-3">
                                {subGroup.docs.map((doc) => (
                                  <button
                                    key={doc.id}
                                    onClick={() => selectDocument(doc.id)}
                                    className={`w-full text-left px-2 py-1 rounded transition-colors flex items-center justify-between gap-1 ${
                                      selectedDocId === doc.id
                                        ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-medium"
                                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                                    }`}
                                  >
                                    <span className="truncate">
                                      {doc.filePath.split("/").pop()?.replace(/\.(md|ts)$/, "")}
                                    </span>
                                    <span
                                      className={`text-[8.5px] px-1 py-0.2 rounded font-mono border shrink-0 ${getBadgeStyle(
                                        doc.typeBadge
                                      )}`}
                                    >
                                      {doc.typeBadge}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Flat category (Overview, Architecture) */
                    <div className="space-y-0.5">
                      {group.docs.map((doc) => (
                        <button
                          key={doc.id}
                          onClick={() => selectDocument(doc.id)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-md transition-colors flex items-center justify-between gap-1.5 ${
                            selectedDocId === doc.id
                              ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-medium border-l-2 border-blue-600 rounded-l-none pl-2"
                              : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <span className="truncate">{doc.title}</span>
                          <span
                            className={`text-[9px] px-1 py-0.2 rounded font-mono border shrink-0 ${getBadgeStyle(
                              doc.typeBadge
                            )}`}
                          >
                            {doc.typeBadge}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>The Commons Specs</span>
            <span>{initialDocs.length} Documents</span>
          </div>
        </aside>

        {/* Mobile Backdrop */}
        {isMobileNavOpen && (
          <div
            onClick={() => setIsMobileNavOpen(false)}
            className="fixed inset-0 z-20 bg-slate-900/30 backdrop-blur-xs md:hidden"
          />
        )}

        {/* Main Document Content Canvas */}
        <main className="flex-1 min-w-0 bg-white dark:bg-[#0B0F17] p-6 sm:p-10 border-r border-slate-200 dark:border-slate-800">
          {currentDoc ? (
            <div className="max-w-3xl space-y-8">
              
              {/* Document Header */}
              <div className="space-y-3 pb-6 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono flex-wrap">
                  <span>Docs</span>
                  <ChevronRight className="h-3 w-3" />
                  <span>{currentDoc.category}</span>
                  {currentDoc.featureFolder && (
                    <>
                      <ChevronRight className="h-3 w-3" />
                      <span className="text-blue-600 dark:text-blue-400 font-medium">
                        {currentDoc.featureFolder}
                      </span>
                    </>
                  )}
                  <ChevronRight className="h-3 w-3" />
                  <span className="text-slate-800 dark:text-slate-200 font-medium">
                    {currentDoc.title}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        {currentDoc.title}
                      </h1>
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-mono border ${getBadgeStyle(
                          currentDoc.typeBadge
                        )}`}
                      >
                        {currentDoc.typeBadge}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 font-mono">
                      {currentDoc.filePath}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <div className="inline-flex rounded-md border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-50 dark:bg-slate-900 text-xs">
                      <button
                        onClick={() => setActiveTab("rendered")}
                        className={`px-2.5 py-1 rounded transition-colors ${
                          activeTab === "rendered"
                            ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium shadow-xs"
                            : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        Docs
                      </button>
                      <button
                        onClick={() => setActiveTab("raw")}
                        className={`px-2.5 py-1 rounded transition-colors ${
                          activeTab === "raw"
                            ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium shadow-xs"
                            : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        Raw Source
                      </button>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(currentDoc.content, "markdown")}
                      className="h-7 text-xs gap-1 border-slate-200 dark:border-slate-800"
                    >
                      {copiedText === "markdown" ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <Copy className="h-3 w-3 text-slate-500" />
                      )}
                      <span>{copiedText === "markdown" ? "Copied" : "Copy"}</span>
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400 pt-1 font-mono">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>~{currentDoc.readingTimeMin} min read</span>
                  </div>
                  <span>•</span>
                  <span>{currentDoc.wordCount} words</span>
                </div>
              </div>

              {/* Document Body */}
              {activeTab === "raw" ? (
                <pre className="p-4 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {currentDoc.content}
                </pre>
              ) : (
                <div className="space-y-6 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  <CleanMarkdownRenderer content={currentDoc.content} />
                </div>
              )}
            </div>
          ) : (
            <div className="py-20 text-center text-slate-400">
              Select a document from the left navigation.
            </div>
          )}
        </main>

        {/* Right Table of Contents */}
        {tableOfContents.length > 1 && activeTab === "rendered" && (
          <aside className="hidden xl:block w-64 p-6 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto text-xs space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              On This Page
            </div>
            <nav className="space-y-1.5">
              {tableOfContents.map((h, index) => (
                <button
                  key={index}
                  onClick={() => scrollToHeading(h.id)}
                  className={`w-full text-left transition-colors leading-snug truncate block ${
                    h.level === 3
                      ? "pl-3 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                      : "text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium"
                  }`}
                >
                  {h.text}
                </button>
              ))}
            </nav>

            <button
              onClick={scrollToTop}
              className="pt-4 flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <ArrowUp className="h-3 w-3" />
              <span>Back to top</span>
            </button>
          </aside>
        )}

      </div>
    </div>
  );
}

/**
 * Standard, Clean Developer Docs Markdown Renderer
 */
function CleanMarkdownRenderer({ content }: { content: string }) {
  const renderedElements = useMemo(() => {
    const lines = content.split("\n");
    const elements: React.ReactNode[] = [];

    let inCodeBlock = false;
    let codeLanguage = "";
    let codeBuffer: string[] = [];

    let inTable = false;
    let tableBuffer: string[] = [];

    let inAlert = false;
    let alertType: "NOTE" | "TIP" | "IMPORTANT" | "WARNING" | "CAUTION" = "NOTE";
    let alertBuffer: string[] = [];

    const flushCodeBlock = (key: number) => {
      if (codeLanguage.toLowerCase() === "mermaid") {
        elements.push(
          <MermaidViewer key={`mermaid-${key}`} code={codeBuffer.join("\n")} />
        );
      } else {
        elements.push(
          <CodeBlockViewer key={`code-${key}`} code={codeBuffer.join("\n")} language={codeLanguage} />
        );
      }
      codeBuffer = [];
      inCodeBlock = false;
      codeLanguage = "";
    };

    const flushTable = (key: number) => {
      elements.push(<StandardTableView key={`table-${key}`} rows={tableBuffer} />);
      tableBuffer = [];
      inTable = false;
    };

    const flushAlert = (key: number) => {
      elements.push(
        <StandardAlertCallout key={`alert-${key}`} type={alertType} lines={alertBuffer} />
      );
      alertBuffer = [];
      inAlert = false;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Code Block Fence
      if (line.startsWith("```")) {
        if (inAlert) flushAlert(i);
        if (inTable) flushTable(i);

        if (inCodeBlock) {
          flushCodeBlock(i);
        } else {
          inCodeBlock = true;
          codeLanguage = line.replace(/^```/, "").trim();
        }
        continue;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        continue;
      }

      // GitHub alerts
      const alertMatch = line.match(/^>\s+\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);
      if (alertMatch) {
        if (inTable) flushTable(i);
        if (inAlert) flushAlert(i);
        inAlert = true;
        alertType = alertMatch[1].toUpperCase() as any;
        continue;
      }

      if (inAlert) {
        if (line.startsWith(">")) {
          alertBuffer.push(line.replace(/^>\s?/, ""));
          continue;
        } else if (line.trim() === "") {
          alertBuffer.push("");
          continue;
        } else {
          flushAlert(i);
        }
      }

      // Tables
      if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
        inTable = true;
        tableBuffer.push(line);
        continue;
      } else if (inTable) {
        flushTable(i);
      }

      // Horizontal Rules
      if (line.trim() === "---" || line.trim() === "***") {
        elements.push(
          <hr key={`hr-${i}`} className="my-6 border-t border-slate-200 dark:border-slate-800" />
        );
        continue;
      }

      // Headings
      if (line.startsWith("# ")) {
        const text = line.replace(/^#\s+/, "");
        const id = text.toLowerCase().replace(/[^\w]+/g, "-");
        elements.push(
          <h1
            key={`h1-${i}`}
            id={id}
            className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4 tracking-tight border-b border-slate-200 dark:border-slate-800 pb-2"
          >
            {text}
          </h1>
        );
        continue;
      }

      if (line.startsWith("## ")) {
        const text = line.replace(/^##\s+/, "");
        const id = text.toLowerCase().replace(/[^\w]+/g, "-");
        elements.push(
          <h2
            key={`h2-${i}`}
            id={id}
            className="text-xl font-semibold text-slate-900 dark:text-white mt-8 mb-3 tracking-tight border-b border-slate-200/80 dark:border-slate-800/80 pb-1.5"
          >
            {text}
          </h2>
        );
        continue;
      }

      if (line.startsWith("### ")) {
        const text = line.replace(/^###\s+/, "");
        const id = text.toLowerCase().replace(/[^\w]+/g, "-");
        elements.push(
          <h3
            key={`h3-${i}`}
            id={id}
            className="text-base font-semibold text-slate-900 dark:text-white mt-6 mb-2 tracking-tight"
          >
            {text}
          </h3>
        );
        continue;
      }

      // Checkbox list
      const checkboxMatch = line.match(/^(\s*)-\s+\[([ xX])\]\s+(.*)/);
      if (checkboxMatch) {
        const isChecked = checkboxMatch[2].toLowerCase() === "x";
        const text = checkboxMatch[3];
        elements.push(
          <div key={`chk-${i}`} className="flex items-start gap-2.5 my-1 text-xs sm:text-sm">
            <input
              type="checkbox"
              checked={isChecked}
              readOnly
              className="mt-1 h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-0"
            />
            <span className={isChecked ? "line-through text-slate-400" : "text-slate-700 dark:text-slate-300"}>
              {renderCleanInline(text)}
            </span>
          </div>
        );
        continue;
      }

      // Bullet lists
      const listMatch = line.match(/^(\s*)[-*+]\s+(.*)/);
      if (listMatch) {
        const indentLevel = Math.floor(listMatch[1].length / 2);
        elements.push(
          <div
            key={`li-${i}`}
            className={`flex items-start gap-2 my-1 text-xs sm:text-sm ${
              indentLevel > 0 ? "pl-5" : "pl-1"
            }`}
          >
            <span className="text-slate-400 select-none">•</span>
            <div className="flex-1">{renderCleanInline(listMatch[2])}</div>
          </div>
        );
        continue;
      }

      // Blockquotes
      if (line.startsWith(">")) {
        const quoteText = line.replace(/^>\s?/, "");
        elements.push(
          <blockquote
            key={`quote-${i}`}
            className="border-l-2 border-slate-300 dark:border-slate-700 pl-3 py-1 my-3 text-xs sm:text-sm italic text-slate-600 dark:text-slate-400"
          >
            {renderCleanInline(quoteText)}
          </blockquote>
        );
        continue;
      }

      // Paragraphs
      if (line.trim() !== "") {
        elements.push(
          <p key={`p-${i}`} className="my-2 leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">
            {renderCleanInline(line)}
          </p>
        );
      }
    }

    if (inCodeBlock) flushCodeBlock(lines.length);
    if (inTable) flushTable(lines.length);
    if (inAlert) flushAlert(lines.length);

    return elements;
  }, [content]);

  return <div className="space-y-1">{renderedElements}</div>;
}

/**
 * Live Interactive Mermaid Diagram Viewer
 */
function MermaidViewer({ code }: { code: string }) {
  const [svgContent, setSvgContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);
  const uniqueId = React.useId().replace(/[^a-zA-Z0-9]/g, "");

  React.useEffect(() => {
    let isCancelled = false;

    const renderDiagram = async () => {
      try {
        const isDark = document.documentElement.classList.contains("dark");
        mermaid.initialize({
          startOnLoad: false,
          suppressErrorRendering: true,
          theme: isDark ? "dark" : "default",
          themeVariables: {
            fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
            fontSize: "12px",
            darkMode: isDark,
            background: isDark ? "#0B0F17" : "#FFFFFF",
            primaryColor: isDark ? "#1E293B" : "#F1F5F9",
            primaryTextColor: isDark ? "#F8FAFC" : "#0F172A",
            primaryBorderColor: isDark ? "#3B82F6" : "#2563EB",
            lineColor: isDark ? "#60A5FA" : "#3B82F6",
            secondaryColor: isDark ? "#1E293B" : "#F8FAFC",
            tertiaryColor: isDark ? "#0B0F17" : "#FFFFFF",
          },
          securityLevel: "loose",
        });

        const id = `mermaid-svg-${uniqueId}-${Math.random().toString(36).substring(2, 7)}`;
        const { svg } = await mermaid.render(id, code.trim());
        if (!isCancelled) {
          setSvgContent(svg);
          setError(null);
        }
      } catch (err: any) {
        // Clean up any stray error SVG elements Mermaid 12 may have injected
        if (typeof document !== "undefined") {
          const strayEl = document.getElementById(`dmermaid-svg-${uniqueId}`);
          if (strayEl) strayEl.remove();
        }
        if (!isCancelled) {
          setError(err?.message || "Error rendering diagram");
        }
      }
    };


    renderDiagram();

    return () => {
      isCancelled = true;
    };
  }, [code, uniqueId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-6 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B0F17] overflow-hidden shadow-xs">
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 text-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Entity Relationship & Architecture Diagram
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-slate-200 dark:border-slate-800 p-0.5 bg-white dark:bg-slate-950 text-[11px]">
            <button
              onClick={() => setShowRaw(false)}
              className={`px-2 py-0.5 rounded transition-colors ${
                !showRaw
                  ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-medium"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Visual Diagram
            </button>
            <button
              onClick={() => setShowRaw(true)}
              className={`px-2 py-0.5 rounded transition-colors ${
                showRaw
                  ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-medium"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Mermaid Source
            </button>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-white px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-emerald-500" />
                <span className="text-emerald-500">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {showRaw ? (
        <pre className="p-4 font-mono text-xs overflow-x-auto leading-relaxed bg-slate-900 text-slate-200">
          {code}
        </pre>
      ) : error ? (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 text-xs space-y-2">
          <p className="font-semibold">Unable to render visual diagram:</p>
          <pre className="p-2.5 rounded bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 text-slate-700 dark:text-slate-300 font-mono text-xs overflow-x-auto">
            {code}
          </pre>
        </div>
      ) : svgContent ? (
        <div
          className="p-6 overflow-x-auto flex justify-center bg-slate-50/40 dark:bg-slate-950/40 [&>svg]:max-w-full [&>svg]:h-auto"
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      ) : (
        <div className="p-8 text-center text-xs text-slate-400">Rendering visual diagram...</div>
      )}
    </div>
  );
}

/**
 * Standard Clean Code Block
 */
function CodeBlockViewer({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-900 dark:bg-[#06090E] text-slate-100 overflow-hidden shadow-xs">
      <div className="flex items-center justify-between px-3.5 py-1.5 border-b border-slate-800 bg-slate-950/60 text-[11px] font-mono">
        <span className="text-slate-400 font-semibold lowercase">
          {language || "text"}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400 text-[10px]">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span className="text-[10px]">Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 font-mono text-xs overflow-x-auto leading-relaxed text-slate-200 whitespace-pre">
        {code}
      </pre>
    </div>
  );
}

/**
 * Standard Clean Table
 */
function StandardTableView({ rows }: { rows: string[] }) {
  if (rows.length < 2) return null;

  const headerRow = rows[0]
    .split("|")
    .map((c) => c.trim())
    .filter((c, idx, arr) => idx !== 0 && idx !== arr.length - 1);

  const dataRows = rows
    .slice(2)
    .map((r) =>
      r
        .split("|")
        .map((c) => c.trim())
        .filter((c, idx, arr) => idx !== 0 && idx !== arr.length - 1)
    )
    .filter((r) => r.length > 0);

  return (
    <div className="my-4 overflow-x-auto rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <table className="w-full text-xs text-left border-collapse">
        <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
          <tr>
            {headerRow.map((h, idx) => (
              <th key={idx} className="px-3.5 py-2 font-mono text-[11px]">
                {renderCleanInline(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {dataRows.map((r, rowIdx) => (
            <tr key={rowIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              {r.map((cell, cellIdx) => (
                <td key={cellIdx} className="px-3.5 py-2 text-slate-600 dark:text-slate-300">
                  {renderCleanInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Developer Docs Callout Box
 */
function StandardAlertCallout({
  type,
  lines,
}: {
  type: "NOTE" | "TIP" | "IMPORTANT" | "WARNING" | "CAUTION";
  lines: string[];
}) {
  const getStyle = () => {
    switch (type) {
      case "NOTE":
        return {
          icon: <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
          border: "border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/30",
          title: "Note",
          titleClass: "text-blue-800 dark:text-blue-300",
        };
      case "TIP":
        return {
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
          border: "border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/30",
          title: "Tip",
          titleClass: "text-emerald-800 dark:text-emerald-300",
        };
      case "IMPORTANT":
        return {
          icon: <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />,
          border: "border-purple-200 dark:border-purple-900/60 bg-purple-50/60 dark:bg-purple-950/30",
          title: "Important",
          titleClass: "text-purple-800 dark:text-purple-300",
        };
      case "WARNING":
        return {
          icon: <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
          border: "border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/30",
          title: "Warning",
          titleClass: "text-amber-800 dark:text-amber-300",
        };
      case "CAUTION":
        return {
          icon: <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />,
          border: "border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/30",
          title: "Caution",
          titleClass: "text-rose-800 dark:text-rose-300",
        };
    }
  };

  const style = getStyle();

  return (
    <div className={`my-3 p-3.5 rounded-lg border ${style.border} space-y-1`}>
      <div className={`flex items-center gap-1.5 text-xs font-semibold ${style.titleClass}`}>
        {style.icon}
        <span>{style.title}</span>
      </div>
      <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 space-y-1">
        {lines.map((l, idx) => (
          <p key={idx} className="leading-relaxed">
            {renderCleanInline(l)}
          </p>
        ))}
      </div>
    </div>
  );
}

/**
 * Clean inline markdown parser
 */
function renderCleanInline(text: string): React.ReactNode {
  if (!text) return null;

  const parts = text.split(/(`[^`]+`)/g);

  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
    return (
      <React.Fragment key={index}>
        {boldParts.map((bPart, bIdx) => {
          if (bPart.startsWith("**") && bPart.endsWith("**")) {
            return (
              <strong key={bIdx} className="font-semibold text-slate-900 dark:text-white">
                {bPart.slice(2, -2)}
              </strong>
            );
          }

          const linkParts = bPart.split(/(\[[^\]]+\]\([^)]+\))/g);
          return linkParts.map((lPart, lIdx) => {
            const linkMatch = lPart.match(/\[([^\]]+)\]\(([^)]+)\)/);
            if (linkMatch) {
              return (
                <span
                  key={lIdx}
                  className="text-blue-600 dark:text-blue-400 underline underline-offset-2 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  {linkMatch[1]}
                </span>
              );
            }
            return lPart;
          });
        })}
      </React.Fragment>
    );
  });
}

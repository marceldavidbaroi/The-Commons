"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sliders,
  ArrowUpDown,
  ArrowLeft,
  Bell,
  Shield,
  Download,
  CheckCircle2,
  LogOut,
  Save,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { SanctuaryNav } from "@/components/navigation/sanctuary-nav";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/stores/ui-store";
import { useAuthStore } from "@/stores/auth-store";
import { useDiaryStore } from "@/stores/diary-store";
import {
  useUserSession,
  useSignOutMutation,
} from "@/hooks/queries/use-auth";
import {
  useUserProfile,
  useUpdateProfileMutation,
} from "@/hooks/queries/use-profile";
import { useUpdateSortPreferencesMutation } from "@/hooks/queries/use-user-items";
import type { UserSortPreferences, UserEmailPreferences } from "@/types/database";

export default function SettingsPage() {
  const { data: user } = useUserSession();
  const authUser = useAuthStore((state) => state.user);
  const currentUser = authUser || user;

  const { data: profile } = useUserProfile(currentUser?.id);
  const authProfile = useAuthStore((state) => state.profile);
  const currentProfile = profile || authProfile;

  const { mutate: updateProfile, isPending: isSavingProfile } = useUpdateProfileMutation();
  const { mutate: updateSortPref, isPending: isSavingSort } = useUpdateSortPreferencesMutation();
  const { mutate: signOut, isPending: isSigningOut } = useSignOutMutation();

  // Zustand UI state
  const broadsheetDensity = useUIStore((state) => state.broadsheetDensity);
  const setBroadsheetDensity = useUIStore((state) => state.setBroadsheetDensity);
  const fontSizeScale = useUIStore((state) => state.fontSizeScale);
  const setFontSizeScale = useUIStore((state) => state.setFontSizeScale);
  const readingMode = useUIStore((state) => state.readingMode);
  const setReadingMode = useUIStore((state) => state.setReadingMode);

  // Zustand Diary state
  const diaries = useDiaryStore((state) => state.diaries);

  // Local Form States
  const [sortBy, setSortBy] = useState<UserSortPreferences["default_sort_by"]>(
    currentProfile?.sort_preferences?.default_sort_by || "created_at"
  );
  const [sortOrder, setSortOrder] = useState<UserSortPreferences["default_sort_order"]>(
    currentProfile?.sort_preferences?.default_sort_order || "desc"
  );
  const [filterFavoritesFirst, setFilterFavoritesFirst] = useState(
    currentProfile?.sort_preferences?.filter_favorites_first ?? true
  );

  const [emailMarketing, setEmailMarketing] = useState(
    currentProfile?.email_preferences?.marketing ?? false
  );
  const [emailDigest, setEmailDigest] = useState(
    currentProfile?.email_preferences?.newsletter ?? true
  );
  const [digestFrequency, setDigestFrequency] = useState<UserEmailPreferences["digest_frequency"]>(
    currentProfile?.email_preferences?.digest_frequency || "weekly"
  );

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Save Curation & Sort Preferences
  const handleSaveSortPreferences = () => {
    updateSortPref(
      {
        sortBy,
        sortOrder,
        filterFavoritesFirst,
      },
      {
        onSuccess: () => {
          showToast("Curation & sorting engine calibrated.");
        },
      }
    );
  };

  // Save Email & Dispatch Preferences
  const handleSaveDispatchPreferences = () => {
    if (!currentUser?.id) {
      showToast("Sanctuary dispatch preferences updated locally.");
      return;
    }

    const updatedEmailPref: UserEmailPreferences = {
      marketing: emailMarketing,
      transactional: true,
      newsletter: emailDigest,
      product_updates: true,
      digest_frequency: digestFrequency,
    };

    updateProfile(
      {
        id: currentUser.id,
        email_preferences: updatedEmailPref,
      },
      {
        onSuccess: () => {
          showToast("Dispatch preferences sealed and updated.");
        },
      }
    );
  };

  // Export Personal Archive JSON
  const handleExportArchive = () => {
    const archiveData = {
      version: "1.0.0",
      exportDate: new Date().toISOString(),
      user: {
        id: currentUser?.id,
        email: currentUser?.email,
      },
      diaries: diaries,
      settings: {
        broadsheetDensity,
        fontSizeScale,
        readingMode,
        sortPreferences: {
          sortBy,
          sortOrder,
          filterFavoritesFirst,
        },
      },
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(archiveData, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `commons-sanctuary-archive-${new Date().toISOString().split("T")[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    showToast("Sanctuary ledger archive exported successfully.");
  };

  // Reset Cache / Local Store
  const handleResetCache = () => {
    if (window.confirm("Are you certain you wish to reset all local UI preferences to default?")) {
      setBroadsheetDensity("editorial");
      setFontSizeScale("md");
      setReadingMode(false);
      showToast("Preferences reset to default broadside configuration.");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-[#C8DFDB] selection:text-[#193836]">
      {/* 1. TOP EDITORIAL NAVIGATION */}
      <SanctuaryNav subtitle="SYSTEM CALIBRATION & PREFERENCES DESK" />

      {/* 2. MASTHEAD FOLIO HEADER */}
      <section className="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-8 pb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="kicker text-[#3368A0] dark:text-[#66A3BF]">
                DESK 04 • SANCTUARY CALIBRATION
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 border border-[#66A3BF] text-[#66A3BF] dark:text-[#C8DFDB] uppercase">
                ACTIVE CONFIGURATION
              </span>
            </div>
            <h1 className="masthead-title text-3xl sm:text-5xl tracking-tight text-foreground mt-1">
              SYSTEM SETTINGS
            </h1>
            <p className="font-serif italic text-sm sm:text-base text-muted-foreground mt-1">
              Calibrate typographic density, curation order, dispatch correspondence, and cryptographic security.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <Link href="/home">
              <Button
                variant="outline"
                size="sm"
                className="border-border hover:border-foreground cursor-pointer font-serif text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                <span>Sanctuary</span>
              </Button>
            </Link>
            <Link href="/citizen-passport">
              <Button
                variant="outline"
                size="sm"
                className="border-border hover:border-[#3368A0] cursor-pointer font-serif"
              >
                <Shield className="h-3.5 w-3.5 mr-1.5 text-[#3368A0]" />
                <span>Citizen Passport</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Folio Bar */}
        <div className="folio-bar w-full py-2 my-2 flex items-center justify-between text-muted-foreground text-xs font-mono">
          <span>DESK 04 — CONFIGURATION</span>
          <span className="font-serif italic text-[#3368A0] dark:text-[#66A3BF]">
            Littera Scripta Manet
          </span>
          <span>AUTUMN / 2026</span>
        </div>
      </section>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 mb-4">
          <div className="p-3 bg-[#3368A0]/15 border border-[#3368A0] text-[#3368A0] dark:text-[#66A3BF] flex items-center justify-between font-mono text-xs animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>{toastMessage}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-xs hover:underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* 3. MAIN SETTINGS GRID */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 pb-16 flex-1 space-y-12">
        
        {/* DESK 1 & DESK 2 ROW */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          
          {/* DESK 1: DISPLAY & TYPOGRAPHIC CALIBRATION */}
          <div className="border-t-2 border-[#3368A0] pt-4 space-y-6">
            
            <div className="flex items-center justify-between">
              <span className="kicker text-[#3368A0] dark:text-[#66A3BF]">
                DESK 1.1 • DISPLAY & TYPOGRAPHY
              </span>
              <Sliders className="h-4 w-4 text-[#3368A0]" />
            </div>

            <div className="space-y-6">
              {/* Density Setting */}
              <div className="space-y-2">
                <label className="text-xs font-mono font-semibold uppercase tracking-wider block text-foreground">
                  Broadsheet Layout Density
                </label>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Controls whitespace margins, column gutter distances, and headline rhythm.
                </p>
                <div className="grid grid-cols-3 gap-2 font-serif text-xs">
                  {[
                    { id: "compact" as const, label: "Compact", desc: "Tight Ledger" },
                    { id: "editorial" as const, label: "Editorial", desc: "Balanced Standard" },
                    { id: "spacious" as const, label: "Spacious", desc: "Wide Monograph" },
                  ].map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        setBroadsheetDensity(d.id);
                        showToast(`Density adjusted to ${d.label}.`);
                      }}
                      className={`p-3 border text-left transition-all cursor-pointer ${
                        broadsheetDensity === d.id
                          ? "border-[#3368A0] bg-[#3368A0]/10 text-[#3368A0] dark:text-[#66A3BF] font-semibold"
                          : "border-border bg-muted/20 text-muted-foreground hover:text-foreground hover:border-foreground/40"
                      }`}
                    >
                      <div className="font-bold">{d.label}</div>
                      <div className="text-[10px] font-mono opacity-80">{d.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size Scaling */}
              <div className="space-y-2 pt-2 border-t border-border/80">
                <label className="text-xs font-mono font-semibold uppercase tracking-wider block text-foreground">
                  Typography Scale
                </label>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Adjusts base reading text size for entries, monographs, and marginalia.
                </p>
                <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                  {[
                    { id: "sm" as const, label: "Standard (14px)", scale: "Standard" },
                    { id: "md" as const, label: "Classic (16px)", scale: "Classic" },
                    { id: "lg" as const, label: "Broadside (18px)", scale: "Broadside" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        setFontSizeScale(f.id);
                        showToast(`Typography scale set to ${f.scale}.`);
                      }}
                      className={`p-3 border text-center transition-all cursor-pointer ${
                        fontSizeScale === f.id
                          ? "border-[#3368A0] bg-[#3368A0]/10 text-[#3368A0] dark:text-[#66A3BF] font-semibold"
                          : "border-border bg-muted/20 text-muted-foreground hover:text-foreground hover:border-foreground/40"
                      }`}
                    >
                      <span>{f.scale}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pure Reading Mode Toggle */}
              <div className="space-y-2 pt-2 border-t border-border/80">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-mono font-semibold uppercase tracking-wider block text-foreground">
                      Sanctuary Pure Reading Mode
                    </label>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Hides utility sidebars and expands writing parchment to full width.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setReadingMode(!readingMode);
                      showToast(`Pure reading mode ${!readingMode ? "engaged" : "disengaged"}.`);
                    }}
                    className={`px-3 py-1.5 border font-mono text-xs transition-colors cursor-pointer ${
                      readingMode
                        ? "bg-[#3368A0] border-[#3368A0] text-white font-semibold"
                        : "bg-muted/30 border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {readingMode ? "ENABLED" : "DISABLED"}
                  </button>
                </div>
              </div>

            </div>

          </div>

          {/* DESK 2: CURATION & SORTING ENGINE */}
          <div className="border-t-2 border-[#8C3A27] pt-4 space-y-6">
            
            <div className="flex items-center justify-between">
              <span className="kicker text-[#8C3A27] dark:text-[#E59375]">
                DESK 1.2 • CURATION & SORTING
              </span>
              <ArrowUpDown className="h-4 w-4 text-[#8C3A27]" />
            </div>

            <div className="space-y-6">
              
              {/* Default Sort By */}
              <div className="space-y-2">
                <label className="text-xs font-mono font-semibold uppercase tracking-wider block text-foreground">
                  Default Chronicles Sort Column
                </label>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  The primary parameter used to arrange your diary manuscripts and ledger entries.
                </p>
                <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                  {[
                    { id: "created_at" as const, label: "Date Inscribed (Created)" },
                    { id: "updated_at" as const, label: "Last Modified" },
                    { id: "title" as const, label: "Chronicle Title" },
                    { id: "sort_order" as const, label: "Manual Custom Order" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSortBy(s.id)}
                      className={`p-2.5 border text-left transition-all cursor-pointer ${
                        sortBy === s.id
                          ? "border-[#8C3A27] bg-[#8C3A27]/10 text-[#8C3A27] dark:text-[#E59375] font-semibold"
                          : "border-border bg-muted/20 text-muted-foreground hover:text-foreground hover:border-foreground/40"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort Order Direction */}
              <div className="space-y-2 pt-2 border-t border-border/80">
                <label className="text-xs font-mono font-semibold uppercase tracking-wider block text-foreground">
                  Chronological Order
                </label>
                <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => setSortOrder("desc")}
                    className={`p-2.5 border text-center transition-all cursor-pointer ${
                      sortOrder === "desc"
                        ? "border-[#8C3A27] bg-[#8C3A27]/10 text-[#8C3A27] dark:text-[#E59375] font-semibold"
                        : "border-border bg-muted/20 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Descending (Newest First)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortOrder("asc")}
                    className={`p-2.5 border text-center transition-all cursor-pointer ${
                      sortOrder === "asc"
                        ? "border-[#8C3A27] bg-[#8C3A27]/10 text-[#8C3A27] dark:text-[#E59375] font-semibold"
                        : "border-border bg-muted/20 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Ascending (Oldest First)
                  </button>
                </div>
              </div>

              {/* Float Favorites First Toggle */}
              <div className="space-y-2 pt-2 border-t border-border/80">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-mono font-semibold uppercase tracking-wider block text-foreground">
                      Prioritize Starred & Favorited Diaries
                    </label>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Pins favorited manuscripts to the top of your archives regardless of date.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFilterFavoritesFirst(!filterFavoritesFirst)}
                    className={`px-3 py-1.5 border font-mono text-xs transition-colors cursor-pointer ${
                      filterFavoritesFirst
                        ? "bg-[#8C3A27] border-[#8C3A27] text-white font-semibold"
                        : "bg-muted/30 border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {filterFavoritesFirst ? "ENABLED" : "DISABLED"}
                  </button>
                </div>
              </div>

              {/* Save Curation Settings Button */}
              <div className="pt-2">
                <Button
                  onClick={handleSaveSortPreferences}
                  disabled={isSavingSort}
                  size="sm"
                  className="bg-[#8C3A27] hover:bg-[#732E1E] text-white font-serif cursor-pointer w-full"
                >
                  {isSavingSort ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      <span>Calibrating Engine...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5 mr-1.5" />
                      <span>Save Curation Preferences</span>
                    </>
                  )}
                </Button>
              </div>

            </div>

          </div>

        </div>

        {/* DESK 3 & DESK 4 ROW */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start border-t-2 border-border pt-8">
          
          {/* DESK 3: DISPATCHES & NOTIFICATIONS */}
          <div className="border-t-2 border-[#C48C28] pt-4 space-y-6">
            
            <div className="flex items-center justify-between">
              <span className="kicker text-[#C48C28] dark:text-[#FBD38D]">
                DESK 2.1 • DISPATCHES & CORRESPONDENCE
              </span>
              <Bell className="h-4 w-4 text-[#C48C28]" />
            </div>

            <div className="space-y-6">
              
              {/* Daily Reminder */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-mono font-semibold uppercase tracking-wider block text-foreground">
                    Sanctuary Daily Inscription Prompt
                  </label>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Receive a gentle morning prompt to maintain your reflective ritual streak.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEmailMarketing(!emailMarketing)}
                  className={`px-3 py-1.5 border font-mono text-xs transition-colors cursor-pointer ${
                    emailMarketing
                      ? "bg-[#C48C28] border-[#C48C28] text-white font-semibold"
                      : "bg-muted/30 border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {emailMarketing ? "ACTIVE" : "PAUSED"}
                </button>
              </div>

              {/* Weekly Digest */}
              <div className="flex items-center justify-between pt-2 border-t border-border/80">
                <div>
                  <label className="text-xs font-mono font-semibold uppercase tracking-wider block text-foreground">
                    Weekly Broadside Editorial Digest
                  </label>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Curated essays, community dialogues, and sanctuary announcements.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEmailDigest(!emailDigest)}
                  className={`px-3 py-1.5 border font-mono text-xs transition-colors cursor-pointer ${
                    emailDigest
                      ? "bg-[#C48C28] border-[#C48C28] text-white font-semibold"
                      : "bg-muted/30 border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {emailDigest ? "ACTIVE" : "PAUSED"}
                </button>
              </div>

              {/* Digest Frequency Selection */}
              <div className="space-y-2 pt-2 border-t border-border/80">
                <label className="text-xs font-mono font-semibold uppercase tracking-wider block text-foreground">
                  Dispatch Frequency Cadence
                </label>
                <div className="grid grid-cols-4 gap-2 font-mono text-xs">
                  {(["daily", "weekly", "monthly", "never"] as const).map((freq) => (
                    <button
                      key={freq}
                      type="button"
                      onClick={() => setDigestFrequency(freq)}
                      className={`p-2 border text-center uppercase transition-all cursor-pointer ${
                        digestFrequency === freq
                          ? "border-[#C48C28] bg-[#C48C28]/10 text-[#C48C28] dark:text-[#FBD38D] font-semibold"
                          : "border-border bg-muted/20 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {freq}
                    </button>
                  ))}
                </div>
              </div>

              {/* Save Dispatch Preferences Button */}
              <div className="pt-2">
                <Button
                  onClick={handleSaveDispatchPreferences}
                  disabled={isSavingProfile}
                  size="sm"
                  className="bg-[#C48C28] hover:bg-[#A8751E] text-white font-serif cursor-pointer w-full"
                >
                  {isSavingProfile ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      <span>Updating Dispatches...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5 mr-1.5" />
                      <span>Update Dispatch Preferences</span>
                    </>
                  )}
                </Button>
              </div>

            </div>

          </div>

          {/* DESK 4: SANCTUARY CRYPTOGRAPHY & DATA PORTABILITY */}
          <div className="border-t-2 border-[#1E2D3D] dark:border-[#66A3BF] pt-4 space-y-6">
            
            <div className="flex items-center justify-between">
              <span className="kicker text-[#1E2D3D] dark:text-[#66A3BF]">
                DESK 2.2 • CRYPTOGRAPHY & DATA PORTABILITY
              </span>
              <Shield className="h-4 w-4 text-[#3368A0]" />
            </div>

            <div className="space-y-6">
              
              {/* Authenticated Ledger Status */}
              <div className="p-3 border border-border bg-muted/30 font-mono text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">ACTIVE CITIZEN:</span>
                  <span className="text-foreground font-semibold truncate max-w-[200px]">
                    {currentUser?.email || "Anonymous Guest"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">SESSION AUTH:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    {currentUser ? "VERIFIED SUPABASE SESSION" : "GUEST LOCAL STORAGE"}
                  </span>
                </div>
              </div>

              {/* Personal Archive Export & Download */}
              <div className="space-y-2 pt-2 border-t border-border/80">
                <label className="text-xs font-mono font-semibold uppercase tracking-wider block text-foreground">
                  Sanctuary Archive Export
                </label>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Download a complete, offline cryptographic JSON ledger containing all your diaries, entries, and settings.
                </p>
                <Button
                  onClick={handleExportArchive}
                  variant="outline"
                  size="sm"
                  className="w-full border-[#3368A0] text-[#3368A0] hover:bg-[#3368A0] hover:text-white font-serif cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  <span>Download Ledger JSON Archive</span>
                </Button>
              </div>

              {/* Reset Cache & Emergency Sign Out */}
              <div className="space-y-3 pt-4 border-t border-border/80">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={handleResetCache}
                    variant="outline"
                    size="sm"
                    className="border-border text-muted-foreground hover:text-foreground font-serif cursor-pointer text-xs"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                    <span>Reset Cache</span>
                  </Button>

                  <Button
                    onClick={() => signOut()}
                    disabled={isSigningOut}
                    variant="outline"
                    size="sm"
                    className="border-destructive/40 text-destructive hover:bg-destructive hover:text-white font-serif cursor-pointer text-xs"
                  >
                    {isSigningOut ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : (
                      <LogOut className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    <span>Exit Sanctuary</span>
                  </Button>
                </div>
              </div>

            </div>

          </div>

        </div>

      </main>

      {/* 4. EDITORIAL FOOTER */}
      <footer className="border-t-2 border-border mt-auto bg-muted/30 py-6 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground font-mono">
          <div>
            <span className="font-bold text-foreground">THE COMMONS</span> — System Calibration & User Preferences.
          </div>
          <div className="flex items-center gap-4">
            <Link href="/home" className="hover:text-foreground">Overview</Link>
            <span>•</span>
            <Link href="/citizen-passport" className="hover:text-foreground">Citizen Passport</Link>
            <span>•</span>
            <Link href="/my-diaries" className="hover:text-foreground">My Diaries</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

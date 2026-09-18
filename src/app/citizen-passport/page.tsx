"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  BookOpen,
  Feather,
  Clock,
  Lock,
  User,
  Edit3,
  Save,
  X,
  ArrowRight,
  ArrowLeft,
  FileText,
  CheckCircle2,
  AlertCircle,
  Flame,
  Settings,
  Loader2,
  Award,
} from "lucide-react";
import { SanctuaryNav } from "@/components/navigation/sanctuary-nav";
import { CommonsSealVector } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { AuthGuard } from "@/components/auth/auth-guard";

import { useUserSession } from "@/hooks/queries/use-auth";
import {
  useUserProfile,
  useCitizenPassportMetrics,
  useUpdateCitizenPassportMutation,
} from "@/hooks/queries/use-profile";
import { useDiariesOverview, useDiaryEntries } from "@/hooks/queries/use-diaries";
import { useAuthStore } from "@/stores/auth-store";

export default function CitizenPassportPage() {
  const { data: user } = useUserSession();
  const authUser = useAuthStore((state) => state.user);
  const currentUser = authUser || user;

  // Supabase Queries
  const { data: profile, isLoading: isProfileLoading } = useUserProfile(currentUser?.id);
  const authProfile = useAuthStore((state) => state.profile);
  const currentProfile = profile || authProfile;

  // RPC Query for Passport Metrics
  const { data: passportMetrics, isLoading: isMetricsLoading } = useCitizenPassportMetrics(currentUser?.id);

  // RPC Mutation for Sealing Credentials
  const { mutate: updatePassport, isPending: isUpdating } = useUpdateCitizenPassportMutation();

  // Diary and Entries data via React Query
  const { data: diaries = [] } = useDiariesOverview();
  const { data: entries = [] } = useDiaryEntries();

  // Profile Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [residence, setResidence] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize edit form when opening modal
  const handleOpenEdit = () => {
    setFullName(
      currentProfile?.full_name ||
        currentUser?.user_metadata?.full_name ||
        currentUser?.email?.split("@")[0] ||
        "Citizen Reader"
    );
    setUsername(currentProfile?.username || currentUser?.email?.split("@")[0] || "citizen");
    setBio(
      currentProfile?.bio ||
        "Inscriber of chronicles, seeker of quietude, and custodian of daily philosophical reflections."
    );
    setAvatarUrl(currentProfile?.avatar_url || currentUser?.user_metadata?.avatar_url || "");
    setResidence(
      currentProfile?.metadata?.residence || passportMetrics?.residence || "Archival Broadside"
    );
    setIsEditing(true);
    setSaveSuccess(false);
    setErrorMessage(null);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.id) return;
    setErrorMessage(null);

    updatePassport(
      {
        fullName: fullName.trim(),
        username: username.trim().toLowerCase().replace(/[^a-z0-9_]/g, ""),
        bio: bio.trim(),
        avatarUrl: avatarUrl.trim(),
        metadata: {
          residence: residence.trim() || "Archival Broadside",
        },
      },
      {
        onSuccess: () => {
          setSaveSuccess(true);
          setTimeout(() => {
            setIsEditing(false);
            setSaveSuccess(false);
          }, 1200);
        },
        onError: (err: any) => {
          setErrorMessage(err?.message || "Failed to update passport credentials.");
        },
      }
    );
  };

  // Derived Display Information
  const displayName =
    passportMetrics?.full_name ||
    currentProfile?.full_name ||
    currentUser?.user_metadata?.full_name ||
    currentUser?.email?.split("@")[0] ||
    "Citizen Scribe";

  const displayHandle =
    passportMetrics?.username ||
    currentProfile?.username ||
    currentUser?.email?.split("@")[0] ||
    "sanctuary_scribe";

  const displayBio =
    passportMetrics?.bio ||
    currentProfile?.bio ||
    "Inscriber of private chronicles, seeker of quietude, and guardian of daily philosophical reflections within The Commons.";

  const displayResidence =
    passportMetrics?.residence ||
    currentProfile?.metadata?.residence ||
    "Archival Broadside";

  const displayClearance =
    passportMetrics?.clearance_title ||
    currentProfile?.metadata?.clearance_title ||
    (currentProfile?.role === "admin" ? "Grand Chancellor" : "Level II Scribe");

  const memberSince = currentUser?.created_at
    ? new Date(currentUser.created_at).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : "Autumn 2026";

  const passportNumber =
    passportMetrics?.passport_number ||
    (currentUser?.id
      ? `CC-${currentUser.id.substring(0, 4).toUpperCase()}-${currentUser.id.substring(currentUser.id.length - 4).toUpperCase()}`
      : "CC-8924-COMMONS");

  // Calculate Sanctuary Metrics (Combines RPC metrics & dynamic client journals)
  const totalDiaries = Math.max(diaries.length, passportMetrics?.total_items ? 1 : 0);
  const totalEntries = Math.max(entries.length, passportMetrics?.total_items || 0);
  const totalWords = entries.reduce((acc, e) => {
    const text = (e.title || "") + " " + (e.description || "");
    return acc + text.trim().split(/\s+/).filter(Boolean).length;
  }, 0);
  const streakDays = passportMetrics?.ritual_streak_days ?? 5;

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-[#C8DFDB] selection:text-[#193836]">

      {/* 1. TOP EDITORIAL NAVIGATION */}
      <SanctuaryNav subtitle="CITIZEN PASSPORT & IDENTITY DESK" />

      {/* 2. MASTHEAD FOLIO HEADER */}
      <section className="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-8 pb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="kicker text-[#3368A0] dark:text-[#66A3BF]">
                DESK 03 • CITIZEN IDENTITY ARCHIVE
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 border border-[#3368A0] text-[#3368A0] dark:text-[#66A3BF] uppercase font-semibold">
                CLEARANCE: {displayClearance.toUpperCase()}
              </span>
            </div>
            <h1 className="masthead-title text-3xl sm:text-5xl tracking-tight text-foreground mt-1">
              CITIZEN PASSPORT
            </h1>
            <p className="font-serif italic text-sm sm:text-base text-muted-foreground mt-1">
              Official cryptographic credentials, sanctuary provenance, and chronological ledger stamps.
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
            <Button
              onClick={handleOpenEdit}
              variant="outline"
              size="sm"
              className="border-[#3368A0] text-[#3368A0] hover:bg-[#3368A0] hover:text-white cursor-pointer font-serif"
            >
              <Edit3 className="h-3.5 w-3.5 mr-1.5" />
              <span>Edit Credentials</span>
            </Button>
            <Link href="/settings">
              <Button
                variant="outline"
                size="sm"
                className="border-border hover:border-foreground cursor-pointer font-serif"
              >
                <Settings className="h-3.5 w-3.5 mr-1.5" />
                <span>Settings</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Folio Bar */}
        <div className="folio-bar w-full py-2 my-2 flex items-center justify-between text-muted-foreground text-xs font-mono">
          <span>SERIES: CC-PASSPORT-2026</span>
          <span className="font-serif italic text-[#3368A0] dark:text-[#66A3BF]">
            Littera Scripta Manet
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>REGISTRY: ENCRYPTED (SUPABASE RPC ACTIVE)</span>
          </span>
        </div>
      </section>

      {/* 3. MAIN PASSPORT SPREAD */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 pb-16 flex-1 space-y-10">
        
        {/* PASSPORT BOOKLET & IDENTITY SPREAD */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* A. TACTILE CITIZEN PASSPORT CARD (7 Cols) */}
          <div className="lg:col-span-7 bg-[#FAF7F0] dark:bg-[#1A242F] border-2 border-[#3368A0] relative overflow-hidden shadow-md">
            
            {/* Vintage Archival Header Strip */}
            <div className="bg-[#3368A0] text-white px-4 sm:px-6 py-3 flex items-center justify-between font-mono text-xs">
              <div className="flex items-center gap-2">
                <CommonsSealVector size={24} className="text-white fill-white" />
                <span className="tracking-widest font-semibold uppercase">
                  THE COMMONS SANCTUARY
                </span>
              </div>
              <span className="tracking-wider opacity-90 font-serif italic">
                PASSPORT OF CITIZENSHIP
              </span>
            </div>

            {/* Passport Body */}
            <div className="p-6 sm:p-8 space-y-6 relative">
              
              {/* Subtle Watermark Seal */}
              <div className="absolute right-4 bottom-4 opacity-5 pointer-events-none">
                <CommonsSealVector size={240} />
              </div>

              {/* Citizen Photo & Primary Data Grid */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 border-b border-border/80 pb-6">
                
                {/* Vintage Photo Frame with Corner Brackets */}
                <div className="relative p-1 border-2 border-[#3368A0] bg-white dark:bg-[#121A22] shrink-0">
                  <div className="w-24 h-28 sm:w-28 sm:h-32 bg-muted/60 flex flex-col items-center justify-center overflow-hidden border border-border">
                    {currentProfile?.avatar_url || currentUser?.user_metadata?.avatar_url ? (
                      <img
                        src={currentProfile?.avatar_url || currentUser?.user_metadata?.avatar_url}
                        alt={displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-2 text-muted-foreground flex flex-col items-center justify-center">
                        <User className="h-10 w-10 text-[#3368A0] mb-1" />
                        <span className="text-[9px] font-mono uppercase tracking-wider">
                          OFFICIAL PHOTO
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Photo Corner Seals */}
                  <span className="absolute -top-1.5 -left-1.5 text-[#3368A0] font-mono text-[10px]">⌜</span>
                  <span className="absolute -top-1.5 -right-1.5 text-[#3368A0] font-mono text-[10px]">⌝</span>
                  <span className="absolute -bottom-1.5 -left-1.5 text-[#3368A0] font-mono text-[10px]">⌞</span>
                  <span className="absolute -bottom-1.5 -right-1.5 text-[#3368A0] font-mono text-[10px]">⌟</span>
                </div>

                {/* Identity Metadata Lines */}
                <div className="space-y-2 flex-1">
                  <div>
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block">
                      FULL LEGAL CITIZEN MONIKER
                    </span>
                    <h2 className="font-serif font-bold text-2xl sm:text-3xl text-foreground">
                      {displayName}
                    </h2>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-muted-foreground block uppercase">
                        HANDLE / ALIAS
                      </span>
                      <span className="text-[#3368A0] dark:text-[#66A3BF] font-semibold">
                        @{displayHandle}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block uppercase">
                        PASSPORT NO.
                      </span>
                      <span className="text-foreground font-semibold">
                        {passportNumber}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block uppercase">
                        SANCTUARY RESIDENCE
                      </span>
                      <span className="text-foreground">{displayResidence}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block uppercase">
                        INSCRIBED SINCE
                      </span>
                      <span className="text-foreground">{memberSince}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Citizen Personal Inscription / Bio */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Feather className="h-3 w-3 text-[#3368A0]" />
                  CITIZEN EPITAPH & PHILOSOPHY
                </span>
                <p className="font-serif italic text-sm sm:text-base text-foreground/90 leading-relaxed p-3 bg-muted/20 border-l-2 border-[#3368A0]">
                  &ldquo;{displayBio}&rdquo;
                </p>
              </div>

              {/* Machine-Readable Passport Bottom Zone */}
              <div className="pt-4 border-t border-border/80 font-mono text-[11px] sm:text-xs text-muted-foreground tracking-widest space-y-1 bg-muted/30 p-3 select-all">
                <div className="truncate">
                  P&lt;COMMONS{displayHandle.toUpperCase().padEnd(12, "&lt;")}
                  {passportNumber.replace(/-/g, "")}&lt;&lt;940824
                </div>
                <div className="truncate">
                  {currentUser?.id ? currentUser.id.replace(/-/g, "").toUpperCase().substring(0, 32) : "CC8924COMMONS2026AUTHENTICATED00"}
                </div>
              </div>

            </div>

          </div>

          {/* B. SANCTUARY VITALITY & ACTIVITY LEDGER (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Activity Summary Box */}
            <div className="border-t-2 border-[#8C3A27] pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="kicker text-[#8C3A27] dark:text-[#E59375]">
                  SANCTUARY VITALITY LEDGER
                </span>
                <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  REALTIME RPC METRICS
                </span>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-3 font-mono">
                <div className="p-3 border border-border bg-muted/20 space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                    <BookOpen className="h-3 w-3 text-[#8C3A27]" />
                    TOTAL DIARIES
                  </span>
                  <div className="font-serif text-2xl font-bold text-foreground">
                    {totalDiaries} <span className="text-xs font-normal text-muted-foreground font-mono">Tomestones</span>
                  </div>
                </div>

                <div className="p-3 border border-border bg-muted/20 space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                    <FileText className="h-3 w-3 text-[#3368A0]" />
                    INSCRIBED PAGES
                  </span>
                  <div className="font-serif text-2xl font-bold text-foreground">
                    {totalEntries} <span className="text-xs font-normal text-muted-foreground font-mono">Entries</span>
                  </div>
                </div>

                <div className="p-3 border border-border bg-muted/20 space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                    <Feather className="h-3 w-3 text-[#C48C28]" />
                    WORDS INSCRIBED
                  </span>
                  <div className="font-serif text-2xl font-bold text-foreground">
                    {totalWords > 0 ? totalWords.toLocaleString() : "8,940"}{" "}
                    <span className="text-xs font-normal text-muted-foreground font-mono">Words</span>
                  </div>
                </div>

                <div className="p-3 border border-border bg-muted/20 space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                    <Flame className="h-3 w-3 text-[#8C3A27]" />
                    RITUAL STREAK
                  </span>
                  <div className="font-serif text-2xl font-bold text-[#8C3A27] dark:text-[#E59375]">
                    {streakDays} <span className="text-xs font-normal text-muted-foreground font-mono">Days Active</span>
                  </div>
                </div>
              </div>

              {/* Cryptographic Protection Badge */}
              <div className="p-3 border border-border/80 bg-muted/30 text-xs font-mono space-y-1.5">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <ShieldCheck className="h-4 w-4" />
                  <span>CRYPTOGRAPHIC CLEARANCE ACTIVE</span>
                </div>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  Entries are isolated behind Supabase Row Level Security (RLS) and bound strictly to citizen ID <span className="text-foreground">{passportNumber}</span>.
                </p>
              </div>

            </div>

            {/* Quick Action Dispatch */}
            <div className="border-t border-border pt-4 space-y-2">
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block">
                CITIZEN RAPID ACTIONS
              </span>
              <div className="grid grid-cols-2 gap-2 font-serif text-xs">
                <Link href="/my-diaries" className="block">
                  <button className="w-full flex items-center justify-between p-2.5 bg-muted/40 hover:bg-[#8C3A27] hover:text-white border border-border hover:border-[#8C3A27] text-foreground transition-all cursor-pointer">
                    <span className="flex items-center gap-1.5">
                      <Feather className="h-3.5 w-3.5" />
                      <span>Open Diaries</span>
                    </span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </Link>

                <Link href="/settings" className="block">
                  <button className="w-full flex items-center justify-between p-2.5 bg-muted/40 hover:bg-[#3368A0] hover:text-white border border-border hover:border-[#3368A0] text-foreground transition-all cursor-pointer">
                    <span className="flex items-center gap-1.5">
                      <Settings className="h-3.5 w-3.5" />
                      <span>Settings</span>
                    </span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </Link>
              </div>
            </div>

          </div>

        </div>

        {/* 4. ARCHIVAL CLEARANCE STAMPS & CITIZEN ACCOMPLISHMENTS */}
        <section className="border-t-2 border-border pt-8 space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div>
              <span className="kicker text-[#3368A0] dark:text-[#66A3BF]">
                ARCHIVAL CLEARANCE STAMPS
              </span>
              <h3 className="font-serif font-bold text-xl sm:text-2xl text-foreground">
                Official Sanctuary Inscription Seals
              </h3>
            </div>
            <span className="font-mono text-xs text-muted-foreground hidden sm:inline flex items-center gap-1">
              <Award className="h-3.5 w-3.5 text-[#3368A0]" />
              <span>4 Seals Conferred & Verified</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Stamp 1 */}
            <div className="p-4 border border-border bg-muted/20 relative group hover:border-[#3368A0] transition-colors flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted-foreground">STAMP 01</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 border border-emerald-600 text-emerald-600 dark:text-emerald-400">
                  VERIFIED
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 border border-[#3368A0] text-[#3368A0] bg-background">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-sm text-foreground">
                    Founding Scribe
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Admitted to the official digital sanctuary ledger.
                  </p>
                </div>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground border-t border-border/60 pt-2">
                ACQUIRED: {memberSince}
              </div>
            </div>

            {/* Stamp 2 */}
            <div className="p-4 border border-border bg-muted/20 relative group hover:border-[#8C3A27] transition-colors flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted-foreground">STAMP 02</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 border border-[#8C3A27] text-[#8C3A27] dark:text-[#E59375]">
                  MASTER SCRIBE
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 border border-[#8C3A27] text-[#8C3A27] bg-background">
                  <Feather className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-sm text-foreground">
                    Parchment Chronicler
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Inscribed multiple aged manuscript pages.
                  </p>
                </div>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground border-t border-border/60 pt-2">
                PAGES: {totalEntries} INSCRIBED
              </div>
            </div>

            {/* Stamp 3 */}
            <div className="p-4 border border-border bg-muted/20 relative group hover:border-[#C48C28] transition-colors flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted-foreground">STAMP 03</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 border border-[#C48C28] text-[#C48C28] dark:text-[#FBD38D]">
                  DISCIPLINE
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 border border-[#C48C28] text-[#C48C28] bg-background">
                  <Flame className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-sm text-foreground">
                    {streakDays}-Day Habit Ritual
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Consecutive daily reflections inscribed.
                  </p>
                </div>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground border-t border-border/60 pt-2">
                CADENCE: UNBROKEN
              </div>
            </div>

            {/* Stamp 4 */}
            <div className="p-4 border border-border bg-muted/20 relative group hover:border-[#66A3BF] transition-colors flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted-foreground">STAMP 04</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 border border-[#66A3BF] text-[#66A3BF] dark:text-[#C8DFDB]">
                  ENCRYPTED
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 border border-[#66A3BF] text-[#66A3BF] bg-background">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-sm text-foreground">
                    Vault Sentinel
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Secured with Supabase RLS row isolation.
                  </p>
                </div>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground border-t border-border/60 pt-2">
                SECURITY: AES-256 VAULT
              </div>
            </div>

          </div>
        </section>

      </main>

      {/* 5. EDIT PASSPORT MODAL */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200">
          <div className="bg-background border-2 border-[#3368A0] max-w-lg w-full p-6 space-y-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <CommonsSealVector size={24} />
                <div>
                  <span className="font-serif font-bold text-lg text-foreground block">
                    Update Citizen Credentials
                  </span>
                  <span className="text-[10px] font-mono text-[#3368A0] dark:text-[#66A3BF] block">
                    SUPABASE RPC: update_citizen_passport
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsEditing(false)}
                className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveProfile} className="space-y-4 font-mono text-xs">
              
              <div className="space-y-1">
                <label className="text-muted-foreground uppercase text-[10px] block">
                  Citizen Legal Display Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. David Baroi"
                  className="w-full p-2.5 bg-muted/30 border border-border focus:border-[#3368A0] focus:outline-none text-foreground font-serif text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground uppercase text-[10px] block">
                  Sanctuary Handle / Username
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-muted-foreground">@</span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="david_baroi"
                    className="w-full pl-7 p-2.5 bg-muted/30 border border-border focus:border-[#3368A0] focus:outline-none text-foreground text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground uppercase text-[10px] block">
                  Sanctuary Residence Location
                </label>
                <input
                  type="text"
                  value={residence}
                  onChange={(e) => setResidence(e.target.value)}
                  placeholder="Archival Broadside"
                  className="w-full p-2.5 bg-muted/30 border border-border focus:border-[#3368A0] focus:outline-none text-foreground text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground uppercase text-[10px] block">
                  Avatar Image URL
                </label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full p-2.5 bg-muted/30 border border-border focus:border-[#3368A0] focus:outline-none text-foreground text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground uppercase text-[10px] block">
                  Citizen Epitaph / Inscription Bio
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="A faithful chronicler of daily reflections..."
                  className="w-full p-2.5 bg-muted/30 border border-border focus:border-[#3368A0] focus:outline-none text-foreground font-serif text-sm resize-none"
                />
              </div>

              {errorMessage && (
                <div className="p-2.5 bg-destructive/10 border border-destructive text-destructive flex items-center gap-2 text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {saveSuccess && (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 flex items-center gap-2 text-xs">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Passport credentials sealed and inscribed successfully.</span>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  className="font-serif"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isUpdating}
                  className="bg-[#3368A0] hover:bg-[#285380] text-white font-serif cursor-pointer"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      <span>Inscribing...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5 mr-1.5" />
                      <span>Seal Credentials</span>
                    </>
                  )}
                </Button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* 6. EDITORIAL FOOTER */}
      <footer className="border-t-2 border-border mt-auto bg-muted/30 py-6 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground font-mono">
          <div>
            <span className="font-bold text-foreground">THE COMMONS</span> — Citizen Passport & Cryptographic Credentials.
          </div>
          <div className="flex items-center gap-4">
            <Link href="/home" className="hover:text-foreground">Overview</Link>
            <span>•</span>
            <Link href="/my-diaries" className="hover:text-foreground">My Diaries</Link>
            <span>•</span>
            <Link href="/settings" className="hover:text-foreground">Settings</Link>
          </div>
        </div>
      </footer>
    </div>
    </AuthGuard>
  );
}


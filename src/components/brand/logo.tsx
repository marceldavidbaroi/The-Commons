"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface CommonsLogoProps {
  /**
   * Layout presentation:
   * - `seal`: Full circular embossed broadside seal with inscription arcs & compass star
   * - `mark`: Minimalist compass star mark with concentric rings (great for small headers/favicons)
   * - `horizontal`: Seal/mark alongside serif editorial logotype
   * - `stacked`: Seal/mark centered above editorial logotype & colophon subtitle
   */
  variant?: "seal" | "mark" | "horizontal" | "stacked";
  /**
   * Predefined size presets or custom scaling
   */
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  /**
   * Optional custom className for the container
   */
  className?: string;
  /**
   * If provided, wraps the logo in a Next.js Link
   */
  href?: string;
  /**
   * Optional custom subtitle (used in horizontal / stacked variants)
   */
  subtitle?: string;
  /**
   * Display mono folio edition tag
   */
  showFolio?: boolean;
}

const sizeMap = {
  xs: 20,
  sm: 28,
  md: 40,
  lg: 64,
  xl: 96,
};

/**
 * The Commons Official Archival Seal & Compass Vector
 */
export function CommonsSealVector({ 
  size = 40, 
  className,
  markOnly = false
}: { 
  size?: number; 
  className?: string;
  markOnly?: boolean;
}) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 160 160" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 select-none", className)}
      aria-label="The Commons Archival Seal"
    >
      <defs>
        <radialGradient id="commonsLogoShine" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#66A3BF" stopOpacity="0.25" />
          <stop offset="60%" stopColor="#3368A0" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#1E2D3D" stopOpacity="0.18" />
        </radialGradient>
      </defs>

      {/* Outer scalloped broadside boundary */}
      <circle 
        cx="80" 
        cy="80" 
        r="74" 
        stroke="currentColor" 
        strokeWidth="1.25" 
        strokeDasharray="3 2" 
        className="text-[#3368A0]/70 dark:text-[#66A3BF]/70"
      />
      <circle 
        cx="80" 
        cy="80" 
        r="68" 
        stroke="currentColor" 
        strokeWidth="1" 
        className="text-[#3368A0]/40 dark:text-[#66A3BF]/40"
      />
      <circle 
        cx="80" 
        cy="80" 
        r="60" 
        fill="url(#commonsLogoShine)" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        className="text-[#3368A0] dark:text-[#66A3BF]"
      />

      {/* Arc Inscription Texts (only shown if not markOnly and size is legible) */}
      {!markOnly && size >= 36 && (
        <>
          <path 
            id="logoPathTop" 
            d="M 28 80 A 52 52 0 0 1 132 80" 
            fill="none" 
          />
          <path 
            id="logoPathBottom" 
            d="M 132 80 A 52 52 0 0 1 28 80" 
            fill="none" 
          />
          
          <text className="text-[7.5px] font-mono tracking-[0.24em] fill-[#3368A0] dark:fill-[#C8DFDB] font-medium uppercase">
            <textPath href="#logoPathTop" startOffset="50%" textAnchor="middle">
              THE COMMONS ARCHIVE
            </textPath>
          </text>
          <text className="text-[6.5px] font-mono tracking-[0.22em] fill-muted-foreground uppercase">
            <textPath href="#logoPathBottom" startOffset="50%" textAnchor="middle">
              LITTERA SCRIPTA MANET
            </textPath>
          </text>
        </>
      )}

      {/* Central Monogram Ring & Heraldic Compass */}
      <circle 
        cx="80" 
        cy="80" 
        r="32" 
        stroke="currentColor" 
        strokeWidth="1.1" 
        className="text-[#3368A0]/50 dark:text-[#66A3BF]/50" 
      />
      
      {/* Outer 4-Point Star Compass */}
      <polygon 
        points="80,54 87,73 106,80 87,87 80,106 73,87 54,80 73,73" 
        fill="currentColor" 
        className="text-[#3368A0] dark:text-[#66A3BF]" 
      />
      
      {/* Inner Inlaid Star */}
      <polygon 
        points="80,63 84,76 97,80 84,84 80,97 76,84 63,80 76,76" 
        fill="white" 
        className="dark:fill-[#0F1722]" 
      />

      {/* Wax Seal Center Dot */}
      <circle 
        cx="80" 
        cy="80" 
        r="3.5" 
        fill="currentColor" 
        className="text-[#8C3A27] dark:text-[#E59375]" 
      />
    </svg>
  );
}

/**
 * Main Logo Component with various layout lockups
 */
export function CommonsLogo({
  variant = "horizontal",
  size = "md",
  className,
  href,
  subtitle,
  showFolio = false,
}: CommonsLogoProps) {
  const pixelSize = typeof size === "number" ? size : sizeMap[size];

  const content = (
    <div
      className={cn(
        "inline-flex items-center group transition-all select-none",
        variant === "stacked" ? "flex-col text-center gap-2" : "gap-3",
        className
      )}
    >
      {/* Seal / Compass Graphic */}
      <CommonsSealVector 
        size={pixelSize} 
        markOnly={variant === "mark"}
        className="transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3" 
      />

      {/* Typography Lockup */}
      {variant !== "seal" && variant !== "mark" && (
        <div className={cn("flex flex-col", variant === "stacked" ? "items-center" : "items-start")}>
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold tracking-tight text-foreground text-lg leading-none group-hover:text-[#3368A0] dark:group-hover:text-[#66A3BF] transition-colors">
              The Commons
            </span>
            {showFolio && (
              <span className="font-mono text-[9.5px] uppercase tracking-widest text-[#3368A0] dark:text-[#66A3BF] border-l border-border pl-2">
                EST. 2026
              </span>
            )}
          </div>
          {subtitle && (
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {content}
      </Link>
    );
  }

  return content;
}

export default CommonsLogo;

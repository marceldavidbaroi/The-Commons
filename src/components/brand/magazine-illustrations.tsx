import React from "react";

/**
 * 1. DAILY DIARY TACTILE BOOK
 */
export function DailyDiaryBookSvg({ className = "w-full max-w-[200px]" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 240"
      className={`${className} drop-shadow-md transition-transform duration-500 hover:scale-105 hover:-rotate-1 cursor-pointer`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="mBookCoverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8C3A27" />
          <stop offset="50%" stopColor="#732E1E" />
          <stop offset="100%" stopColor="#4A1C12" />
        </linearGradient>
        <linearGradient id="mSpineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#5E2214" />
          <stop offset="100%" stopColor="#8C3A27" />
        </linearGradient>
      </defs>

      {/* Book Cover */}
      <rect x="25" y="15" width="270" height="210" rx="10" fill="url(#mBookCoverGrad)" stroke="#4A1C12" strokeWidth="2" />
      <rect x="25" y="15" width="26" height="210" rx="3" fill="url(#mSpineGrad)" />
      <line x1="51" y1="15" x2="51" y2="225" stroke="#3A140B" strokeWidth="2" />
      <line x1="30" y1="40" x2="46" y2="40" stroke="#D4AF37" strokeWidth="1.5" opacity="0.6" />
      <line x1="30" y1="200" x2="46" y2="200" stroke="#D4AF37" strokeWidth="1.5" opacity="0.6" />

      {/* Embossed Border Foil */}
      <rect x="62" y="26" width="222" height="188" rx="6" fill="none" stroke="#C48C28" strokeWidth="1.5" strokeDasharray="6 3" opacity="0.8" />

      {/* Cartouche */}
      <rect x="85" y="55" width="176" height="130" rx="4" fill="#F4EAD4" stroke="#8C3A27" strokeWidth="1.5" />
      <text x="173" y="95" textAnchor="middle" fill="#2C241E" fontFamily="serif" fontSize="18" fontWeight="bold" letterSpacing="0.05em">
        DAILY DIARY
      </text>
      <text x="173" y="115" textAnchor="middle" fill="#8C3A27" fontFamily="monospace" fontSize="9" letterSpacing="0.15em">
        VOL. I — LEAF ARCHIVE
      </text>

      {/* Wax Stamp Seal */}
      <circle cx="173" cy="148" r="18" fill="#8C3A27" />
      <circle cx="173" cy="148" r="15" fill="none" stroke="#FAF4EB" strokeWidth="1" strokeDasharray="2 2" />
      <text x="173" y="152" textAnchor="middle" fill="#FAF4EB" fontFamily="serif" fontSize="11" fontWeight="bold">
        C
      </text>
    </svg>
  );
}

/**
 * 2. GOALS & OBJECTIVES - TACTILE COMPASS & SCROLL
 */
export function GoalsCompassSvg({ className = "w-full max-w-[200px]" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 240"
      className={`${className} drop-shadow-md transition-transform duration-500 hover:scale-105 hover:rotate-1 cursor-pointer`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="compassBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1B3B36" />
          <stop offset="50%" stopColor="#142B28" />
          <stop offset="100%" stopColor="#0B1A18" />
        </linearGradient>
        <radialGradient id="brassGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FBD38D" />
          <stop offset="70%" stopColor="#C48C28" />
          <stop offset="100%" stopColor="#7D5514" />
        </radialGradient>
      </defs>

      {/* Background Plate */}
      <rect x="25" y="15" width="270" height="210" rx="10" fill="url(#compassBgGrad)" stroke="#0B1A18" strokeWidth="2" />
      <rect x="35" y="25" width="250" height="190" rx="6" fill="none" stroke="#C48C28" strokeWidth="1.2" strokeDasharray="4 3" opacity="0.6" />

      {/* Compass Outer Brass Ring */}
      <circle cx="160" cy="115" r="76" fill="#142B28" stroke="url(#brassGrad)" strokeWidth="4" />
      <circle cx="160" cy="115" r="68" fill="#F4EAD4" stroke="#7D5514" strokeWidth="1.5" />

      {/* Dial Degree Ticks */}
      <circle cx="160" cy="115" r="60" fill="none" stroke="#8C3A27" strokeWidth="1" strokeDasharray="2 4" />

      {/* Cardinal Points */}
      <text x="160" y="66" textAnchor="middle" fill="#8C3A27" fontFamily="serif" fontSize="11" fontWeight="bold">N</text>
      <text x="160" y="171" textAnchor="middle" fill="#8C3A27" fontFamily="serif" fontSize="10" fontWeight="bold">S</text>
      <text x="214" y="119" textAnchor="middle" fill="#8C3A27" fontFamily="serif" fontSize="10" fontWeight="bold">E</text>
      <text x="106" y="119" textAnchor="middle" fill="#8C3A27" fontFamily="serif" fontSize="10" fontWeight="bold">W</text>

      {/* Compass Star / Needle */}
      <polygon points="160,72 165,115 160,110 155,115" fill="#8C3A27" stroke="#4A1C12" strokeWidth="1" />
      <polygon points="160,158 165,115 160,120 155,115" fill="#2C241E" opacity="0.8" />
      <polygon points="117,115 160,120 155,115 160,110" fill="#C48C28" />
      <polygon points="203,115 160,120 165,115 160,110" fill="#7D5514" />

      {/* Center Pivot Jewel */}
      <circle cx="160" cy="115" r="6" fill="#D4AF37" stroke="#4A1C12" strokeWidth="1.5" />
      <circle cx="160" cy="115" r="2.5" fill="#8C3A27" />

      {/* Bottom Cartouche Banner */}
      <rect x="80" y="188" width="160" height="26" rx="3" fill="#F4EAD4" stroke="#C48C28" strokeWidth="1.2" />
      <text x="160" y="205" textAnchor="middle" fill="#2C241E" fontFamily="serif" fontSize="11" fontWeight="bold" letterSpacing="0.08em">
        GOALS & ROADMAP
      </text>
    </svg>
  );
}

/**
 * 3. CITIZEN PASSPORT & IDENTITY BOOKLET
 */
export function CitizenPassportSvg({ className = "w-full max-w-[200px]" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 240"
      className={`${className} drop-shadow-md transition-transform duration-500 hover:scale-105 hover:-rotate-1 cursor-pointer`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="passportCoverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E385B" />
          <stop offset="60%" stopColor="#132742" />
          <stop offset="100%" stopColor="#0B1626" />
        </linearGradient>
      </defs>

      {/* Booklet Cover */}
      <rect x="35" y="15" width="250" height="210" rx="8" fill="url(#passportCoverGrad)" stroke="#0B1626" strokeWidth="2" />
      
      {/* Gold Foil Double Border */}
      <rect x="47" y="25" width="226" height="190" rx="5" fill="none" stroke="#D4AF37" strokeWidth="1.5" />
      <rect x="52" y="30" width="216" height="180" rx="3" fill="none" stroke="#D4AF37" strokeWidth="0.8" strokeDasharray="3 2" opacity="0.8" />

      {/* Heraldic Country / Entity Title */}
      <text x="160" y="58" textAnchor="middle" fill="#D4AF37" fontFamily="serif" fontSize="13" fontWeight="bold" letterSpacing="0.18em">
        THE COMMONS
      </text>
      <text x="160" y="72" textAnchor="middle" fill="#F4EAD4" fontFamily="monospace" fontSize="8" letterSpacing="0.2em" opacity="0.8">
        SANCTUARY JURISDICTION
      </text>

      {/* Official Gold Seal Embellishment */}
      <circle cx="160" cy="118" r="32" fill="none" stroke="#D4AF37" strokeWidth="1.5" />
      <circle cx="160" cy="118" r="27" fill="none" stroke="#D4AF37" strokeWidth="0.8" strokeDasharray="2 2" />
      <circle cx="160" cy="118" r="14" fill="#D4AF37" opacity="0.2" />
      
      {/* Heraldic Feather & Quill */}
      <path
        d="M152 130 C154 120 162 110 168 106 C166 114 162 122 156 128 Z"
        fill="#D4AF37"
      />
      <line x1="150" y1="132" x2="170" y2="104" stroke="#D4AF37" strokeWidth="1.2" />

      {/* Document Title */}
      <text x="160" y="174" textAnchor="middle" fill="#D4AF37" fontFamily="serif" fontSize="14" fontWeight="bold" letterSpacing="0.15em">
        CITIZEN PASSPORT
      </text>

      {/* Biometric / Digital Chip Emblem */}
      <rect x="146" y="188" width="28" height="18" rx="2" fill="none" stroke="#D4AF37" strokeWidth="1.2" />
      <line x1="146" y1="197" x2="174" y2="197" stroke="#D4AF37" strokeWidth="1" />
      <rect x="154" y="192" width="12" height="10" rx="1" fill="#D4AF37" opacity="0.4" />
    </svg>
  );
}

/**
 * 4. TAG MANAGEMENT - ANTIQUE BRASS INDEX PLATE
 */
export function TagsIndexPlateSvg({ className = "w-full max-w-[200px]" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 240"
      className={`${className} drop-shadow-md transition-transform duration-500 hover:scale-105 hover:rotate-1 cursor-pointer`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="woodBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B2618" />
          <stop offset="50%" stopColor="#2A1B11" />
          <stop offset="100%" stopColor="#1B110A" />
        </linearGradient>
        <linearGradient id="brassFrame" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E2B755" />
          <stop offset="50%" stopColor="#B38022" />
          <stop offset="100%" stopColor="#6E4C0D" />
        </linearGradient>
      </defs>

      {/* Wood Drawer Background */}
      <rect x="25" y="15" width="270" height="210" rx="8" fill="url(#woodBg)" stroke="#1B110A" strokeWidth="2" />

      {/* Brass Label Holder Plate */}
      <rect x="45" y="45" width="230" height="150" rx="6" fill="url(#brassFrame)" stroke="#4A320A" strokeWidth="2" />
      <rect x="52" y="52" width="216" height="136" rx="4" fill="#3D2908" opacity="0.3" />

      {/* Rivet Screws on Brass Holder */}
      <circle cx="58" cy="58" r="4" fill="#6E4C0D" stroke="#E2B755" strokeWidth="0.8" />
      <line x1="56" y1="58" x2="60" y2="58" stroke="#1B110A" strokeWidth="1" />

      <circle cx="262" cy="58" r="4" fill="#6E4C0D" stroke="#E2B755" strokeWidth="0.8" />
      <line x1="260" y1="58" x2="264" y2="58" stroke="#1B110A" strokeWidth="1" />

      <circle cx="58" cy="182" r="4" fill="#6E4C0D" stroke="#E2B755" strokeWidth="0.8" />
      <line x1="56" y1="182" x2="60" y2="182" stroke="#1B110A" strokeWidth="1" />

      <circle cx="262" cy="182" r="4" fill="#6E4C0D" stroke="#E2B755" strokeWidth="0.8" />
      <line x1="260" y1="182" x2="264" y2="182" stroke="#1B110A" strokeWidth="1" />

      {/* Ivory Paper Card Insert */}
      <rect x="68" y="65" width="184" height="110" rx="3" fill="#F4EAD4" stroke="#8C3A27" strokeWidth="1.2" />
      <rect x="74" y="71" width="172" height="98" rx="2" fill="none" stroke="#C48C28" strokeWidth="0.8" strokeDasharray="3 2" />

      {/* Paper Label Typography */}
      <text x="160" y="98" textAnchor="middle" fill="#8C3A27" fontFamily="monospace" fontSize="9" letterSpacing="0.18em">
        TAXONOMY & ARCHIVE
      </text>
      <text x="160" y="124" textAnchor="middle" fill="#2C241E" fontFamily="serif" fontSize="17" fontWeight="bold" letterSpacing="0.05em">
        TAG INDEX
      </text>

      {/* Sample Colored Tag Pills inside */}
      <rect x="92" y="140" width="40" height="16" rx="2" fill="#8C3A27" />
      <text x="112" y="151" textAnchor="middle" fill="#FAF4EB" fontFamily="monospace" fontSize="8">#life</text>

      <rect x="138" y="140" width="44" height="16" rx="2" fill="#3368A0" />
      <text x="160" y="151" textAnchor="middle" fill="#FAF4EB" fontFamily="monospace" fontSize="8">#craft</text>

      <rect x="188" y="140" width="40" height="16" rx="2" fill="#6B8E23" />
      <text x="208" y="151" textAnchor="middle" fill="#FAF4EB" fontFamily="monospace" fontSize="8">#zen</text>
    </svg>
  );
}

/**
 * 5. SYSTEM SETTINGS - ANTIQUE CHRONOMETER & DIAL
 */
export function SettingsDialSvg({ className = "w-full max-w-[200px]" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 240"
      className={`${className} drop-shadow-md transition-transform duration-500 hover:scale-105 hover:-rotate-1 cursor-pointer`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="settingsPlateGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#25323D" />
          <stop offset="50%" stopColor="#19232B" />
          <stop offset="100%" stopColor="#0F161C" />
        </linearGradient>
        <radialGradient id="gearGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#E2B755" />
          <stop offset="70%" stopColor="#A37418" />
          <stop offset="100%" stopColor="#5E3F05" />
        </radialGradient>
      </defs>

      {/* Instrument Casing */}
      <rect x="25" y="15" width="270" height="210" rx="8" fill="url(#settingsPlateGrad)" stroke="#0F161C" strokeWidth="2" />
      <rect x="35" y="25" width="250" height="190" rx="5" fill="none" stroke="#66A3BF" strokeWidth="1" strokeDasharray="4 3" opacity="0.5" />

      {/* Dial Casing Gear Ring */}
      <circle cx="160" cy="115" r="74" fill="#141C22" stroke="url(#gearGrad)" strokeWidth="3" />
      <circle cx="160" cy="115" r="66" fill="#F4EAD4" stroke="#5E3F05" strokeWidth="1.5" />

      {/* Calibrated Ticks */}
      <circle cx="160" cy="115" r="58" fill="none" stroke="#3368A0" strokeWidth="1" strokeDasharray="2 3" />

      {/* Gear Teeth Overlay */}
      <path
        d="M160 65 L160 55 M160 165 L160 175 M110 115 L100 115 M210 115 L220 115 M125 80 L118 73 M195 150 L202 157 M125 150 L118 157 M195 80 L202 73"
        stroke="#5E3F05"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Inner Instrument Details */}
      <circle cx="160" cy="115" r="30" fill="#19232B" stroke="#A37418" strokeWidth="1.5" />
      
      {/* Setting Dial Indicator */}
      <line x1="160" y1="115" x2="160" y2="76" stroke="#8C3A27" strokeWidth="2" strokeLinecap="round" />
      <circle cx="160" cy="115" r="6" fill="#D4AF37" stroke="#4A1C12" strokeWidth="1.5" />
      <circle cx="160" cy="115" r="2.5" fill="#8C3A27" />

      {/* Bottom Cartouche Banner */}
      <rect x="80" y="188" width="160" height="26" rx="3" fill="#F4EAD4" stroke="#66A3BF" strokeWidth="1.2" />
      <text x="160" y="205" textAnchor="middle" fill="#2C241E" fontFamily="serif" fontSize="11" fontWeight="bold" letterSpacing="0.08em">
        SYSTEM SETTINGS
      </text>
    </svg>
  );
}

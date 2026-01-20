export const SVG_SPRITES: Record<string, string> = {
  residential1: `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">
    <defs>
      <linearGradient id="roofGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#9b5530"/>
        <stop offset="50%" style="stop-color:#8b4513"/>
        <stop offset="100%" style="stop-color:#654321"/>
      </linearGradient>
      <linearGradient id="roofShine1" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:rgba(139,69,19,0.3)"/>
        <stop offset="50%" style="stop-color:rgba(155,85,48,0.5)"/>
        <stop offset="100%" style="stop-color:rgba(139,69,19,0.3)"/>
      </linearGradient>
    </defs>
    <!-- Shadow -->
    <ellipse cx="30" cy="56" rx="26" ry="3" fill="rgba(0,0,0,0.4)"/>
    <!-- Roof (pure top-down - only roof visible) -->
    <rect x="5" y="5" width="50" height="50" fill="url(#roofGrad1)" stroke="#5a3a1a" stroke-width="2"/>
    <!-- Roof tiles/shingles pattern -->
    <line x1="5" y1="15" x2="55" y2="15" stroke="rgba(101,67,33,0.4)" stroke-width="1"/>
    <line x1="5" y1="25" x2="55" y2="25" stroke="rgba(101,67,33,0.4)" stroke-width="1"/>
    <line x1="5" y1="35" x2="55" y2="35" stroke="rgba(101,67,33,0.4)" stroke-width="1"/>
    <line x1="5" y1="45" x2="55" y2="45" stroke="rgba(101,67,33,0.4)" stroke-width="1"/>
    <!-- Roof ridge highlight -->
    <rect x="5" y="5" width="50" height="8" fill="url(#roofShine1)"/>
    <!-- Chimney (top-down view) -->
    <rect x="42" y="12" width="8" height="8" fill="#6b4a2a" stroke="#4a3a1a" stroke-width="1.5"/>
    <rect x="43" y="13" width="6" height="6" fill="#5a3a1a"/>
    <!-- Chimney smoke shadow -->
    <ellipse cx="46" cy="10" rx="3" ry="2" fill="rgba(100,100,100,0.3)"/>
  </svg>`,

  commercial1: `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">
    <defs>
      <linearGradient id="buildGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#6a7a8a"/>
        <stop offset="50%" style="stop-color:#5a6a7a"/>
        <stop offset="100%" style="stop-color:#4a5a6a"/>
      </linearGradient>
    </defs>
    <!-- Shadow -->
    <ellipse cx="30" cy="56" rx="27" ry="3" fill="rgba(0,0,0,0.4)"/>
    <!-- Flat roof (pure top-down - only roof visible) -->
    <rect x="4" y="4" width="52" height="52" fill="url(#buildGrad1)" stroke="#3a4a5a" stroke-width="2"/>
    <!-- Roof edge/parapet detail -->
    <rect x="4" y="4" width="52" height="52" fill="none" stroke="#7a8a9a" stroke-width="1" stroke-dasharray="2,2"/>
    <!-- Skylight panels (glass on roof) -->
    <rect x="10" y="10" width="12" height="12" fill="rgba(106,184,232,0.5)" stroke="#4a6a8a" stroke-width="1"/>
    <rect x="28" y="10" width="12" height="12" fill="rgba(106,184,232,0.5)" stroke="#4a6a8a" stroke-width="1"/>
    <rect x="10" y="28" width="12" height="12" fill="rgba(106,184,232,0.5)" stroke="#4a6a8a" stroke-width="1"/>
    <rect x="28" y="28" width="12" height="12" fill="rgba(106,184,232,0.5)" stroke="#4a6a8a" stroke-width="1"/>
    <!-- AC units on roof -->
    <rect x="46" y="8" width="6" height="6" fill="#6a6a6a" stroke="#3a3a3a" stroke-width="1"/>
    <rect x="46" y="18" width="6" height="6" fill="#6a6a6a" stroke="#3a3a3a" stroke-width="1"/>
    <rect x="8" y="46" width="6" height="6" fill="#6a6a6a" stroke="#3a3a3a" stroke-width="1"/>
    <rect x="18" y="46" width="6" height="6" fill="#6a6a6a" stroke="#3a3a3a" stroke-width="1"/>
    <!-- AC vents -->
    <line x1="47" y1="10" x2="51" y2="10" stroke="#4a4a4a" stroke-width="0.5"/>
    <line x1="47" y1="12" x2="51" y2="12" stroke="#4a4a4a" stroke-width="0.5"/>
    <line x1="47" y1="20" x2="51" y2="20" stroke="#4a4a4a" stroke-width="0.5"/>
    <line x1="47" y1="22" x2="51" y2="22" stroke="#4a4a4a" stroke-width="0.5"/>
  </svg>`,

  industrial1: `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">
    <defs>
      <linearGradient id="factGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#8a8a8a"/>
        <stop offset="50%" style="stop-color:#7a7a7a"/>
        <stop offset="100%" style="stop-color:#6a6a6a"/>
      </linearGradient>
    </defs>
    <!-- Shadow -->
    <ellipse cx="30" cy="56" rx="28" ry="3" fill="rgba(0,0,0,0.4)"/>
    <!-- Metal roof (pure top-down - only roof visible) -->
    <rect x="3" y="3" width="54" height="54" fill="url(#factGrad1)" stroke="#5a5a5a" stroke-width="2"/>
    <!-- Corrugated metal panels (horizontal lines) -->
    <line x1="3" y1="10" x2="57" y2="10" stroke="#9a9a9a" stroke-width="1"/>
    <line x1="3" y1="17" x2="57" y2="17" stroke="#9a9a9a" stroke-width="1"/>
    <line x1="3" y1="24" x2="57" y2="24" stroke="#9a9a9a" stroke-width="1"/>
    <line x1="3" y1="31" x2="57" y2="31" stroke="#9a9a9a" stroke-width="1"/>
    <line x1="3" y1="38" x2="57" y2="38" stroke="#9a9a9a" stroke-width="1"/>
    <line x1="3" y1="45" x2="57" y2="45" stroke="#9a9a9a" stroke-width="1"/>
    <line x1="3" y1="52" x2="57" y2="52" stroke="#9a9a9a" stroke-width="1"/>
    <!-- Panel shadows for depth -->
    <line x1="3" y1="11" x2="57" y2="11" stroke="rgba(0,0,0,0.2)" stroke-width="0.5"/>
    <line x1="3" y1="18" x2="57" y2="18" stroke="rgba(0,0,0,0.2)" stroke-width="0.5"/>
    <line x1="3" y1="25" x2="57" y2="25" stroke="rgba(0,0,0,0.2)" stroke-width="0.5"/>
    <line x1="3" y1="32" x2="57" y2="32" stroke="rgba(0,0,0,0.2)" stroke-width="0.5"/>
    <line x1="3" y1="39" x2="57" y2="39" stroke="rgba(0,0,0,0.2)" stroke-width="0.5"/>
    <line x1="3" y1="46" x2="57" y2="46" stroke="rgba(0,0,0,0.2)" stroke-width="0.5"/>
    <!-- Smokestacks (top-down view - circular) -->
    <circle cx="15" cy="15" r="5" fill="#5a5a5a" stroke="#3a3a3a" stroke-width="1.5"/>
    <circle cx="15" cy="15" r="3" fill="#4a4a4a"/>
    <circle cx="45" cy="15" r="5" fill="#5a5a5a" stroke="#3a3a3a" stroke-width="1.5"/>
    <circle cx="45" cy="15" r="3" fill="#4a4a4a"/>
    <!-- Smoke from stacks -->
    <ellipse cx="15" cy="10" rx="4" ry="3" fill="rgba(140,140,140,0.4)"/>
    <ellipse cx="13" cy="7" rx="3" ry="2" fill="rgba(160,160,160,0.3)"/>
    <ellipse cx="45" cy="10" rx="4" ry="3" fill="rgba(140,140,140,0.4)"/>
    <ellipse cx="47" cy="7" rx="3" ry="2" fill="rgba(160,160,160,0.3)"/>
    <!-- Roof vents/skylights -->
    <rect x="25" y="25" width="10" height="10" fill="rgba(90,122,154,0.3)" stroke="#4a5a6a" stroke-width="1"/>
  </svg>`,

  residential2: `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">
    <defs>
      <linearGradient id="gableGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:#7a4a2a"/>
        <stop offset="50%" style="stop-color:#9a6a4a"/>
        <stop offset="100%" style="stop-color:#7a4a2a"/>
      </linearGradient>
      <linearGradient id="gableRidge" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#aa7a5a"/>
        <stop offset="100%" style="stop-color:#7a4a2a"/>
      </linearGradient>
    </defs>
    <!-- Shadow -->
    <ellipse cx="30" cy="56" rx="25" ry="3" fill="rgba(0,0,0,0.4)"/>
    <!-- Gable roof (top-down view with center ridge) -->
    <rect x="6" y="6" width="48" height="48" fill="url(#gableGrad)" stroke="#5a3a1a" stroke-width="2"/>
    <!-- Center ridge line -->
    <rect x="6" y="28" width="48" height="4" fill="url(#gableRidge)"/>
    <line x1="6" y1="30" x2="54" y2="30" stroke="#aa8a6a" stroke-width="2"/>
    <!-- Roof slope indicators (angled lines from center) -->
    <line x1="30" y1="30" x2="10" y2="10" stroke="rgba(101,67,33,0.3)" stroke-width="1"/>
    <line x1="30" y1="30" x2="50" y2="10" stroke="rgba(101,67,33,0.3)" stroke-width="1"/>
    <line x1="30" y1="30" x2="10" y2="50" stroke="rgba(101,67,33,0.3)" stroke-width="1"/>
    <line x1="30" y1="30" x2="50" y2="50" stroke="rgba(101,67,33,0.3)" stroke-width="1"/>
    <!-- Shingles pattern -->
    <line x1="6" y1="15" x2="54" y2="15" stroke="rgba(90,58,26,0.4)" stroke-width="0.8"/>
    <line x1="6" y1="22" x2="54" y2="22" stroke="rgba(90,58,26,0.4)" stroke-width="0.8"/>
    <line x1="6" y1="38" x2="54" y2="38" stroke="rgba(90,58,26,0.4)" stroke-width="0.8"/>
    <line x1="6" y1="45" x2="54" y2="45" stroke="rgba(90,58,26,0.4)" stroke-width="0.8"/>
  </svg>`,

  residential3: `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">
    <defs>
      <radialGradient id="hipGrad" cx="50%" cy="50%">
        <stop offset="0%" style="stop-color:#aa7a5a"/>
        <stop offset="50%" style="stop-color:#8a5a3a"/>
        <stop offset="100%" style="stop-color:#6a3a1a"/>
      </radialGradient>
    </defs>
    <!-- Shadow -->
    <ellipse cx="30" cy="56" rx="26" ry="3" fill="rgba(0,0,0,0.4)"/>
    <!-- Hip roof (all sides slope to center - top-down view) -->
    <rect x="5" y="5" width="50" height="50" fill="url(#hipGrad)" stroke="#5a3a1a" stroke-width="2"/>
    <!-- Hip ridge lines (form a rectangle in center) -->
    <rect x="20" y="20" width="20" height="20" fill="#ba8a6a" stroke="#8a5a3a" stroke-width="1.5"/>
    <!-- Slope lines from corners to center ridge -->
    <line x1="5" y1="5" x2="20" y2="20" stroke="rgba(138,90,58,0.5)" stroke-width="1.5"/>
    <line x1="55" y1="5" x2="40" y2="20" stroke="rgba(138,90,58,0.5)" stroke-width="1.5"/>
    <line x1="5" y1="55" x2="20" y2="40" stroke="rgba(138,90,58,0.5)" stroke-width="1.5"/>
    <line x1="55" y1="55" x2="40" y2="40" stroke="rgba(138,90,58,0.5)" stroke-width="1.5"/>
    <!-- Shingles on slopes -->
    <line x1="5" y1="15" x2="55" y2="15" stroke="rgba(106,58,26,0.3)" stroke-width="0.8"/>
    <line x1="5" y1="25" x2="55" y2="25" stroke="rgba(106,58,26,0.3)" stroke-width="0.8"/>
    <line x1="5" y1="35" x2="55" y2="35" stroke="rgba(106,58,26,0.3)" stroke-width="0.8"/>
    <line x1="5" y1="45" x2="55" y2="45" stroke="rgba(106,58,26,0.3)" stroke-width="0.8"/>
    <!-- Dormer window (small skylight) -->
    <rect x="26" y="14" width="8" height="6" fill="rgba(106,184,232,0.6)" stroke="#5a7a9a" stroke-width="1"/>
  </svg>`,

  commercial2: `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">
    <defs>
      <linearGradient id="buildGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#7a8a9a"/>
        <stop offset="50%" style="stop-color:#6a7a8a"/>
        <stop offset="100%" style="stop-color:#5a6a7a"/>
      </linearGradient>
    </defs>
    <!-- Shadow -->
    <ellipse cx="30" cy="56" rx="27" ry="3" fill="rgba(0,0,0,0.4)"/>
    <!-- Flat roof (pure top-down) -->
    <rect x="4" y="4" width="52" height="52" fill="url(#buildGrad2)" stroke="#3a4a5a" stroke-width="2"/>
    <!-- Rooftop equipment (HVAC units, generators) -->
    <rect x="8" y="8" width="10" height="8" fill="#7a7a7a" stroke="#4a4a4a" stroke-width="1.5"/>
    <rect x="9" y="9" width="8" height="6" fill="#6a6a6a"/>
    <circle cx="13" cy="12" r="2" fill="#5a5a5a" stroke="#3a3a3a" stroke-width="1"/>

    <rect x="24" y="8" width="12" height="10" fill="#7a7a7a" stroke="#4a4a4a" stroke-width="1.5"/>
    <rect x="25" y="9" width="10" height="8" fill="#6a6a6a"/>
    <line x1="26" y1="11" x2="34" y2="11" stroke="#5a5a5a" stroke-width="0.8"/>
    <line x1="26" y1="13" x2="34" y2="13" stroke="#5a5a5a" stroke-width="0.8"/>
    <line x1="26" y1="15" x2="34" y2="15" stroke="#5a5a5a" stroke-width="0.8"/>

    <rect x="42" y="8" width="10" height="8" fill="#7a7a7a" stroke="#4a4a4a" stroke-width="1.5"/>
    <rect x="43" y="9" width="8" height="6" fill="#6a6a6a"/>
    <rect x="45" y="10" width="4" height="4" fill="#5a5a5a"/>

    <!-- Roof access door -->
    <rect x="10" y="44" width="8" height="10" fill="#8a7a6a" stroke="#5a4a3a" stroke-width="1.5"/>
    <circle cx="16" cy="49" r="1" fill="#4a4a4a"/>

    <!-- Satellite dish -->
    <ellipse cx="45" cy="45" rx="5" ry="3" fill="#9a9a9a" stroke="#6a6a6a" stroke-width="1"/>
    <rect x="44" y="45" width="2" height="6" fill="#7a7a7a"/>
  </svg>`,

  commercial3: `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">
    <defs>
      <linearGradient id="modernGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#8a9aaa"/>
        <stop offset="50%" style="stop-color:#7a8a9a"/>
        <stop offset="100%" style="stop-color:#6a7a8a"/>
      </linearGradient>
      <linearGradient id="solarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#1a2a4a"/>
        <stop offset="50%" style="stop-color:#0a1a3a"/>
        <stop offset="100%" style="stop-color:#1a2a4a"/>
      </linearGradient>
    </defs>
    <!-- Shadow -->
    <ellipse cx="30" cy="56" rx="27" ry="3" fill="rgba(0,0,0,0.4)"/>
    <!-- Modern flat roof -->
    <rect x="4" y="4" width="52" height="52" fill="url(#modernGrad)" stroke="#3a4a5a" stroke-width="2"/>
    <!-- Solar panel array (grid of panels) -->
    <rect x="8" y="8" width="44" height="28" fill="url(#solarGrad)" stroke="#2a3a5a" stroke-width="1.5"/>
    <!-- Solar panel grid lines -->
    <line x1="19" y1="8" x2="19" y2="36" stroke="#3a4a6a" stroke-width="1"/>
    <line x1="30" y1="8" x2="30" y2="36" stroke="#3a4a6a" stroke-width="1"/>
    <line x1="41" y1="8" x2="41" y2="36" stroke="#3a4a6a" stroke-width="1"/>
    <line x1="8" y1="15" x2="52" y2="15" stroke="#3a4a6a" stroke-width="1"/>
    <line x1="8" y1="22" x2="52" y2="22" stroke="#3a4a6a" stroke-width="1"/>
    <line x1="8" y1="29" x2="52" y2="29" stroke="#3a4a6a" stroke-width="1"/>
    <!-- Solar panel reflections -->
    <rect x="10" y="10" width="7" height="4" fill="rgba(106,164,232,0.3)"/>
    <rect x="32" y="24" width="7" height="4" fill="rgba(106,164,232,0.3)"/>
    <rect x="43" y="17" width="7" height="4" fill="rgba(106,164,232,0.3)"/>
    <!-- Inverter boxes -->
    <rect x="10" y="42" width="8" height="6" fill="#6a6a6a" stroke="#4a4a4a" stroke-width="1"/>
    <rect x="22" y="42" width="8" height="6" fill="#6a6a6a" stroke="#4a4a4a" stroke-width="1"/>
    <!-- Green roof section -->
    <rect x="38" y="40" width="14" height="12" fill="#5a8c45" stroke="#3a6c25" stroke-width="1"/>
    <circle cx="42" cy="44" r="1.5" fill="#6a9c55" opacity="0.6"/>
    <circle cx="46" cy="46" r="1.5" fill="#6a9c55" opacity="0.6"/>
    <circle cx="49" cy="43" r="1.5" fill="#6a9c55" opacity="0.6"/>
  </svg>`,

  industrial2: `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">
    <defs>
      <linearGradient id="sawtoothGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#9a9a9a"/>
        <stop offset="50%" style="stop-color:#7a7a7a"/>
        <stop offset="100%" style="stop-color:#6a6a6a"/>
      </linearGradient>
    </defs>
    <!-- Shadow -->
    <ellipse cx="30" cy="56" rx="28" ry="3" fill="rgba(0,0,0,0.4)"/>
    <!-- Sawtooth roof base -->
    <rect x="3" y="3" width="54" height="54" fill="url(#sawtoothGrad)" stroke="#5a5a5a" stroke-width="2"/>
    <!-- Sawtooth pattern (alternating slopes in top-down view) -->
    <polygon points="3,10 15,10 15,20 3,20" fill="#8a8a8a" stroke="#6a6a6a" stroke-width="1"/>
    <polygon points="15,10 27,10 27,20 15,20" fill="#7a7a7a" stroke="#5a5a5a" stroke-width="1"/>
    <polygon points="27,10 39,10 39,20 27,20" fill="#8a8a8a" stroke="#6a6a6a" stroke-width="1"/>
    <polygon points="39,10 51,10 51,20 39,20" fill="#7a7a7a" stroke="#5a5a5a" stroke-width="1"/>

    <polygon points="3,23 15,23 15,33 3,33" fill="#7a7a7a" stroke="#5a5a5a" stroke-width="1"/>
    <polygon points="15,23 27,23 27,33 15,33" fill="#8a8a8a" stroke="#6a6a6a" stroke-width="1"/>
    <polygon points="27,23 39,23 39,33 27,33" fill="#7a7a7a" stroke="#5a5a5a" stroke-width="1"/>
    <polygon points="39,23 51,23 51,33 39,33" fill="#8a8a8a" stroke="#6a6a6a" stroke-width="1"/>

    <polygon points="3,36 15,36 15,46 3,46" fill="#8a8a8a" stroke="#6a6a6a" stroke-width="1"/>
    <polygon points="15,36 27,36 27,46 15,46" fill="#7a7a7a" stroke="#5a5a5a" stroke-width="1"/>
    <polygon points="27,36 39,36 39,46 27,46" fill="#8a8a8a" stroke="#6a6a6a" stroke-width="1"/>
    <polygon points="39,36 51,36 51,46 39,46" fill="#7a7a7a" stroke="#5a5a5a" stroke-width="1"/>

    <!-- Glass panels on north-facing slopes (skylights) -->
    <rect x="5" y="11" width="8" height="7" fill="rgba(106,184,232,0.4)" stroke="#4a6a8a" stroke-width="0.8"/>
    <rect x="29" y="11" width="8" height="7" fill="rgba(106,184,232,0.4)" stroke="#4a6a8a" stroke-width="0.8"/>
    <rect x="17" y="24" width="8" height="7" fill="rgba(106,184,232,0.4)" stroke="#4a6a8a" stroke-width="0.8"/>
    <rect x="41" y="24" width="8" height="7" fill="rgba(106,184,232,0.4)" stroke="#4a6a8a" stroke-width="0.8"/>
    <rect x="5" y="37" width="8" height="7" fill="rgba(106,184,232,0.4)" stroke="#4a6a8a" stroke-width="0.8"/>
    <rect x="29" y="37" width="8" height="7" fill="rgba(106,184,232,0.4)" stroke="#4a6a8a" stroke-width="0.8"/>

    <!-- Ventilation units -->
    <circle cx="54" cy="50" r="4" fill="#6a6a6a" stroke="#4a4a4a" stroke-width="1.5"/>
    <circle cx="54" cy="50" r="2.5" fill="#5a5a5a"/>
  </svg>`,

  car: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="15" viewBox="0 0 24 15">
    <defs>
      <linearGradient id="carBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#6b7280"/>
        <stop offset="50%" style="stop-color:#6b7280"/>
        <stop offset="100%" style="stop-color:#1a1a1a"/>
      </linearGradient>
      <linearGradient id="windGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:#2a3f4a"/>
        <stop offset="100%" style="stop-color:#1a2f3a"/>
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="20" height="11" fill="rgba(0,0,0,0.3)"/>
    <rect x="0" y="0" width="20" height="11" fill="url(#carBodyGrad)" rx="1"/>
    <rect x="2" y="1" width="16" height="3" fill="rgba(255,255,255,0.1)"/>
    <rect x="17" y="2" width="2.5" height="7" fill="url(#windGrad)"/>
    <rect x="20.5" y="2" width="1.5" height="1.5" fill="#ffffe0"/>
    <rect x="20.5" y="7.5" width="1.5" height="1.5" fill="#ffffe0"/>
    <rect x="0.5" y="2" width="1" height="1" fill="#ff0000"/>
    <rect x="0.5" y="7.5" width="1" height="1" fill="#ff0000"/>
  </svg>`,

  truck: `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="16" viewBox="0 0 30 16">
    <defs>
      <linearGradient id="truckBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#4b5563"/>
        <stop offset="50%" style="stop-color:#4b5563"/>
        <stop offset="100%" style="stop-color:#1a1a1a"/>
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="26" height="12" fill="rgba(0,0,0,0.3)"/>
    <rect x="0" y="0" width="26" height="12" fill="url(#truckBodyGrad)" rx="1"/>
    <rect x="2" y="1" width="22" height="3.5" fill="rgba(255,255,255,0.1)"/>
    <rect x="22" y="2" width="3" height="8" fill="#2a3f4a"/>
    <rect x="27" y="3" width="2" height="1.5" fill="#ffffe0"/>
    <rect x="27" y="8" width="2" height="1.5" fill="#ffffe0"/>
    <rect x="0.5" y="3" width="1" height="1" fill="#ff0000"/>
    <rect x="0.5" y="8" width="1" height="1" fill="#ff0000"/>
  </svg>`,

  van: `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="15" viewBox="0 0 26 15">
    <defs>
      <linearGradient id="vanBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#9ca3af"/>
        <stop offset="50%" style="stop-color:#9ca3af"/>
        <stop offset="100%" style="stop-color:#1a1a1a"/>
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="22" height="11" fill="rgba(0,0,0,0.3)"/>
    <rect x="0" y="0" width="22" height="11" fill="url(#vanBodyGrad)" rx="1"/>
    <rect x="2" y="1" width="18" height="3" fill="rgba(255,255,255,0.1)"/>
    <rect x="19" y="2" width="2.5" height="7" fill="#2a3f4a"/>
    <rect x="23" y="2.5" width="1.5" height="1.5" fill="#ffffe0"/>
    <rect x="23" y="7" width="1.5" height="1.5" fill="#ffffe0"/>
    <rect x="0.5" y="2.5" width="1" height="1" fill="#ff0000"/>
    <rect x="0.5" y="7" width="1" height="1" fill="#ff0000"/>
  </svg>`,

  bus: `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="20" viewBox="0 0 36 20">
    <defs>
      <linearGradient id="busBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#ffee77"/>
        <stop offset="50%" style="stop-color:#ffdd44"/>
        <stop offset="100%" style="stop-color:#ddaa22"/>
      </linearGradient>
      <linearGradient id="busStripeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#ff8844"/>
        <stop offset="100%" style="stop-color:#ff8844" stop-opacity="0.5"/>
      </linearGradient>
    </defs>
    <rect x="3" y="3" width="32" height="14" fill="rgba(0,0,0,0.4)"/>
    <rect x="0" y="0" width="32" height="14" fill="url(#busBodyGrad)" rx="1.5"/>
    <rect x="0" y="0" width="32" height="3.5" fill="url(#busStripeGrad)"/>
    <rect x="3" y="1" width="26" height="3" fill="rgba(255,255,255,0.15)"/>
    <rect x="26" y="3" width="5" height="8" fill="#2a3f4a"/>
    <rect x="4" y="3.5" width="3.5" height="7" fill="#3a4a5a" stroke="#2a2a2a" stroke-width="0.5"/>
    <rect x="9" y="3.5" width="3.5" height="7" fill="#3a4a5a" stroke="#2a2a2a" stroke-width="0.5"/>
    <rect x="14" y="3.5" width="3.5" height="7" fill="#3a4a5a" stroke="#2a2a2a" stroke-width="0.5"/>
    <rect x="19" y="3.5" width="3.5" height="7" fill="#3a4a5a" stroke="#2a2a2a" stroke-width="0.5"/>
    <rect x="32" y="3" width="2" height="2" fill="#ffffff"/>
    <rect x="32" y="9" width="2" height="2" fill="#ffffff"/>
    <rect x="0.5" y="3" width="1.5" height="1.5" fill="#ff0000"/>
    <rect x="0.5" y="9" width="1.5" height="1.5" fill="#ff0000"/>
  </svg>`,

  busStop: `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
    <defs>
      <linearGradient id="shelterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#5a6a7a"/>
        <stop offset="100%" style="stop-color:#3a4a5a"/>
      </linearGradient>
    </defs>
    <rect x="4" y="3" width="22" height="24" fill="rgba(0,0,0,0.3)"/>
    <rect x="2" y="1" width="22" height="24" fill="url(#shelterGrad)"/>
    <rect x="2" y="1" width="22" height="2" fill="rgba(255,255,255,0.2)"/>
    <rect x="5" y="14" width="16" height="4" fill="#8b7355"/>
    <rect x="21" y="2" width="2.5" height="23" fill="#6a7a8a"/>
    <rect x="19" y="4" width="6" height="5" fill="#cc3333"/>
    <text x="22" y="8" fill="white" font-size="3" font-weight="bold" text-anchor="middle" font-family="Arial">BUS</text>
  </svg>`,

  npc: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12">
    <defs>
      <radialGradient id="headGrad">
        <stop offset="0%" style="stop-color:#f5d5b0"/>
        <stop offset="100%" style="stop-color:#d5b590"/>
      </radialGradient>
    </defs>
    <ellipse cx="7" cy="7" rx="3.5" ry="2" fill="rgba(0,0,0,0.3)"/>
    <circle cx="6" cy="5" r="2.5" fill="url(#headGrad)"/>
    <ellipse cx="6" cy="7.5" rx="3" ry="2" fill="#4a5568"/>
  </svg>`,

  roadVertical: `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
    <defs>
      <linearGradient id="roadGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#3a3a3a"/>
        <stop offset="100%" style="stop-color:#2a2a2a"/>
      </linearGradient>
    </defs>
    <rect width="30" height="30" fill="url(#roadGrad)"/>
    <rect width="30" height="30" fill="none" stroke="#4a4a4a" stroke-width="1"/>
    <line x1="15" y1="0" x2="15" y2="30" stroke="#888844" stroke-width="1" stroke-dasharray="4,4"/>
  </svg>`,

  roadHorizontal: `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
    <defs>
      <linearGradient id="roadGradH" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#3a3a3a"/>
        <stop offset="100%" style="stop-color:#2a2a2a"/>
      </linearGradient>
    </defs>
    <rect width="30" height="30" fill="url(#roadGradH)"/>
    <rect width="30" height="30" fill="none" stroke="#4a4a4a" stroke-width="1"/>
    <line x1="0" y1="15" x2="30" y2="15" stroke="#888844" stroke-width="1" stroke-dasharray="4,4"/>
  </svg>`,

  roadIntersection: `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
    <defs>
      <linearGradient id="roadGradI" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#3a3a3a"/>
        <stop offset="100%" style="stop-color:#2a2a2a"/>
      </linearGradient>
    </defs>
    <rect width="30" height="30" fill="url(#roadGradI)"/>
    <rect width="30" height="30" fill="none" stroke="#4a4a4a" stroke-width="1"/>
    <rect x="4" y="2" width="2" height="26" fill="rgba(255,255,255,0.4)"/>
    <rect x="12" y="2" width="2" height="26" fill="rgba(255,255,255,0.4)"/>
    <rect x="20" y="2" width="2" height="26" fill="rgba(255,255,255,0.4)"/>
    <rect x="2" y="4" width="26" height="2" fill="rgba(255,255,255,0.4)"/>
    <rect x="2" y="12" width="26" height="2" fill="rgba(255,255,255,0.4)"/>
    <rect x="2" y="20" width="26" height="2" fill="rgba(255,255,255,0.4)"/>
  </svg>`,

  grass: `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
    <defs>
      <linearGradient id="grassGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#4a7c35"/>
        <stop offset="100%" style="stop-color:#3a6c25"/>
      </linearGradient>
    </defs>
    <!-- Base grass texture -->
    <rect width="30" height="30" fill="url(#grassGrad)"/>
    <!-- Grass blades for texture -->
    <path d="M 3 25 L 4 20 L 5 25" fill="#5a8c45" opacity="0.6"/>
    <path d="M 7 22 L 8 17 L 9 22" fill="#5a8c45" opacity="0.6"/>
    <path d="M 12 26 L 13 21 L 14 26" fill="#5a8c45" opacity="0.6"/>
    <path d="M 17 24 L 18 19 L 19 24" fill="#5a8c45" opacity="0.6"/>
    <path d="M 22 27 L 23 22 L 24 27" fill="#5a8c45" opacity="0.6"/>
    <path d="M 26 23 L 27 18 L 28 23" fill="#5a8c45" opacity="0.6"/>
    <!-- Lighter grass highlights -->
    <circle cx="5" cy="8" r="1.5" fill="#6a9c55" opacity="0.4"/>
    <circle cx="15" cy="12" r="1.5" fill="#6a9c55" opacity="0.4"/>
    <circle cx="25" cy="10" r="1.5" fill="#6a9c55" opacity="0.4"/>
    <circle cx="10" cy="15" r="1.5" fill="#6a9c55" opacity="0.4"/>
    <circle cx="20" cy="6" r="1.5" fill="#6a9c55" opacity="0.4"/>
  </svg>`,

  tree1: `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
    <defs>
      <radialGradient id="foliageGrad">
        <stop offset="0%" style="stop-color:#6aac55"/>
        <stop offset="50%" style="stop-color:#5a9c45"/>
        <stop offset="100%" style="stop-color:#3a7c25"/>
      </radialGradient>
    </defs>
    <!-- Shadow -->
    <ellipse cx="15" cy="27" rx="10" ry="2.5" fill="rgba(0,0,0,0.3)"/>
    <!-- Tree canopy - pure top-down view (no trunk visible) -->
    <circle cx="15" cy="15" r="11" fill="url(#foliageGrad)" stroke="#2a5c15" stroke-width="1.5"/>
    <!-- Foliage texture - light patches -->
    <circle cx="11" cy="11" r="3.5" fill="#7abc65" opacity="0.6"/>
    <circle cx="19" cy="12" r="3" fill="#7abc65" opacity="0.5"/>
    <circle cx="15" cy="18" r="3" fill="#6aac55" opacity="0.5"/>
    <circle cx="18" cy="17" r="2.5" fill="#7abc65" opacity="0.4"/>
    <!-- Darker spots for depth and texture -->
    <circle cx="12" cy="16" r="2.5" fill="#3a6c25" opacity="0.4"/>
    <circle cx="17" cy="14" r="2" fill="#3a6c25" opacity="0.3"/>
    <circle cx="14" cy="13" r="2" fill="#4a8c35" opacity="0.3"/>
    <circle cx="19" cy="19" r="2" fill="#3a6c25" opacity="0.35"/>
    <!-- Trunk center (small - visible through foliage) -->
    <circle cx="15" cy="15" r="1.5" fill="#6b4a2a" opacity="0.5"/>
  </svg>`,

  tree2: `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
    <defs>
      <radialGradient id="foliageGrad2">
        <stop offset="0%" style="stop-color:#5a9c45"/>
        <stop offset="50%" style="stop-color:#4a8c35"/>
        <stop offset="100%" style="stop-color:#2a6c15"/>
      </radialGradient>
    </defs>
    <!-- Shadow -->
    <ellipse cx="15" cy="27" rx="9" ry="2.5" fill="rgba(0,0,0,0.3)"/>
    <!-- Bushy tree canopy - pure top-down view (no trunk visible) -->
    <circle cx="15" cy="15" r="10" fill="url(#foliageGrad2)" stroke="#1a5c05" stroke-width="1.5"/>
    <!-- Multi-layered foliage texture (overlapping leaf clusters) -->
    <circle cx="10" cy="10" r="4" fill="#6aac55" opacity="0.7" stroke="#2a6c15" stroke-width="0.8"/>
    <circle cx="20" cy="11" r="4" fill="#6aac55" opacity="0.6" stroke="#2a6c15" stroke-width="0.8"/>
    <circle cx="12" cy="18" r="3.5" fill="#5a9c45" opacity="0.6" stroke="#2a6c15" stroke-width="0.8"/>
    <circle cx="18" cy="19" r="3.5" fill="#5a9c45" opacity="0.6" stroke="#2a6c15" stroke-width="0.8"/>
    <circle cx="15" cy="13" r="3" fill="#7abc65" opacity="0.7" stroke="#2a6c15" stroke-width="0.8"/>
    <circle cx="16" cy="17" r="2.5" fill="#6aac55" opacity="0.5"/>
    <!-- Darker areas between leaf clusters -->
    <circle cx="11" cy="14" r="2" fill="#2a6c15" opacity="0.4"/>
    <circle cx="18" cy="15" r="2" fill="#2a6c15" opacity="0.4"/>
    <circle cx="14" cy="20" r="1.5" fill="#2a6c15" opacity="0.35"/>
    <!-- Trunk center (very small - barely visible through dense foliage) -->
    <circle cx="15" cy="15" r="1.2" fill="#7b5a3a" opacity="0.4"/>
  </svg>`,
};

export class SpriteManager {
  private sprites: Map<string, HTMLImageElement> = new Map();
  private loaded = false;

  async loadAll(): Promise<void> {
    const spritePromises: Promise<void>[] = [];

    for (const [name, svgData] of Object.entries(SVG_SPRITES)) {
      const promise = new Promise<void>((resolve, reject) => {
        const img = new Image();
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);

        img.onload = () => {
          this.sprites.set(name, img);
          URL.revokeObjectURL(url);
          resolve();
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error(`Failed to load sprite: ${name}`));
        };
        img.src = url;
      });
      spritePromises.push(promise);
    }

    await Promise.all(spritePromises);
    this.loaded = true;
    console.log('All sprites loaded!');
  }

  get(name: string): HTMLImageElement | undefined {
    return this.sprites.get(name);
  }

  isLoaded(): boolean {
    return this.loaded;
  }
}

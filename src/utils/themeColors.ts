import { BottomNavStyle } from '../types';

export interface ThemePaletteDefinition {
  id: string;
  name: string;
  tagline: string;
  hex: string;
  hoverHex: string;
  lightHex: string;
  darkLightHex: string;
  textHex: string;
  textDarkHex: string;
  ringHex: string;
  // Tailwind class presets
  bgClass: string;
  hoverBgClass: string;
  textClass: string;
  lightBgClass: string;
  borderClass: string;
  ringClass: string;
  gradientClass: string;
  glassGradientClass: string;
  glassBorderClass: string;
}

export const THEME_PALETTES: Record<string, ThemePaletteDefinition> = {
  indigo: {
    id: 'indigo',
    name: 'Royal Indigo',
    tagline: 'Modern, balanced, and sharp enterprise theme',
    hex: '#4f46e5',
    hoverHex: '#4338ca',
    lightHex: '#eef2ff',
    darkLightHex: 'rgba(79, 70, 229, 0.2)',
    textHex: '#4f46e5',
    textDarkHex: '#818cf8',
    ringHex: 'rgba(79, 70, 229, 0.35)',
    bgClass: 'bg-indigo-600',
    hoverBgClass: 'hover:bg-indigo-700',
    textClass: 'text-indigo-600 dark:text-indigo-400',
    lightBgClass: 'bg-indigo-50 dark:bg-indigo-950/60',
    borderClass: 'border-indigo-600 dark:border-indigo-500',
    ringClass: 'ring-indigo-500/30',
    gradientClass: 'bg-gradient-to-tr from-indigo-600 to-indigo-500',
    glassGradientClass: 'from-indigo-500/20 via-sky-500/20 to-indigo-400/15 dark:from-indigo-400/25 dark:via-sky-500/25 dark:to-indigo-400/20',
    glassBorderClass: 'border-indigo-400/40 dark:border-indigo-300/30',
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Green',
    tagline: 'Fresh, vibrant retail and growth ledger theme',
    hex: '#059669',
    hoverHex: '#047857',
    lightHex: '#ecfdf5',
    darkLightHex: 'rgba(5, 150, 105, 0.2)',
    textHex: '#059669',
    textDarkHex: '#34d399',
    ringHex: 'rgba(5, 150, 105, 0.35)',
    bgClass: 'bg-emerald-600',
    hoverBgClass: 'hover:bg-emerald-700',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    lightBgClass: 'bg-emerald-50 dark:bg-emerald-950/60',
    borderClass: 'border-emerald-600 dark:border-emerald-500',
    ringClass: 'ring-emerald-500/30',
    gradientClass: 'bg-gradient-to-tr from-emerald-600 to-teal-500',
    glassGradientClass: 'from-emerald-500/20 via-teal-500/20 to-emerald-400/15 dark:from-emerald-400/25 dark:via-teal-500/25 dark:to-emerald-400/20',
    glassBorderClass: 'border-emerald-400/40 dark:border-emerald-300/30',
  },
  blue: {
    id: 'blue',
    name: 'Sapphire Blue',
    tagline: 'Classic corporate, CA & financial banking theme',
    hex: '#2563eb',
    hoverHex: '#1d4ed8',
    lightHex: '#eff6ff',
    darkLightHex: 'rgba(37, 99, 235, 0.2)',
    textHex: '#2563eb',
    textDarkHex: '#60a5fa',
    ringHex: 'rgba(37, 99, 235, 0.35)',
    bgClass: 'bg-blue-600',
    hoverBgClass: 'hover:bg-blue-700',
    textClass: 'text-blue-600 dark:text-blue-400',
    lightBgClass: 'bg-blue-50 dark:bg-blue-950/60',
    borderClass: 'border-blue-600 dark:border-blue-500',
    ringClass: 'ring-blue-500/30',
    gradientClass: 'bg-gradient-to-tr from-blue-600 to-indigo-500',
    glassGradientClass: 'from-blue-500/20 via-indigo-500/20 to-blue-400/15 dark:from-blue-400/25 dark:via-indigo-500/25 dark:to-blue-400/20',
    glassBorderClass: 'border-blue-400/40 dark:border-blue-300/30',
  },
  amber: {
    id: 'amber',
    name: 'Amber Gold',
    tagline: 'Warm, wholesale & prestige merchant theme',
    hex: '#d97706',
    hoverHex: '#b45309',
    lightHex: '#fffbeb',
    darkLightHex: 'rgba(217, 119, 6, 0.2)',
    textHex: '#d97706',
    textDarkHex: '#fbbf24',
    ringHex: 'rgba(217, 119, 6, 0.35)',
    bgClass: 'bg-amber-600',
    hoverBgClass: 'hover:bg-amber-700',
    textClass: 'text-amber-600 dark:text-amber-400',
    lightBgClass: 'bg-amber-50 dark:bg-amber-950/60',
    borderClass: 'border-amber-600 dark:border-amber-500',
    ringClass: 'ring-amber-500/30',
    gradientClass: 'bg-gradient-to-tr from-amber-600 to-orange-500',
    glassGradientClass: 'from-amber-500/20 via-orange-500/20 to-amber-400/15 dark:from-amber-400/25 dark:via-orange-500/25 dark:to-amber-400/20',
    glassBorderClass: 'border-amber-400/40 dark:border-amber-300/30',
  },
  purple: {
    id: 'purple',
    name: 'Royal Purple',
    tagline: 'Luxurious, creative and digital-first theme',
    hex: '#7c3aed',
    hoverHex: '#6d28d9',
    lightHex: '#f5f3ff',
    darkLightHex: 'rgba(124, 58, 237, 0.2)',
    textHex: '#7c3aed',
    textDarkHex: '#a78bfa',
    ringHex: 'rgba(124, 58, 237, 0.35)',
    bgClass: 'bg-purple-600',
    hoverBgClass: 'hover:bg-purple-700',
    textClass: 'text-purple-600 dark:text-purple-400',
    lightBgClass: 'bg-purple-50 dark:bg-purple-950/60',
    borderClass: 'border-purple-600 dark:border-purple-500',
    ringClass: 'ring-purple-500/30',
    gradientClass: 'bg-gradient-to-tr from-purple-600 to-indigo-500',
    glassGradientClass: 'from-purple-500/20 via-indigo-500/20 to-purple-400/15 dark:from-purple-400/25 dark:via-indigo-500/25 dark:to-purple-400/20',
    glassBorderClass: 'border-purple-400/40 dark:border-purple-300/30',
  },
  rose: {
    id: 'rose',
    name: 'Ruby Rose',
    tagline: 'High-energy, boutique & modern studio theme',
    hex: '#e11d48',
    hoverHex: '#be123c',
    lightHex: '#fff1f2',
    darkLightHex: 'rgba(225, 29, 72, 0.2)',
    textHex: '#e11d48',
    textDarkHex: '#fb7185',
    ringHex: 'rgba(225, 29, 72, 0.35)',
    bgClass: 'bg-rose-600',
    hoverBgClass: 'hover:bg-rose-700',
    textClass: 'text-rose-600 dark:text-rose-400',
    lightBgClass: 'bg-rose-50 dark:bg-rose-950/60',
    borderClass: 'border-rose-600 dark:border-rose-500',
    ringClass: 'ring-rose-500/30',
    gradientClass: 'bg-gradient-to-tr from-rose-600 to-pink-500',
    glassGradientClass: 'from-rose-500/20 via-pink-500/20 to-rose-400/15 dark:from-rose-400/25 dark:via-pink-500/25 dark:to-rose-400/20',
    glassBorderClass: 'border-rose-400/40 dark:border-rose-300/30',
  },
  cyan: {
    id: 'cyan',
    name: 'Electric Cyan',
    tagline: 'Futuristic, ultra-tech & liquid glass theme',
    hex: '#0891b2',
    hoverHex: '#0e7490',
    lightHex: '#ecfeff',
    darkLightHex: 'rgba(8, 145, 178, 0.2)',
    textHex: '#0891b2',
    textDarkHex: '#22d3ee',
    ringHex: 'rgba(8, 145, 178, 0.35)',
    bgClass: 'bg-cyan-600',
    hoverBgClass: 'hover:bg-cyan-700',
    textClass: 'text-cyan-600 dark:text-cyan-400',
    lightBgClass: 'bg-cyan-50 dark:bg-cyan-950/60',
    borderClass: 'border-cyan-600 dark:border-cyan-500',
    ringClass: 'ring-cyan-500/30',
    gradientClass: 'bg-gradient-to-tr from-cyan-500 to-sky-500',
    glassGradientClass: 'from-cyan-500/20 via-sky-500/20 to-teal-400/15 dark:from-cyan-400/25 dark:via-sky-500/25 dark:to-teal-400/20',
    glassBorderClass: 'border-cyan-400/40 dark:border-cyan-300/30',
  },
  slate: {
    id: 'slate',
    name: 'Executive Slate',
    tagline: 'Minimalist, monochrome & industrial dark-slate theme',
    hex: '#334155',
    hoverHex: '#1e293b',
    lightHex: '#f1f5f9',
    darkLightHex: 'rgba(51, 65, 85, 0.25)',
    textHex: '#334155',
    textDarkHex: '#94a3b8',
    ringHex: 'rgba(51, 65, 85, 0.35)',
    bgClass: 'bg-slate-700',
    hoverBgClass: 'hover:bg-slate-800',
    textClass: 'text-slate-700 dark:text-slate-300',
    lightBgClass: 'bg-slate-100 dark:bg-slate-800/70',
    borderClass: 'border-slate-700 dark:border-slate-600',
    ringClass: 'ring-slate-500/30',
    gradientClass: 'bg-gradient-to-tr from-slate-800 to-slate-600',
    glassGradientClass: 'from-slate-500/20 via-slate-600/20 to-slate-400/15 dark:from-slate-400/25 dark:via-slate-500/25 dark:to-slate-400/20',
    glassBorderClass: 'border-slate-400/40 dark:border-slate-300/30',
  },
};

export const getEffectiveThemeColor = (color?: string, fallback = 'indigo'): string => {
  if (!color || color === 'auto') return fallback;
  if (THEME_PALETTES[color]) return color;
  return fallback;
};

export const getThemePalette = (color?: string, fallback = 'indigo'): ThemePaletteDefinition => {
  const effective = getEffectiveThemeColor(color, fallback);
  return THEME_PALETTES[effective] || THEME_PALETTES.indigo;
};

export const getThemeBg = (color?: string, fallback = 'indigo'): string => {
  return getThemePalette(color, fallback).bgClass;
};

export const getAccentBg = (color?: string, fallback = 'indigo'): string => {
  return `${getThemePalette(color, fallback).bgClass} text-white`;
};

export const getAccentText = (color?: string, fallback = 'indigo'): string => {
  return getThemePalette(color, fallback).textClass;
};


/**
 * Applies dynamic CSS variables for the active theme color to document.documentElement
 * This allows all buttons, bottom bar controls, badges, and accents across the whole app
 * to automatically match the theme seamlessly.
 */
export const applyThemeCssVariables = (themeColor: string, isDark: boolean) => {
  if (typeof document === 'undefined') return;
  const palette = getThemePalette(themeColor);
  const root = document.documentElement;

  root.style.setProperty('--theme-primary', palette.hex);
  root.style.setProperty('--theme-primary-hover', palette.hoverHex);
  root.style.setProperty('--theme-primary-light', isDark ? palette.darkLightHex : palette.lightHex);
  root.style.setProperty('--theme-primary-text', isDark ? palette.textDarkHex : palette.textHex);
  root.style.setProperty('--theme-ring', palette.ringHex);
  root.setAttribute('data-theme-color', palette.id);
};

'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface KampusLogoProps {
  size?: number;
  interactive?: boolean;
}

/**
 * Bespoke Kampus Studio Brand Mark — "Architectural Keystone K"
 * Combines a structural pillar + precision code-chevron K arms inside a
 * machined Signal Vermilion squircle with subtle inner blueprint geometry.
 */
export function KampusLogo({ size = 30, interactive = true }: KampusLogoProps) {
  const svg = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="kampus-mark-bg" x1="4" y1="2" x2="32" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F2614B" />
          <stop offset="55%" stopColor="#E8503A" />
          <stop offset="100%" stopColor="#C43824" />
        </linearGradient>
        <linearGradient id="kampus-mark-rim" x1="18" y1="0" x2="18" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="rgba(255,255,255,0.42)" />
          <stop offset="35%" stopColor="rgba(255,255,255,0.08)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.32)" />
        </linearGradient>
      </defs>

      {/* Machined Squircle Base */}
      <rect x="0.75" y="0.75" width="34.5" height="34.5" rx="9" fill="url(#kampus-mark-bg)" />
      <rect
        x="0.75"
        y="0.75"
        width="34.5"
        height="34.5"
        rx="9"
        stroke="url(#kampus-mark-rim)"
        strokeWidth="1.25"
      />

      {/* Subtle Internal Architectural Blueprint Grid Lines */}
      <path
        d="M12 1.5V34.5M24 1.5V34.5M1.5 18H34.5"
        stroke="rgba(255,255,255,0.11)"
        strokeWidth="0.75"
      />

      {/* Left Architectural Pillar (Stem of K) */}
      <rect x="9.5" y="9" width="4.2" height="18" rx="1.6" fill="#FFFFFF" />

      {/* Precision Chevron Arms (K + Code Bracket Geometry) */}
      <path
        d="M25.6 9.3C26.2 8.7 27.2 9.1 27.2 10V11.8C27.2 12.2 27.04 12.6 26.75 12.9L20.1 19.3L26.9 25.4C27.15 25.65 27.3 25.98 27.3 26.35V26.4C27.3 27.1 26.5 27.5 25.9 27.05L25.6 26.8L16.35 18.6C15.9 18.2 15.9 17.5 16.35 17.1L25.6 9.3Z"
        fill="#FFFFFF"
      />

      {/* Architectural Keystone Accent Node */}
      <rect x="14.6" y="16.2" width="3.2" height="3.2" rx="1" fill="#FFE0B8" />
    </svg>
  );

  if (!interactive) {
    return <span className="kampus-logo-wrap">{svg}</span>;
  }

  return (
    <motion.span
      className="kampus-logo-wrap"
      whileHover={{ scale: 1.06, rotate: -2 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 460, damping: 22 }}
    >
      {svg}
    </motion.span>
  );
}

/**
 * ReloadPrompt Component
 * Suppressed intentionally so Vercel deployments update silently and immediately
 * via usePwaAutoUpdate without showing a recurring reload popup banner.
 */

import React from 'react';

export interface ReloadPromptProps {
  className?: string;
  autoCheckInterval?: number;
}

export const ReloadPrompt: React.FC<ReloadPromptProps> = () => null;

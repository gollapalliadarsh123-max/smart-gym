'use client';

import { useCallback, useEffect, useState } from 'react';

export function useLegacySidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const openMobile = useCallback(() => setMobileOpen(true), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const toggleMobile = useCallback(() => setMobileOpen((v) => !v), []);
  const toggleCollapsed = useCallback(() => setCollapsed((v) => !v), []);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  const layoutClassName = [
    'dashboard-layout',
    collapsed ? 'sidebar-collapsed' : '',
    mobileOpen ? 'mobile-sidebar-open' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    mobileOpen,
    collapsed,
    openMobile,
    closeMobile,
    toggleMobile,
    toggleCollapsed,
    layoutClassName,
  };
}

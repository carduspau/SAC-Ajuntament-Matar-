'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Initialises Preline UI JavaScript behaviors on every route change.
 * This enables data-hs-* attributes (overlays, dropdowns, tabs, etc.)
 */
export function PrelineInit() {
  const pathname = usePathname();

  useEffect(() => {
    const init = async () => {
      try {
        const { HSStaticMethods } = await import('preline');
        HSStaticMethods.autoInit();
      } catch {
        // Preline not critical — silently fail in environments where it can't load
      }
    };
    init();
  }, [pathname]);

  return null;
}

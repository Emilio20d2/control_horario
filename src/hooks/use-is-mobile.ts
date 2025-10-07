
'use client';

import { useState, useEffect } from 'react';

export function useIsMobile(query: string = "(max-width: 768px)") {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handler = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    // Set the initial state
    setIsMobile(mediaQuery.matches);

    // Add listener for changes
    mediaQuery.addEventListener('change', handler);

    // Cleanup listener on component unmount
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return isMobile;
}

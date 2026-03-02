import { useEffect, useRef } from 'react';

export const useScrollPosition = (key: string, dependencies: any[] = []) => {
  const scrollPositionRef = useRef<number>(0);

  // Save scroll position
  const saveScrollPosition = () => {
    scrollPositionRef.current = window.scrollY;
    sessionStorage.setItem(`scroll-${key}`, scrollPositionRef.current.toString());
  };

  // Restore scroll position
  const restoreScrollPosition = () => {
    const savedPosition = sessionStorage.getItem(`scroll-${key}`);
    if (savedPosition) {
      const position = parseInt(savedPosition, 10);
      // Use setTimeout to ensure DOM is fully rendered
      setTimeout(() => {
        window.scrollTo({
          top: position,
          behavior: 'smooth'
        });
      }, 100);
    }
  };

  // Clear saved scroll position
  const clearScrollPosition = () => {
    sessionStorage.removeItem(`scroll-${key}`);
  };

  useEffect(() => {
    // Save scroll position when component unmounts or dependencies change
    const handleBeforeUnload = () => {
      saveScrollPosition();
    };

    const handleScroll = () => {
      scrollPositionRef.current = window.scrollY;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('scroll', handleScroll);

    return () => {
      saveScrollPosition();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('scroll', handleScroll);
    };
  }, dependencies);

  return {
    saveScrollPosition,
    restoreScrollPosition,
    clearScrollPosition
  };
};
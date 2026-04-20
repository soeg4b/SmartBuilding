'use client';

import { useEffect, useRef } from 'react';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
  /** Delay between staggered children in ms */
  staggerDelay?: number;
}

export default function PageTransition({
  children,
  className = '',
  staggerDelay = 80,
}: PageTransitionProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Animate the container fade-in
    el.style.opacity = '0';
    el.style.transform = 'translateY(8px)';
    requestAnimationFrame(() => {
      el.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });

    // Stagger children that have data-stagger attribute
    const staggerChildren = el.querySelectorAll('[data-stagger]');
    staggerChildren.forEach((child, i) => {
      const htmlChild = child as HTMLElement;
      htmlChild.style.opacity = '0';
      htmlChild.style.transform = 'translateY(12px)';
      setTimeout(() => {
        htmlChild.style.transition = 'opacity 0.35s ease-out, transform 0.35s ease-out';
        htmlChild.style.opacity = '1';
        htmlChild.style.transform = 'translateY(0)';
      }, staggerDelay * (i + 1));
    });
  }, [staggerDelay]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}

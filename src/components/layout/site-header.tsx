'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/lib/navigation';
import { ButtonLink } from '@/components/ui/button';
import { Container } from '@/components/ui/layout';
import { cn } from '@/lib/cn';

/**
 * PLACEHOLDER WORDMARK. Replaced by the AL-MAKKAH logo when it is supplied;
 * only this component changes.
 */
function Wordmark() {
  return (
    <Link href="/" className="flex flex-col leading-none">
      <span className="font-display text-xl tracking-tight">AL-MAKKAH</span>
      <span className="text-[0.625rem] uppercase tracking-[0.22em] text-text-muted">
        Real Estate
      </span>
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Prevent the page scrolling behind the open mobile menu.
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <header className="sticky top-0 z-50 bg-surface/95 backdrop-blur border-b border-border">
      <Container>
        <div className="flex h-16 md:h-20 items-center justify-between gap-6">
          <Wordmark />

          <nav aria-label="Main" className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'px-3 py-2 text-sm rounded-md transition-colors duration-150',
                    isActive
                      ? 'text-text font-medium'
                      : 'text-text-muted hover:text-text',
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden md:block">
            <ButtonLink href="/contact" size="sm" variant="secondary">
              Talk to us
            </ButtonLink>
          </div>

          <button
            type="button"
            className="md:hidden -mr-2 p-2 text-text"
            aria-expanded={isOpen}
            aria-controls="mobile-nav"
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setIsOpen((open) => !open)}
          >
            <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
              {isOpen ? (
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                />
              ) : (
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                />
              )}
            </svg>
          </button>
        </div>
      </Container>

      {isOpen && (
        <div
          id="mobile-nav"
          className="md:hidden border-t border-border bg-surface h-[calc(100dvh-4rem)] overflow-y-auto"
        >
          <Container>
            <nav aria-label="Mobile" className="flex flex-col py-4">
              {NAV_ITEMS.map((item) => (
                <div key={item.href} className="py-2 border-b border-border last:border-0">
                  <Link
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className="block py-2 font-display text-2xl"
                  >
                    {item.label}
                  </Link>
                  {item.children && (
                    <div className="flex flex-col pl-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setIsOpen(false)}
                          className="py-2 text-text-muted"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </Container>
        </div>
      )}
    </header>
  );
}

import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';

/**
 * Chrome for the public site only.
 *
 * The admin panel deliberately sits outside this group so it never renders the
 * public navigation - there is no link from the website into the admin area,
 * and no way to arrive there by following one.
 */
export default function PublicLayout({ children }: LayoutProps<'/'>) {
  return (
    <>
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:m-3 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:shadow-overlay"
      >
        Skip to content
      </a>
      <SiteHeader />
      <div id="content" className="flex flex-col flex-1">
        {children}
      </div>
      <SiteFooter />
    </>
  );
}

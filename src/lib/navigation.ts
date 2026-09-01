/**
 * Single source of truth for site navigation.
 *
 * Sub-categories are query parameters on one page rather than separate routes:
 * /buy?type=house and /buy?type=plot are the same marketplace with a different
 * filter, which keeps one property engine behind all of it.
 */
export type NavChild = { label: string; href: string };
export type NavItem = { label: string; href: string; children?: NavChild[] };

export const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/' },
  {
    label: 'Buy',
    href: '/buy',
    children: [
      { label: 'Houses', href: '/buy?type=house' },
      { label: 'Plots', href: '/buy?type=plot' },
    ],
  },
  {
    label: 'Sell',
    href: '/sell',
    children: [
      { label: 'Sell a House', href: '/sell?type=house' },
      { label: 'Sell a Plot', href: '/sell?type=plot' },
    ],
  },
  {
    label: 'Rent',
    href: '/rent',
    children: [
      { label: 'Houses', href: '/rent?type=house' },
      { label: 'Bungalows', href: '/rent?type=bungalow' },
      { label: 'Flats & Apartments', href: '/rent?type=flat' },
      { label: 'Portions', href: '/rent?type=portion' },
    ],
  },
  { label: 'Contact', href: '/contact' },
];

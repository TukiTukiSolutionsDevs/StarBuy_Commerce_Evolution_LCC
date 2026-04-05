import Link from 'next/link';

const FOOTER_LINKS = {
  Shop: [
    { label: 'New Arrivals', href: '/collections/new-arrivals' },
    { label: 'Trending', href: '/collections/trending' },
    { label: 'Deals', href: '/collections/deals' },
    { label: 'All Products', href: '/collections/all' },
  ],
  Support: [
    { label: 'About Us', href: '/about' },
    { label: 'Contact Support', href: '/contact' },
    { label: 'Shipping Policy', href: '/policies/shipping-policy' },
    { label: 'Returns', href: '/policies/refund-policy' },
  ],
  Legal: [
    { label: 'Terms of Service', href: '/policies/terms-of-service' },
    { label: 'Privacy Policy', href: '/policies/privacy-policy' },
  ],
};

const SOCIAL_LINKS = [
  {
    label: 'Website',
    href: '#',
    icon: 'public',
  },
  {
    label: 'Instagram',
    href: 'https://instagram.com/starbuy',
    icon: 'camera',
  },
  {
    label: 'Facebook',
    href: 'https://facebook.com/starbuy',
    icon: 'group',
  },
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#1B2A5E] text-white font-[var(--font-body)] text-sm border-t border-white/10 w-full">
      {/* Main grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 px-8 py-12 max-w-7xl mx-auto">
        {/* Brand column */}
        <div className="col-span-2 md:col-span-1">
          <Link
            href="/"
            className="mb-6 block"
            aria-label="Starbuy"
          >
            <img src="/StarBuy.png" alt="StarBuy" className="h-12 w-auto" />
          </Link>
          <p className="text-slate-300 mb-6 max-w-xs leading-relaxed">
            Smart shopping, trusted quality. Bringing the best trends directly to your doorstep
            with unmatched service.
          </p>
          {/* Social icons */}
          <div className="flex gap-4">
            {SOCIAL_LINKS.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target={social.href.startsWith('http') ? '_blank' : undefined}
                rel={social.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                aria-label={social.label}
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/20 transition-all"
              >
                <span className="material-symbols-outlined text-xl" aria-hidden="true">
                  {social.icon}
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* Link columns */}
        {Object.entries(FOOTER_LINKS).map(([section, links]) => (
          <div key={section}>
            <h3 className="font-bold uppercase tracking-wider text-xs text-white mb-6">
              {section}
            </h3>
            <ul className="space-y-4" role="list">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-slate-300 hover:text-white hover:underline transition-all"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/5 px-8 py-6 text-center text-slate-400 max-w-7xl mx-auto">
        <p>© {currentYear} Starbuy. Smart shopping, trusted quality.</p>
      </div>
    </footer>
  );
}

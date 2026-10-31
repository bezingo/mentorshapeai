'use client'

import Link from 'next/link'
import { useI18n } from '@/lib/i18n'

export function MarketingFooter() {
  const { locale } = useI18n()
  const isRTL = locale === 'ar'
  const currentYear = new Date().getFullYear()

  const footerLinks = {
    product: {
      title: isRTL ? 'المنتج' : 'Product',
      links: [
        { href: '/for-schools', label: isRTL ? 'للمدارس' : 'For Schools' },
        { href: '/for-mentors', label: isRTL ? 'للمرشدين' : 'For Mentors' },
        { href: '/pricing', label: isRTL ? 'الأسعار' : 'Pricing' },
      ]
    },
    company: {
      title: isRTL ? 'الشركة' : 'Company',
      links: [
        { href: '/about', label: isRTL ? 'من نحن' : 'About' },
        { href: 'mailto:hello@mentorshape.ai', label: isRTL ? 'تواصل معنا' : 'Contact' },
      ]
    },
    legal: {
      title: isRTL ? 'قانوني' : 'Legal',
      links: [
        { href: '/privacy', label: isRTL ? 'الخصوصية' : 'Privacy' },
        { href: '/terms', label: isRTL ? 'الشروط' : 'Terms' },
      ]
    }
  }

  return (
    <footer className="border-t bg-ms-shell">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-ms-orange to-orange-600">
                <span className="text-lg font-bold text-white">M</span>
              </div>
              <span className="text-xl font-bold">Mentorshape</span>
            </Link>
            <p className="text-sm text-ms-ink-muted">
              {isRTL 
                ? 'منصة إرشاد مدعومة بالذكاء الاصطناعي للمدارس والجامعات'
                : 'AI-powered mentorship platform for schools and universities'
              }
            </p>
          </div>

          {Object.entries(footerLinks).map(([key, section]) => (
            <div key={key}>
              <h4 className="font-semibold mb-4">{section.title}</h4>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link 
                      href={link.href}
                      className="text-sm text-ms-ink-muted hover:text-ms-ink transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-ms-ink-muted">
            © {currentYear} Mentorshape. {isRTL ? 'جميع الحقوق محفوظة' : 'All rights reserved'}.
          </p>
          <div className="flex items-center gap-4">
            <Link 
              href="https://twitter.com/mentorshape" 
              target="_blank"
              className="text-ms-ink-muted hover:text-ms-ink"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </Link>
            <Link 
              href="https://linkedin.com/company/mentorshape" 
              target="_blank"
              className="text-ms-ink-muted hover:text-ms-ink"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

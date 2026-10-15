import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '../components/theme-provider';
import { ToastProvider } from '../hooks/use-toast';
import { ToastContainer } from '../components/ui/Toast';
import { Navbar } from '../components/ui/Navbar';
import { CommandPalette } from '../components/ui/CommandPalette';
import { BrandLogo } from '../components/brand/BrandLogo';

export const metadata: Metadata = {
  title: 'N1 — Privacy-First Temporary Sharing & Browser Utilities',
  description:
    'N1 is an anonymous, zero-cost digital platform for secure, self-destructing file and text sharing, real-time whiteboards, and client-side developer utilities. No account needed.',
  icons: {
    icon: '/favicon.svg',
    apple: '/icon.svg',
  },
  manifest: '/manifest.webmanifest',
  robots: 'index, follow',
};

export const viewport: Viewport = {
  themeColor: '#09090F',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        {/* Anti-flash theme script: applies stored theme before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('n1-theme');
                  var theme = stored === 'light' || stored === 'dark' 
                    ? stored 
                    : (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
                  document.documentElement.setAttribute('data-theme', theme);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased min-h-screen flex flex-col justify-between">
        <ThemeProvider>
          <ToastProvider>
            {/* Floating Pill Navigation */}
            <Navbar />

            {/* Main Content Area */}
            <main className="flex-1 pt-24 pb-16">{children}</main>

            {/* Global Toast Container */}
            <ToastContainer />

            {/* Global Command Palette (Ctrl+K / Cmd+K) */}
            <CommandPalette />

            {/* Global Footer */}
            <footer className="border-t border-n1-border-subtle bg-n1-surface/50 backdrop-blur-md pt-12 pb-8 px-4 sm:px-6">
              <div className="max-w-[1080px] mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
                  {/* Brand & Mission */}
                  <div className="md:col-span-1 space-y-3">
                    <BrandLogo size="md" />
                    <p className="text-xs text-n1-text-secondary leading-relaxed">
                      Privacy-first, zero-account digital platform for ephemeral sharing, real-time whiteboards, and client-side developer utilities.
                    </p>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-n1-surface-raised border border-n1-border text-[11px] text-n1-text-muted font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-n1-success" />
                      <span>Ephemeral Storage • Auto Wipe</span>
                    </div>
                  </div>

                  {/* Column 1: Products */}
                  <div className="space-y-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-n1-text-primary">
                      Products
                    </h3>
                    <ul className="space-y-2 text-xs text-n1-text-secondary">
                      <li>
                        <a href="/drop" className="hover:text-n1-purple-light transition-colors">
                          Ephemeral Drop
                        </a>
                      </li>
                      <li>
                        <a href="/tools" className="hover:text-n1-purple-light transition-colors">
                          Developer Toolbox (31)
                        </a>
                      </li>
                      <li>
                        <a href="/board" className="hover:text-n1-purple-light transition-colors">
                          Collaborative Whiteboard
                        </a>
                      </li>
                      <li>
                        <a href="/duel" className="hover:text-n1-purple-light transition-colors">
                          1v1 Quiz Battles
                        </a>
                      </li>
                    </ul>
                  </div>

                  {/* Column 2: Security & Privacy */}
                  <div className="space-y-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-n1-text-primary">
                      Security & Privacy
                    </h3>
                    <ul className="space-y-2 text-xs text-n1-text-secondary">
                      <li>
                        <a href="/privacy" className="hover:text-n1-purple-light transition-colors">
                          Privacy Policy
                        </a>
                      </li>
                      <li>
                        <a href="/terms" className="hover:text-n1-purple-light transition-colors">
                          Terms of Service
                        </a>
                      </li>
                      <li className="flex items-center gap-1.5 text-n1-text-muted">
                        <span className="text-n1-purple-light">✓</span>
                        <span>Physical Disk Expunging</span>
                      </li>
                      <li className="flex items-center gap-1.5 text-n1-text-muted">
                        <span className="text-n1-purple-light">✓</span>
                        <span>Argon2id Key Derivation</span>
                      </li>
                    </ul>
                  </div>

                  {/* Column 3: Resources & Admin */}
                  <div className="space-y-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-n1-text-primary">
                      Resources
                    </h3>
                    <ul className="space-y-2 text-xs text-n1-text-secondary">
                      <li>
                        <a href="/help" className="hover:text-n1-purple-light transition-colors">
                          Help &amp; Documentation
                        </a>
                      </li>
                      <li>
                        <a href="/design-system" className="hover:text-n1-text-primary transition-colors">
                          Design System Showcase
                        </a>
                      </li>
                      <li>
                        <a href="/admin/login" className="hover:text-n1-text-primary transition-colors">
                          Moderation Console
                        </a>
                      </li>
                      <li>
                        <span className="text-n1-text-muted">Status: All Systems Operational</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="pt-6 border-t border-n1-border-subtle flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-n1-text-muted text-center sm:text-left">
                  <p>© 2026 N1 Platform. Built for privacy, speed, and anonymity.</p>
                  <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
                    <a href="/privacy" className="hover:text-n1-text-primary transition-colors">
                      Privacy Policy
                    </a>
                    <span>·</span>
                    <a href="/terms" className="hover:text-n1-text-primary transition-colors">
                      Terms of Service
                    </a>
                    <span>·</span>
                    <span>Self-Destructing by Design</span>
                  </div>
                </div>
              </div>
            </footer>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

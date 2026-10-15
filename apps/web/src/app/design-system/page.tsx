'use client';

import React, { useState } from 'react';
import {
  Button,
  Input,
  Textarea,
  Select,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Modal,
  ModalFooter,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  ProgressBar,
  Countdown,
  FileCard,
  CodeBlock,
  EmptyState,
  Spinner,
  Skeleton,
  LoadingOverlay,
  ErrorState,
} from '../../components/ui';
import { useTheme } from '../../components/theme-provider';
import { useToast } from '../../hooks/use-toast';

export default function DesignSystemShowcasePage() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { toast } = useToast();

  // Interactive states for showcase
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [progressVal, setProgressVal] = useState(65);
  const [inputVal, setInputVal] = useState('');
  const [textareaVal, setTextareaVal] = useState(
    'N1 ensures complete zero-knowledge privacy by running ephemeral memory drops that auto-destruct on read or timeout.'
  );
  const [selectedExpiry, setSelectedExpiry] = useState('1h');
  const [btnLoading, setBtnLoading] = useState(false);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      variant: 'success',
      title: 'Copied to clipboard',
      description: `${label}: ${text}`,
    });
  };

  const handleSimulateAction = () => {
    setBtnLoading(true);
    setTimeout(() => {
      setBtnLoading(false);
      toast({
        variant: 'success',
        title: 'Action completed',
        description: 'The simulated asynchronous task finished successfully.',
      });
    }, 1500);
  };

  const colorTokens = [
    { name: 'Dark Background', hex: '#09090F', bgClass: 'bg-[#09090F]', border: true },
    { name: 'Card Surface', hex: '#111118', bgClass: 'bg-[#111118]', border: true },
    { name: 'Raised Surface', hex: '#1A1A26', bgClass: 'bg-[#1A1A26]', border: true },
    { name: 'Overlay Surface', hex: '#20202E', bgClass: 'bg-[#20202E]', border: true },
    { name: 'Border Default', hex: '#2A2A3C', bgClass: 'bg-[#2A2A3C]' },
    { name: 'Border Subtle', hex: '#1E1E2C', bgClass: 'bg-[#1E1E2C]' },
    { name: 'Primary Purple', hex: '#7C3AED', bgClass: 'bg-[#7C3AED]' },
    { name: 'Primary Light', hex: '#9D5FF5', bgClass: 'bg-[#9D5FF5]' },
    { name: 'Gold Accent', hex: '#F5C518', bgClass: 'bg-[#F5C518]' },
    { name: 'Primary Text', hex: '#F0F0F8', bgClass: 'bg-[#F0F0F8]', textDark: true },
    { name: 'Secondary Text', hex: '#8A8AA8', bgClass: 'bg-[#8A8AA8]', textDark: true },
    { name: 'Muted Text', hex: '#52526A', bgClass: 'bg-[#52526A]' },
  ];

  return (
    <div className="max-w-[1080px] mx-auto px-4 sm:px-6 py-8 space-y-16">
      {/* Page Header */}
      <section className="relative flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-n1-border-subtle">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="primary" dot pulse>
              Phase 2 Active
            </Badge>
            <Badge variant="gold">Design System</Badge>
            <Badge variant="muted">v1.0.0</Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-n1-text-primary">
            N1 Design System & Component Library
          </h1>
          <p className="mt-2 text-sm text-n1-text-secondary max-w-2xl">
            A production-grade, accessible, dark-first design foundation crafted for N1. Built with
            Next.js, React 19, TypeScript, and Tailwind CSS.
          </p>
        </div>

        {/* Live Theme Controller */}
        <div className="flex flex-col gap-2 shrink-0">
          <span className="text-xs font-semibold text-n1-text-muted uppercase tracking-wider">
            Theme (Active: {theme} / {resolvedTheme})
          </span>
          <div className="inline-flex p-1 bg-n1-surface-raised border border-n1-border rounded-xl">
            {(['dark', 'light', 'system'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  theme === t
                    ? 'bg-n1-purple text-white shadow-sm'
                    : 'text-n1-text-secondary hover:text-n1-text-primary'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 1. Color Palette Tokens */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-n1-text-primary flex items-center gap-2">
            <span>1. Master Color Tokens</span>
            <Badge variant="outline" size="sm">
              Click token to copy
            </Badge>
          </h2>
          <p className="text-xs text-n1-text-secondary mt-1">
            Exact hex values implemented from the N1 design specification.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
          {colorTokens.map(token => (
            <button
              key={token.hex}
              onClick={() => copyToClipboard(token.hex, token.name)}
              className="group p-3 rounded-xl bg-n1-surface-raised border border-n1-border hover:border-n1-purple/50 transition-all text-left flex flex-col gap-2.5 focus-ring"
            >
              <div
                className={`w-full h-12 rounded-lg ${token.bgClass} ${
                  token.border ? 'border border-white/10' : ''
                } shadow-inner transition-transform group-hover:scale-[1.02]`}
              />
              <div>
                <p className="text-xs font-semibold text-n1-text-primary truncate">{token.name}</p>
                <p className="text-[11px] font-mono text-n1-text-muted mt-0.5">{token.hex}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 2. Typography Hierarchy */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-n1-text-primary">2. Typography Hierarchy</h2>
          <p className="text-xs text-n1-text-secondary mt-1">
            Clean typography scale with Inter and Satoshi brand fonts.
          </p>
        </div>

        <Card variant="raised" className="divide-y divide-n1-border-subtle">
          <div className="p-5 flex flex-col md:flex-row md:items-baseline justify-between gap-2">
            <span className="text-xs font-mono text-n1-text-muted w-32 shrink-0">Display</span>
            <span className="text-4xl font-extrabold tracking-tight text-n1-text-primary font-brand">
              Anonymous Temporary Sharing
            </span>
          </div>
          <div className="p-5 flex flex-col md:flex-row md:items-baseline justify-between gap-2">
            <span className="text-xs font-mono text-n1-text-muted w-32 shrink-0">Heading 1</span>
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-n1-text-primary">
              Drop Files and Text Instantly
            </span>
          </div>
          <div className="p-5 flex flex-col md:flex-row md:items-baseline justify-between gap-2">
            <span className="text-xs font-mono text-n1-text-muted w-32 shrink-0">Heading 2</span>
            <span className="text-xl font-bold text-n1-text-primary">
              Zero Accounts. Maximum Privacy.
            </span>
          </div>
          <div className="p-5 flex flex-col md:flex-row md:items-baseline justify-between gap-2">
            <span className="text-xs font-mono text-n1-text-muted w-32 shrink-0">Heading 3</span>
            <span className="text-base font-semibold text-n1-text-primary">
              Self-Destructing Storage Architecture
            </span>
          </div>
          <div className="p-5 flex flex-col md:flex-row md:items-baseline justify-between gap-2">
            <span className="text-xs font-mono text-n1-text-muted w-32 shrink-0">Body Regular</span>
            <span className="text-sm text-n1-text-secondary leading-relaxed">
              Files and snippets uploaded to N1 automatically expire after your chosen duration or
              immediately after first retrieval.
            </span>
          </div>
          <div className="p-5 flex flex-col md:flex-row md:items-baseline justify-between gap-2">
            <span className="text-xs font-mono text-n1-text-muted w-32 shrink-0">Code / Mono</span>
            <span className="text-xs font-mono text-n1-purple-light">
              curl -X POST https://n1.local/api/drop -F file=@payload.zip
            </span>
          </div>
        </Card>
      </section>

      {/* 3. Glassmorphism & Ambient Glow Surfaces */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-n1-text-primary">
            3. Glassmorphism & Background Glows
          </h2>
          <p className="text-xs text-n1-text-secondary mt-1">
            Backdrop blur layers combined with subtle ambient radial glow fields.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass p-6 rounded-2xl flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-n1-text-primary">Standard Glass</span>
              <Badge variant="muted" size="sm">
                .glass
              </Badge>
            </div>
            <p className="text-xs text-n1-text-secondary">
              Blur 16px with subtle border. Ideal for floating bars and overlay chips.
            </p>
          </div>

          <div className="glass-raised glow-purple p-6 rounded-2xl flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-n1-text-primary">
                Raised + Purple Glow
              </span>
              <Badge variant="primary" size="sm">
                .glow-purple
              </Badge>
            </div>
            <p className="text-xs text-n1-text-secondary">
              Blur 20px with active purple ambient bloom for hero callouts.
            </p>
          </div>

          <div className="glass-overlay glow-gold p-6 rounded-2xl flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-n1-text-primary">
                Overlay + Gold Glow
              </span>
              <Badge variant="gold" size="sm">
                .glow-gold
              </Badge>
            </div>
            <p className="text-xs text-n1-text-secondary">
              High contrast overlay blur 24px with warm gold accent glow.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Buttons */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-n1-text-primary">4. Buttons</h2>
          <p className="text-xs text-n1-text-secondary mt-1">
            Variants, sizes, loading states, and icon configurations.
          </p>
        </div>

        <Card variant="raised" className="p-6 space-y-6">
          {/* Variants row */}
          <div>
            <h4 className="text-xs font-semibold text-n1-text-muted uppercase tracking-wider mb-3">
              Variants
            </h4>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="subtle">Subtle</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="gold">Gold Action</Button>
              <Button variant="danger">Danger</Button>
            </div>
          </div>

          {/* Sizes row */}
          <div>
            <h4 className="text-xs font-semibold text-n1-text-muted uppercase tracking-wider mb-3">
              Sizes
            </h4>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small (sm)</Button>
              <Button size="md">Medium (md)</Button>
              <Button size="lg">Large (lg)</Button>
            </div>
          </div>

          {/* Interactive States */}
          <div>
            <h4 className="text-xs font-semibold text-n1-text-muted uppercase tracking-wider mb-3">
              States & Icons
            </h4>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="primary"
                isLoading={btnLoading}
                onClick={handleSimulateAction}
                leftIcon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                }
              >
                {btnLoading ? 'Processing...' : 'Click to Test Loading'}
              </Button>
              <Button disabled variant="primary">
                Disabled State
              </Button>
              <Button
                variant="secondary"
                rightIcon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                }
              >
                Next Step
              </Button>
            </div>
          </div>
        </Card>
      </section>

      {/* 5. Form Controls */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-n1-text-primary">5. Form Controls</h2>
          <p className="text-xs text-n1-text-secondary mt-1">
            Input, Textarea, and Select with focus states, hints, validation, and character counts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card variant="raised" className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-n1-text-primary">Input Fields</h3>

            <Input
              label="Recipient or Short Code"
              placeholder="e.g. 7X9-K2M"
              hint="Codes are 6 characters case-insensitive."
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              leftIcon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  />
                </svg>
              }
            />

            <Input
              label="Field with Validation Error"
              defaultValue="invalid-drop-code!!!"
              error="Code format is invalid. Expected 6 alphanumeric characters."
            />

            <Select
              label="Auto-destruction TTL"
              value={selectedExpiry}
              onChange={e => setSelectedExpiry(e.target.value)}
              hint="Item is deleted permanently when time expires."
              options={[
                { value: '10m', label: '10 Minutes' },
                { value: '1h', label: '1 Hour (Recommended)' },
                { value: '24h', label: '24 Hours' },
                { value: 'burn', label: 'Burn after 1 read' },
              ]}
            />
          </Card>

          <Card variant="raised" className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-n1-text-primary">Textarea with Counter</h3>

            <Textarea
              label="Drop Message / Note"
              placeholder="Paste sensitive text, notes, or secrets..."
              showCharCount
              maxLength={200}
              value={textareaVal}
              onChange={e => setTextareaVal(e.target.value)}
              hint="Text is held only in memory and never logged."
              rows={4}
            />

            <Textarea
              label="Disabled Textarea"
              disabled
              defaultValue="This content is read-only and cannot be modified."
              rows={2}
            />
          </Card>
        </div>
      </section>

      {/* 6. Cards & Badges */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-n1-text-primary">6. Cards & Badges</h2>
          <p className="text-xs text-n1-text-secondary mt-1">
            Structured cards across all surface levels with status badges.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card variant="default">
            <CardHeader>
              <Badge variant="muted" size="sm" className="w-fit mb-1">
                Default Surface
              </Badge>
              <CardTitle>Base Card (#111118)</CardTitle>
              <CardDescription>Default surface for content groupings.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-n1-text-secondary">Standard card border #1E1E2C.</p>
            </CardContent>
          </Card>

          <Card variant="raised" interactive>
            <CardHeader>
              <Badge variant="primary" dot size="sm" className="w-fit mb-1">
                Interactive Raised
              </Badge>
              <CardTitle>Raised Card (#1A1A26)</CardTitle>
              <CardDescription>Hover over this card to see elevation.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-n1-text-secondary">Used for clickable Drop cards.</p>
            </CardContent>
          </Card>

          <Card variant="overlay">
            <CardHeader>
              <Badge variant="gold" size="sm" className="w-fit mb-1">
                Overlay Surface
              </Badge>
              <CardTitle>Overlay Card (#20202E)</CardTitle>
              <CardDescription>Highest elevation container surface.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-n1-text-secondary">Used for modals and popovers.</p>
            </CardContent>
          </Card>

          <Card variant="glass" glow>
            <CardHeader>
              <Badge variant="success" dot pulse size="sm" className="w-fit mb-1">
                Glassmorphic
              </Badge>
              <CardTitle>Glass + Purple Glow</CardTitle>
              <CardDescription>Frosted glass effect with ambient halo.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-n1-text-secondary">For hero highlights.</p>
            </CardContent>
          </Card>
        </div>

        {/* Badges showcase */}
        <Card variant="raised" className="p-6">
          <h4 className="text-xs font-semibold text-n1-text-muted uppercase tracking-wider mb-3">
            Badge Palette & Indicators
          </h4>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="primary">Primary Purple</Badge>
            <Badge variant="primary" dot pulse>
              Live Pulse
            </Badge>
            <Badge variant="gold">Gold Accent</Badge>
            <Badge variant="gold" dot>
              Active
            </Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="success" dot>
              Online
            </Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="error">Error</Badge>
            <Badge variant="muted">Muted Badge</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>
        </Card>
      </section>

      {/* 7. Segmented Tabs */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-n1-text-primary">7. Segmented Pill Tabs</h2>
          <p className="text-xs text-n1-text-secondary mt-1">
            Keyboard accessible segmented controls for mode switching.
          </p>
        </div>

        <Card variant="raised" className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger
                value="overview"
                icon={
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                }
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="security"
                icon={
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                }
              >
                Security Specs
              </TabsTrigger>
              <TabsTrigger
                value="audit"
                icon={
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                }
              >
                Audit Log
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="p-4 rounded-xl bg-n1-surface border border-n1-border-subtle text-xs text-n1-text-secondary leading-relaxed">
                N1 Drop enables effortless anonymous communication between two devices. No phone
                numbers, no email addresses, and zero tracking cookies.
              </div>
            </TabsContent>

            <TabsContent value="security">
              <div className="p-4 rounded-xl bg-n1-surface border border-n1-border-subtle text-xs text-n1-text-secondary leading-relaxed space-y-2">
                <p className="font-semibold text-n1-text-primary">Zero-Trust Specifications:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Client-side end-to-end passphrase encryption support.</li>
                  <li>In-memory TTL counters with automated garbage collection.</li>
                  <li>One-time access tokens burned upon verification.</li>
                </ul>
              </div>
            </TabsContent>

            <TabsContent value="audit">
              <div className="p-4 rounded-xl bg-n1-surface border border-n1-border-subtle text-xs text-n1-text-secondary leading-relaxed font-mono">
                [2026-09-29 11:00:00] Design system initialized.
                <br />
                [2026-09-29 11:00:01] 17 UI components loaded with zero errors.
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </section>

      {/* 8. Progress Bars & Live Countdown */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-n1-text-primary">
            8. Progress Bars & Live Countdowns
          </h2>
          <p className="text-xs text-n1-text-secondary mt-1">
            Dynamic upload indicators and self-destruct countdown timers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card variant="raised" className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-n1-text-primary">Progress Bar Variants</h3>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setProgressVal(Math.max(0, progressVal - 15))}
                >
                  -15%
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setProgressVal(Math.min(100, progressVal + 15))}
                >
                  +15%
                </Button>
              </div>
            </div>

            <ProgressBar
              value={progressVal}
              label="Primary Gradient (Purple)"
              showLabel
              variant="primary"
            />
            <ProgressBar value={85} label="Gold Variant" showLabel variant="gold" />
            <ProgressBar value={100} label="Success Completed" showLabel variant="success" />
            <ProgressBar indeterminate label="Indeterminate Uploading State" showLabel />
          </Card>

          <Card variant="raised" className="p-6 space-y-5">
            <h3 className="text-sm font-bold text-n1-text-primary">Live Countdown Timers</h3>

            <div>
              <p className="text-xs text-n1-text-muted mb-2 font-medium">Full Timer Display:</p>
              <Countdown initialSeconds={3665} variant="timer" />
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <div>
                <p className="text-xs text-n1-text-muted mb-1 font-medium">Standard Badge:</p>
                <Countdown initialSeconds={1820} variant="badge" />
              </div>

              <div>
                <p className="text-xs text-n1-text-muted mb-1 font-medium">
                  Urgent Alert (&lt;5m):
                </p>
                <Countdown initialSeconds={180} variant="badge" />
              </div>

              <div>
                <p className="text-xs text-n1-text-muted mb-1 font-medium">Compact Text:</p>
                <Countdown initialSeconds={720} variant="compact" />
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* 9. File Cards */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-n1-text-primary">9. File Cards</h2>
          <p className="text-xs text-n1-text-secondary mt-1">
            Display for attached files with extension detection and actions.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FileCard
            name="n1-architecture-whitepaper.pdf"
            sizeBytes={2457600}
            onDownload={() =>
              toast({
                variant: 'info',
                title: 'Downloading file',
                description: 'n1-architecture-whitepaper.pdf',
              })
            }
            onDelete={() =>
              toast({
                variant: 'warning',
                title: 'File removed',
                description: 'File was deleted from memory.',
              })
            }
          />

          <FileCard
            name="dashboard-hero-mockup.png"
            sizeBytes={1048576}
            onDownload={() =>
              toast({
                variant: 'info',
                title: 'Downloading file',
                description: 'dashboard-hero-mockup.png',
              })
            }
            onDelete={() =>
              toast({
                variant: 'warning',
                title: 'File removed',
                description: 'File was deleted from memory.',
              })
            }
          />

          <FileCard
            name="system-backup-v2.zip"
            sizeBytes={15728640}
            status="uploading"
            progress={72}
          />

          <FileCard
            name="design-tokens.ts"
            sizeBytes={8192}
            onDownload={() =>
              toast({ variant: 'info', title: 'Downloading file', description: 'design-tokens.ts' })
            }
            onDelete={() =>
              toast({
                variant: 'warning',
                title: 'File removed',
                description: 'File was deleted from memory.',
              })
            }
          />
        </div>
      </section>

      {/* 10. Code Block */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-n1-text-primary">
            10. Code Block with Copy Feedback
          </h2>
          <p className="text-xs text-n1-text-secondary mt-1">
            Syntax container with terminal decorations, line numbering, and copy toast.
          </p>
        </div>

        <CodeBlock
          filename="DropService.ts"
          language="typescript"
          showLineNumbers
          code={`import { DropMetadata } from '@n1/shared';

export async function createDropPayload(data: FormData): Promise<DropMetadata> {
  const shortCode = generateShortCode(); // 6 chars
  const ttlSeconds = 3600; // 1 hour self-destruct

  return {
    code: shortCode,
    expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
    hasFiles: true,
    burnOnRead: true,
  };
}`}
        />
      </section>

      {/* 11. Modal Dialog & 12. Toasts */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-n1-text-primary">
            11. Modal Dialog & 12. Interactive Toasts
          </h2>
          <p className="text-xs text-n1-text-secondary mt-1">
            Accessible modal with keyboard focus handling, backdrop blur, and notification stack.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card variant="raised" className="p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-n1-text-primary">Modal Component</h3>
              <p className="text-xs text-n1-text-secondary mt-1">
                Portaled to document.body, locks scroll, closes on Escape or backdrop click.
              </p>
            </div>
            <div className="mt-6">
              <Button variant="primary" onClick={() => setModalOpen(true)}>
                Open Demo Modal Dialog
              </Button>
            </div>
          </Card>

          <Card variant="raised" className="p-6">
            <h3 className="text-sm font-bold text-n1-text-primary mb-1">Trigger Live Toasts</h3>
            <p className="text-xs text-n1-text-secondary mb-4">
              Dispatches auto-dismissing notifications into the global viewport queue.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <Button
                size="sm"
                variant="subtle"
                onClick={() =>
                  toast({
                    variant: 'info',
                    title: 'System Notification',
                    description: 'Your connection to N1 is encrypted and zero-knowledge.',
                  })
                }
              >
                Info Toast
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  toast({
                    variant: 'success',
                    title: 'Drop Created Successfully',
                    description: 'Short code 8M4-P9X is ready to share.',
                  })
                }
              >
                Success Toast
              </Button>
              <Button
                size="sm"
                variant="gold"
                onClick={() =>
                  toast({
                    variant: 'warning',
                    title: 'Approaching Expiration',
                    description: 'This Drop will self-destruct in 4 minutes.',
                  })
                }
              >
                Warning Toast
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() =>
                  toast({
                    variant: 'error',
                    title: 'Drop Expired or Burned',
                    description: 'The requested short code no longer exists.',
                  })
                }
              >
                Error Toast
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* 13. System States: Empty, Loading, Error */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-n1-text-primary">13. System States</h2>
          <p className="text-xs text-n1-text-secondary mt-1">
            Empty, loading, and error fallback components.
          </p>
        </div>

        <div className="space-y-6">
          {/* Empty State */}
          <EmptyState
            title="No Active Drops Yet"
            description="Create your first temporary drop to share encrypted text and files anonymously."
            actionLabel="Create New Drop"
            onAction={() =>
              toast({
                variant: 'info',
                title: 'Action Triggered',
                description: 'Navigating to Drop creator...',
              })
            }
          />

          {/* Loading Skeletons & Spinners */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Card variant="raised" className="p-6 space-y-4">
              <h3 className="text-sm font-bold text-n1-text-primary">Skeleton Shimmer Loaders</h3>
              <div className="space-y-2.5">
                <Skeleton height={20} className="w-3/4" />
                <Skeleton height={14} className="w-full" />
                <Skeleton height={14} className="w-5/6" />
                <div className="flex items-center gap-3 pt-2">
                  <Skeleton circle width={36} height={36} />
                  <div className="space-y-1 flex-1">
                    <Skeleton height={12} className="w-1/2" />
                    <Skeleton height={10} className="w-1/3" />
                  </div>
                </div>
              </div>
            </Card>

            <Card variant="raised" className="p-6 space-y-4">
              <h3 className="text-sm font-bold text-n1-text-primary">Spinners & Overlay</h3>
              <div className="flex items-center justify-around py-4">
                <Spinner size="sm" color="purple" />
                <Spinner size="md" color="purple" />
                <Spinner size="lg" color="gold" />
                <Spinner size="xl" color="white" />
              </div>
              <LoadingOverlay message="Synchronizing encrypted channels..." size="md" />
            </Card>
          </div>

          {/* Error State */}
          <ErrorState
            title="Drop Decryption Failed"
            message="The secret passphrase provided does not match the HMAC authentication tag for this drop."
            details={`Error: HMAC_VERIFICATION_FAILED
Payload: 0x8a92f03...
Timestamp: 2026-09-29T11:00:00Z`}
            onRetry={() =>
              toast({
                variant: 'info',
                title: 'Retrying verification',
                description: 'Attempting to re-derive key...',
              })
            }
            actionLabel="Return to Home"
            onAction={() =>
              toast({
                variant: 'info',
                title: 'Returning home',
                description: 'Back to main portal.',
              })
            }
          />
        </div>
      </section>

      {/* Interactive Showcase Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="N1 Drop Configuration"
        description="Configure parameters for your encrypted ephemeral drop."
        size="md"
      >
        <div className="space-y-4">
          <Input label="Drop Title (Optional)" placeholder="Project Briefing" />
          <Select
            label="Self-Destruct Duration"
            defaultValue="1h"
            options={[
              { value: '10m', label: '10 Minutes' },
              { value: '1h', label: '1 Hour' },
              { value: '24h', label: '24 Hours' },
            ]}
          />
          <Textarea label="Optional Note" placeholder="Add confidential instructions..." rows={3} />
        </div>

        <ModalFooter className="-mx-6 -mb-6 mt-6">
          <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setModalOpen(false);
              toast({
                variant: 'success',
                title: 'Configuration Saved',
                description: 'Drop parameters have been updated.',
              });
            }}
          >
            Confirm & Save
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

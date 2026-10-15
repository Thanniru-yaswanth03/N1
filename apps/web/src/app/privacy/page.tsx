import React from 'react';
import Link from 'next/link';
import { Card, Badge } from '../../components/ui';

export const metadata = {
  title: 'Privacy Policy | N1 Quably Drop',
  description:
    'Accurate technical transparency regarding data processing, ephemeral storage lifetimes, client-side storage, and security logging on the N1 platform.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10 animate-fade-in text-n1-text-primary">
      {/* Header */}
      <div className="space-y-4 text-center sm:text-left">
        <div className="inline-flex items-center gap-2">
          <Badge variant="primary" dot pulse>
            Technical Transparency
          </Badge>
          <span className="text-xs text-n1-text-muted">Effective Date: October 2026</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight font-brand">
          Privacy Policy & Data Architecture
        </h1>
        <p className="text-base sm:text-lg text-n1-text-secondary leading-relaxed max-w-3xl">
          At N1, we believe privacy is an engineering guarantee, not a marketing slogan. This policy
          explains exactly what data is processed, what is stored, how long it persists, and our security
          practices.
        </p>
      </div>

      <div className="space-y-8">
        {/* Section 1: Zero Accounts */}
        <Card variant="raised" className="p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="text-n1-purple-light">1.</span> Zero User Accounts
          </h2>
          <p className="text-sm text-n1-text-secondary leading-relaxed">
            N1 does not provide, require, or maintain user registration accounts for general platform use.
            You do not need an email, username, phone number, or identity provider to create a Drop, use
            our developer tools, draw on the Study Board, or enter a Quably Duel.
          </p>
        </Card>

        {/* Section 2: What Data is Processed & Stored */}
        <Card variant="raised" className="p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="text-n1-purple-light">2.</span> Data Processed and Stored
          </h2>
          <div className="space-y-3 text-sm text-n1-text-secondary leading-relaxed">
            <p>
              When you use our services, we process only the minimum technical data necessary to provide
              ephemeral functionality:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-n1-text-secondary">
              <li>
                <strong className="text-n1-text-primary">Drop Content:</strong> Uploaded files and text
                snippets are temporarily saved to encrypted disk storage.
              </li>
              <li>
                <strong className="text-n1-text-primary">Password Protection:</strong> If you protect a Drop
                with a password, the raw password is never stored. It is hashed using Argon2id with a
                server-side pepper.
              </li>
              <li>
                <strong className="text-n1-text-primary">Real-Time Multiplayer State:</strong> Drawing strokes
                in Study Board and quiz answers in Quably Duel are transmitted via WebSockets and kept in
                ephemeral memory only for the duration of the active room session.
              </li>
            </ul>
          </div>
        </Card>

        {/* Section 3: Data Lifetimes and Deletion */}
        <Card variant="raised" className="p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="text-n1-purple-light">3.</span> Storage Lifetimes & Automatic Deletion
          </h2>
          <div className="space-y-3 text-sm text-n1-text-secondary leading-relaxed">
            <p>All user-generated content on N1 is strictly ephemeral:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-n1-text-primary">Expiration Limits:</strong> Drops exist only for their
                configured lifetime (from 5 minutes up to a maximum of 7 days).
              </li>
              <li>
                <strong className="text-n1-text-primary">Burn-After-Reading:</strong> If burn-after-reading is
                enabled, content is immediately queued for unlinking upon first retrieval.
              </li>
              <li>
                <strong className="text-n1-text-primary">Automated Cleanup Worker:</strong> A background
                expiration daemon runs continuously to permanently delete expired files from disk storage.
              </li>
              <li>
                <strong className="text-n1-text-primary">Owner Burn:</strong> Drop creators receive a
                cryptographic deletion token that permits immediate early deletion from our servers at any time.
              </li>
            </ul>
          </div>
        </Card>

        {/* Section 4: Client-Side Storage */}
        <Card variant="raised" className="p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="text-n1-purple-light">4.</span> Client-Side Storage (localStorage)
          </h2>
          <div className="space-y-3 text-sm text-n1-text-secondary leading-relaxed">
            <p>
              To maintain our zero-account model while offering convenient history recall, certain non-sensitive
              data is kept strictly on your local browser:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-n1-text-primary">My Recent Drops:</strong> Stores drop codes, creation
                dates, expiry timestamps, and deletion tokens in your browser&apos;s <code className="text-xs bg-n1-surface px-1.5 py-0.5 rounded font-mono">localStorage</code>.
                This information is <strong className="text-emerald-400">never sent to our servers</strong>.
              </li>
              <li>
                <strong className="text-n1-text-primary">Theme & Preferences:</strong> UI theme selection
                (dark/light/system).
              </li>
              <li>
                <strong className="text-n1-text-primary">Clearing Local Storage:</strong> You can clear individual
                entries or clear all recent drops at any time through the &quot;My Recent Drops&quot; drawer or browser
                settings.
              </li>
            </ul>
          </div>
        </Card>

        {/* Section 5: Security & Audit Logging */}
        <Card variant="raised" className="p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="text-n1-purple-light">5.</span> Security & Operational Logging
          </h2>
          <div className="space-y-3 text-sm text-n1-text-secondary leading-relaxed">
            <p>
              We do <strong className="text-n1-text-primary">not</strong> claim a &quot;zero logs&quot; policy because
              responsible infrastructure security requires operational audit logging:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-n1-text-primary">Abuse Prevention & Rate Limiting:</strong> IP addresses
                and request counters are kept in volatile in-memory sliding windows to block brute-force attacks,
                DDoS, and automated abuse.
              </li>
              <li>
                <strong className="text-n1-text-primary">Moderation Reports:</strong> When users submit abuse reports
                for illegal or malicious content, the report reason and associated Drop code are logged for administrative
                review.
              </li>
              <li>
                <strong className="text-n1-text-primary">Administrative Actions:</strong> Actions performed by authorized
                administrators (such as blacklisting malware or resolving reports) are recorded in an audit trail.
              </li>
            </ul>
          </div>
        </Card>

        {/* Section 6: Cookies and Trackers */}
        <Card variant="raised" className="p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="text-n1-purple-light">6.</span> Third-Party Services & Tracking
          </h2>
          <p className="text-sm text-n1-text-secondary leading-relaxed">
            N1 does not embed third-party advertising networks, analytics pixels (e.g., Google Analytics, Meta Pixel),
            or cross-site tracking cookies. Offline Developer Tools run 100% locally in your browser sandbox without
            making external network requests.
          </p>
        </Card>

        {/* Section 7: Limitations */}
        <Card variant="raised" className="p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="text-n1-purple-light">7.</span> Limitations of Anonymous Sharing
          </h2>
          <p className="text-sm text-n1-text-secondary leading-relaxed">
            Any party in possession of a valid 6-character Drop code (and passphrase if assigned) can access the
            unencrypted content while the Drop remains active. We strongly recommend setting a robust passphrase and
            using Burn-After-Reading when exchanging sensitive material.
          </p>
        </Card>
      </div>

      <div className="pt-8 border-t border-n1-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-n1-text-muted">
        <div>N1 Privacy Architecture · No Accounts · Ephemeral Storage</div>
        <div className="flex items-center gap-4">
          <Link href="/terms" className="hover:text-n1-text-primary transition-colors">
            Terms of Service
          </Link>
          <Link href="/drop" className="text-n1-purple-light font-semibold hover:underline">
            Create a Drop →
          </Link>
        </div>
      </div>
    </div>
  );
}

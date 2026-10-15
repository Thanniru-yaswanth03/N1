import React from 'react';
import Link from 'next/link';
import { Card, Badge } from '../../components/ui';

export const metadata = {
  title: 'Terms of Service | N1 Quably Drop',
  description:
    'Terms of service, acceptable use rules, ephemeral storage disclaimers, and moderation guidelines for the N1 platform.',
};

export default function TermsOfServicePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10 animate-fade-in text-n1-text-primary">
      {/* Header */}
      <div className="space-y-4 text-center sm:text-left">
        <div className="inline-flex items-center gap-2">
          <Badge variant="primary" dot pulse>
            Acceptable Use
          </Badge>
          <span className="text-xs text-n1-text-muted">Effective Date: October 2026</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight font-brand">
          Terms of Service
        </h1>
        <p className="text-base sm:text-lg text-n1-text-secondary leading-relaxed max-w-3xl">
          By accessing or using N1, including N1 Drop, Offline Developer Tools, Study Board, or Quably
          Duel, you agree to these Terms. If you do not agree, please do not use the platform.
        </p>
      </div>

      <div className="space-y-8">
        {/* Section 1: Nature of the Service */}
        <Card variant="raised" className="p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="text-n1-purple-light">1.</span> Ephemeral Nature of the Service
          </h2>
          <div className="space-y-3 text-sm text-n1-text-secondary leading-relaxed">
            <p>
              N1 is intentionally built for temporary, anonymous content exchange. You acknowledge and
              agree that:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-n1-text-primary">Not a Backup Service:</strong> All content is
                transient and automatically purged upon expiration, view limit exhaustion, or manual deletion.
                Never use N1 as a sole repository or permanent backup for critical data.
              </li>
              <li>
                <strong className="text-n1-text-primary">Irreversible Destruction:</strong> Once a Drop expires
                or is burned, its contents are unlinked from physical storage and cannot be restored.
              </li>
            </ul>
          </div>
        </Card>

        {/* Section 2: Acceptable Use Policy */}
        <Card variant="raised" className="p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="text-n1-purple-light">2.</span> Acceptable Use Policy (Prohibited Activities)
          </h2>
          <div className="space-y-3 text-sm text-n1-text-secondary leading-relaxed">
            <p>You agree not to use the N1 platform to upload, transmit, or share:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                Child Sexual Abuse Material (CSAM) or Child Sexual Exploitation and Abuse (CSAE) in any form.
                Such material is strictly prohibited and subject to immediate deletion and reporting to
                appropriate authorities.
              </li>
              <li>
                Malware, viruses, ransomware, trojans, keyloggers, or malicious payloads designed to damage or
                gain unauthorized access to any system.
              </li>
              <li>
                Phishing pages, credential harvesting utilities, or scam materials.
              </li>
              <li>
                Unauthorized distribution of stolen credentials, private personal records, or confidential
                data in violation of privacy laws.
              </li>
              <li>
                Copyright-infringing or trade-secret-violating content without authorization.
              </li>
              <li>
                Engage in denial of service (DoS/DDoS) attacks, brute-force attempts on Drop codes, or
                automated vulnerability exploitation.
              </li>
            </ul>
          </div>
        </Card>

        {/* Section 3: Intellectual Property */}
        <Card variant="raised" className="p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="text-n1-purple-light">3.</span> Intellectual Property & Ownership
          </h2>
          <p className="text-sm text-n1-text-secondary leading-relaxed">
            You retain all rights and ownership of any files, text, or content you upload to N1. We claim no
            ownership or proprietary interest in your content. By uploading content, you grant N1 only the
            limited, non-exclusive, temporary technical license necessary to host, transmit, and serve the
            material to designated recipients until its scheduled expiration.
          </p>
        </Card>

        {/* Section 4: Moderation & Enforcement */}
        <Card variant="raised" className="p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="text-n1-purple-light">4.</span> Abuse Reporting & Moderation
          </h2>
          <div className="space-y-3 text-sm text-n1-text-secondary leading-relaxed">
            <p>
              We maintain active abuse reporting tools accessible from every Drop page. When content is
              reported:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                System administrators investigate reported content against our Acceptable Use Policy.
              </li>
              <li>
                Violating content will be immediately deleted, associated Drop codes invalidated, and
                offending IP ranges or hashes blacklisted.
              </li>
            </ul>
          </div>
        </Card>

        {/* Section 5: Disclaimer of Warranties */}
        <Card variant="raised" className="p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="text-n1-purple-light">5.</span> Disclaimer of Warranties & Limitation of Liability
          </h2>
          <p className="text-sm text-n1-text-secondary leading-relaxed">
            N1 is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis without warranty of any kind, either
            express or implied. In no event shall N1, its contributors, or maintainers be liable for any
            indirect, incidental, consequential, or punitive damages arising from the use of, or inability to
            use, the service or any loss of data resulting from expiration or system events.
          </p>
        </Card>

        {/* Section 6: Modifications */}
        <Card variant="raised" className="p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="text-n1-purple-light">6.</span> Updates to Terms
          </h2>
          <p className="text-sm text-n1-text-secondary leading-relaxed">
            We reserve the right to modify these terms as our platform evolves. Any changes will be posted
            directly on this page with an updated effective date.
          </p>
        </Card>
      </div>

      <div className="pt-8 border-t border-n1-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-n1-text-muted">
        <div>N1 Quably Drop · Terms of Service</div>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="hover:text-n1-text-primary transition-colors">
            Privacy Policy
          </Link>
          <Link href="/drop" className="text-n1-purple-light font-semibold hover:underline">
            Create a Drop →
          </Link>
        </div>
      </div>
    </div>
  );
}

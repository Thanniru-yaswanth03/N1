'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Input } from '../../../components/ui';
import { adminLogin, getAdminSession } from '../../../lib/admin-client';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // If already authenticated, redirect to /admin
    getAdminSession()
      .then(() => {
        router.push('/admin');
      })
      .catch(() => {
        setIsCheckingAuth(false);
      });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim() || !password) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    setIsLoading(true);
    try {
      await adminLogin(username.trim(), password);
      router.push('/admin');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials or access denied';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#07070a] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-n1-purple border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-n1-text-secondary font-mono tracking-wider">
            VERIFYING ENCRYPTED SESSION...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh+10rem)] -mt-24 -mb-16 bg-[#07070a] text-n1-text-primary flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-n1-purple/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Security Warning Badge */}
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono tracking-wider uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            Restricted Access • N1 Console
          </div>
        </div>

        {/* Login Card */}
        <Card variant="glass" className="p-8 border-n1-border shadow-2xl backdrop-blur-xl">
          <div className="text-center mb-6 space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-n1-purple/10 border border-n1-purple/30 text-n1-purple-light mb-2">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">System Administration</h1>
            <p className="text-xs text-n1-text-secondary leading-relaxed">
              Moderation console, telemetry streams, and security audit log access.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <svg className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-n1-text-secondary mb-1.5">
                Admin Username
              </label>
              <Input
                type="text"
                placeholder="admin"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoFocus
                autoComplete="username"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-n1-text-secondary mb-1.5">
                Passphrase Key
              </label>
              <Input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2 gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Enter Admin Portal</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-n1-border-subtle text-center">
            <p className="text-[11px] text-n1-text-muted font-mono">
              Audit logging active • All actions are recorded with SHA-256 IP signatures.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

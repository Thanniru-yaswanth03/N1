'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  DuelClientQuestion,
  DuelMatchResults,
  DuelPlayer,
  DuelRoomStatus,
  DuelRoomSummary,
} from '@n1/shared';
import { DuelSocketClient, getDuelRoom } from '../../../lib/duel-client';
import { DuelLobby } from '../../../components/duel/DuelLobby';
import { DuelArena } from '../../../components/duel/DuelArena';
import { DuelResults } from '../../../components/duel/DuelResults';
import { Button } from '../../../components/ui/Button';
import { Breadcrumbs } from '../../../components/ui/Breadcrumbs';

export default function DuelRoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = ((params?.code as string) || '').toUpperCase().trim();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Room & Player State
  const [room, setRoom] = useState<DuelRoomSummary | null>(null);
  const [players, setPlayers] = useState<DuelPlayer[]>([]);
  const [currentUser, setCurrentUser] = useState<DuelPlayer | null>(null);
  const [opponent, setOpponent] = useState<DuelPlayer | null>(null);

  // Match Flow State
  const [status, setStatus] = useState<DuelRoomStatus>('WAITING_FOR_OPPONENT');
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const [questions, setQuestions] = useState<DuelClientQuestion[]>([]);
  const [matchDurationSeconds, setMatchDurationSeconds] = useState<number>(60);
  const [endsAt, setEndsAt] = useState<string>('');
  const [results, setResults] = useState<DuelMatchResults | null>(null);

  // Live Answer Feedback State
  const [lastAnswerResult, setLastAnswerResult] = useState<{
    questionIndex: number;
    selectedOption: number;
    isCorrect: boolean;
    scoreEarned: number;
    totalScore: number;
    nextQuestionIndex: number;
  } | null>(null);

  // Disconnection & Rematch State
  const [disconnectGrace, setDisconnectGrace] = useState<number | null>(null);
  const [rematchOfferedBy, setRematchOfferedBy] = useState<string | null>(null);
  const [needsNamePrompt, setNeedsNamePrompt] = useState<boolean>(false);
  const [joiningName, setJoiningName] = useState<string>('');

  const socketClientRef = useRef<DuelSocketClient | null>(null);

  // 1. Initial Room Inspection via REST
  useEffect(() => {
    if (!roomCode) return;

    let isMounted = true;

    async function inspectRoom() {
      try {
        const data = await getDuelRoom(roomCode);
        if (!isMounted) return;

        setRoom(data.room);

        // Check if current browser holds the host token
        const storedToken = sessionStorage.getItem(`duel_token_${roomCode}`);
        const isHost = storedToken === data.host.id;

        if (!isHost && !storedToken && data.room.status === 'WAITING_FOR_OPPONENT') {
          // New rival visitor joining
          setNeedsNamePrompt(true);
          setLoading(false);
          return;
        }

        // Connect directly
        connectWebSocket(storedToken || undefined);
      } catch (err: unknown) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Could not load challenge room');
        setLoading(false);
      }
    }

    inspectRoom();

    return () => {
      isMounted = false;
      socketClientRef.current?.disconnect();
    };
  }, [roomCode]);

  const connectWebSocket = (token?: string, customName?: string) => {
    const client = new DuelSocketClient({
      onLobbyState: data => {
        setRoom(data.room);
        setPlayers(data.players);
        setCurrentUser(data.currentUser);

        const opp = data.players.find(p => p.id !== data.currentUser.id) || null;
        setOpponent(opp);
        setStatus(data.room.status);
        setLoading(false);

        // Cache player token
        sessionStorage.setItem(`duel_token_${roomCode}`, data.currentUser.id);
      },

      onOpponentJoined: opp => {
        setOpponent(opp);
        setPlayers(prev => {
          const filtered = prev.filter(p => p.id !== opp.id);
          return [...filtered, opp];
        });
      },

      onCountdownTick: seconds => {
        setStatus('COUNTDOWN');
        setCountdownSeconds(seconds);
      },

      onMatchStart: data => {
        setStatus('IN_PROGRESS');
        setCountdownSeconds(null);
        setQuestions(data.questions);
        setMatchDurationSeconds(data.matchDurationSeconds);
        setEndsAt(data.endsAt);
        setDisconnectGrace(null);
      },

      onAnswerResult: result => {
        setLastAnswerResult(result);
        setCurrentUser(prev => (prev ? { ...prev, score: result.totalScore } : null));
      },

      onPlayerProgress: progress => {
        setOpponent(prev =>
          prev
            ? {
                ...prev,
                score: progress.score,
                currentQuestionIndex: progress.currentQuestionIndex,
                isFinished: progress.isFinished,
              }
            : null
        );
      },

      onMatchFinished: res => {
        setStatus('FINISHED');
        setResults(res);
        setDisconnectGrace(null);
      },

      onOpponentDisconnected: graceSeconds => {
        setDisconnectGrace(graceSeconds);
      },

      onOpponentReconnected: () => {
        setDisconnectGrace(null);
      },

      onOpponentForfeited: winnerId => {
        setDisconnectGrace(null);
        alert(winnerId === currentUser?.id ? 'Opponent forfeited! You win!' : 'Match ended.');
      },

      onRematchOffered: fromId => {
        setRematchOfferedBy(fromId);
      },

      onRematchAccepted: nextCode => {
        router.push(`/duel/${nextCode}`);
      },

      onError: msg => {
        setError(msg);
        setLoading(false);
      },
    });

    socketClientRef.current = client;
    client.connect(roomCode, token, customName);
  };

  const handleJoinWithName = (e: React.FormEvent) => {
    e.preventDefault();
    setNeedsNamePrompt(false);
    setLoading(true);
    connectWebSocket(undefined, joiningName.trim() || undefined);
  };

  const handleAnswerSubmit = (questionIndex: number, selectedOption: number) => {
    socketClientRef.current?.submitAnswer(questionIndex, selectedOption);
  };

  const handleRequestRematch = () => {
    socketClientRef.current?.requestRematch();
  };

  const handleAcceptRematch = () => {
    socketClientRef.current?.acceptRematch();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto" />
          <div className="text-zinc-300 font-medium">Entering Duel Arena...</div>
          <div className="text-xs font-mono text-zinc-500">Room: {roomCode}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <h2 className="text-xl font-bold text-zinc-100">Unable to Join Duel</h2>
          <p className="text-zinc-400 text-sm">{error}</p>
          <Button variant="primary" onClick={() => router.push('/duel')} className="w-full">
            Return to Duel Hub
          </Button>
        </div>
      </div>
    );
  }

  // Name prompt modal for anonymous rival visitors
  if (needsNamePrompt && room) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 animate-fade-in">
        <div className="max-w-md w-full bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-md">
          <div className="text-center space-y-2">
            <span className="px-3 py-1 bg-pink-500/10 text-pink-400 border border-pink-500/30 rounded-full text-xs font-bold uppercase tracking-wider">
              Duel Challenge Received
            </span>
            <h2 className="text-2xl font-black text-zinc-100">You Have Been Challenged!</h2>
            <p className="text-xs text-zinc-400">
              Host <strong className="text-indigo-400">{room.hostName}</strong> is waiting for you in the {room.category} arena.
            </p>
          </div>

          <form onSubmit={handleJoinWithName} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">
                Enter Your Duel Nickname
              </label>
              <input
                type="text"
                required
                maxLength={20}
                placeholder="e.g. CodeSlayer"
                value={joiningName}
                onChange={e => setJoiningName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-pink-500"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white font-bold"
            >
              Accept Challenge & Enter
            </Button>
          </form>
        </div>
      </div>
    );
  }

  const currentStageBadge = (() => {
    if (disconnectGrace !== null) {
      return {
        label: 'OPPONENT DISCONNECTED',
        cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30 animate-pulse',
      };
    }
    if (status === 'FINISHED') {
      return {
        label: 'COMPLETED',
        cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      };
    }
    if (status === 'IN_PROGRESS') {
      return {
        label: 'LIVE',
        cls: 'bg-rose-500/15 text-rose-300 border-rose-500/30 animate-pulse',
      };
    }
    if (status === 'COUNTDOWN') {
      return {
        label: 'STARTING',
        cls: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30 animate-pulse',
      };
    }
    if (players.length >= 2) {
      return {
        label: 'MATCH FOUND',
        cls: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
      };
    }
    return {
      label: 'WAITING',
      cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    };
  })();

  return (
    <div className="min-h-screen bg-black text-zinc-100 py-6 sm:py-8">
      {/* Top Header Breadcrumbs & Status */}
      <div className="max-w-4xl mx-auto px-4 mb-4 flex items-center justify-between gap-3 flex-wrap">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Duel', href: '/duel' },
            { label: `Room ${roomCode}` },
          ]}
        />
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-mono text-zinc-500 tracking-wider">Status</span>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${currentStageBadge.cls}`}>
            {currentStageBadge.label}
          </span>
        </div>
      </div>

      {/* Opponent Disconnect Grace Period Toast */}
      {disconnectGrace !== null && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-amber-950/90 border border-amber-500/50 rounded-xl px-4 py-2.5 shadow-2xl text-xs sm:text-sm text-amber-200 flex items-center gap-2 animate-bounce">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
          Opponent disconnected! Waiting {disconnectGrace}s grace period before forfeit win...
        </div>
      )}

      {/* Render current view based on status */}
      {status === 'FINISHED' && results && currentUser ? (
        <DuelResults
          results={results}
          currentUser={currentUser}
          rematchOfferedBy={rematchOfferedBy}
          onRequestRematch={handleRequestRematch}
          onAcceptRematch={handleAcceptRematch}
        />
      ) : status === 'IN_PROGRESS' && currentUser ? (
        <DuelArena
          questions={questions}
          matchDurationSeconds={matchDurationSeconds}
          endsAt={endsAt}
          currentUser={currentUser}
          opponent={opponent}
          onAnswerSubmit={handleAnswerSubmit}
          lastAnswerResult={lastAnswerResult}
        />
      ) : room && currentUser ? (
        <DuelLobby
          room={room}
          players={players}
          currentUser={currentUser}
          countdownSeconds={countdownSeconds}
        />
      ) : null}
    </div>
  );
}

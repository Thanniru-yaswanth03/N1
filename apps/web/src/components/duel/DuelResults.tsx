'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { DuelMatchResults, DuelPlayer } from '@n1/shared';
import { Button } from '../ui/Button';

interface DuelResultsProps {
  results: DuelMatchResults;
  currentUser: DuelPlayer;
  rematchOfferedBy: string | null;
  onRequestRematch: () => void;
  onAcceptRematch: () => void;
}

export function DuelResults({
  results,
  currentUser,
  rematchOfferedBy,
  onRequestRematch,
  onAcceptRematch,
}: DuelResultsProps) {
  const [rematchRequested, setRematchRequested] = useState(false);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  const isUserHost = results.host.id === currentUser.id;
  const userStats = isUserHost ? results.host : results.opponent;
  const oppStats = isUserHost ? results.opponent : results.host;

  const isWinner = results.winnerId === currentUser.id;
  const isDraw = results.isDraw;

  const handleRematchClick = () => {
    if (rematchOfferedBy) {
      onAcceptRematch();
    } else {
      setRematchRequested(true);
      onRequestRematch();
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      {/* Victory / Defeat / Draw Hero Banner */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          COMPLETED · Match Concluded
        </div>

        {isDraw ? (
          <h1 className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-200">
            STALEMATE! DRAW!
          </h1>
        ) : isWinner ? (
          <div className="space-y-2">
            <div className="text-4xl sm:text-5xl">👑</div>
            <h1 className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 drop-shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              VICTORY!
            </h1>
            <p className="text-zinc-400 text-sm sm:text-base">
              Outstanding performance. You outscored your rival in speed and precision!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-4xl sm:text-5xl">⚡</div>
            <h1 className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-pink-400 to-amber-400">
              DEFEAT
            </h1>
            <p className="text-zinc-400 text-sm sm:text-base">
              A close battle! Challenge your rival to a rematch to claim the win.
            </p>
          </div>
        )}
      </div>

      {/* Head-to-Head Comparative Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* User Card */}
        <div
          className={`rounded-2xl p-6 border shadow-xl relative overflow-hidden ${
            isWinner
              ? 'bg-emerald-950/20 border-emerald-500/40 ring-1 ring-emerald-500/20'
              : 'bg-zinc-900/70 border-zinc-800'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 text-lg font-black">
                {userStats.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-bold text-zinc-100 flex items-center gap-1.5">
                  {userStats.name}
                  <span className="text-xs text-zinc-400 font-normal">(You)</span>
                </div>
                <div className="text-xs text-indigo-400 font-mono">
                  Accuracy: {userStats.accuracy}%
                </div>
              </div>
            </div>
            {isWinner && (
              <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold rounded-lg uppercase">
                Winner
              </span>
            )}
          </div>

          <div className="space-y-2 pt-2 border-t border-zinc-800/80">
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-400">Final Score:</span>
              <span className="font-mono font-black text-2xl text-indigo-300">
                {userStats.score} <span className="text-xs font-normal text-zinc-500">pts</span>
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-400">Correct Answers:</span>
              <span className="font-mono font-bold text-zinc-200">
                {userStats.correctCount} / {userStats.totalAnswered}
              </span>
            </div>
          </div>
        </div>

        {/* Opponent Card */}
        <div
          className={`rounded-2xl p-6 border shadow-xl relative overflow-hidden ${
            !isWinner && !isDraw
              ? 'bg-emerald-950/20 border-emerald-500/40 ring-1 ring-emerald-500/20'
              : 'bg-zinc-900/70 border-zinc-800'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-pink-600/30 border border-pink-500/40 flex items-center justify-center text-pink-300 text-lg font-black">
                {oppStats.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-bold text-zinc-100">{oppStats.name}</div>
                <div className="text-xs text-pink-400 font-mono">
                  Accuracy: {oppStats.accuracy}%
                </div>
              </div>
            </div>
            {!isWinner && !isDraw && (
              <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold rounded-lg uppercase">
                Winner
              </span>
            )}
          </div>

          <div className="space-y-2 pt-2 border-t border-zinc-800/80">
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-400">Final Score:</span>
              <span className="font-mono font-black text-2xl text-pink-300">
                {oppStats.score} <span className="text-xs font-normal text-zinc-500">pts</span>
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-400">Correct Answers:</span>
              <span className="font-mono font-bold text-zinc-200">
                {oppStats.correctCount} / {oppStats.totalAnswered}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Rematch Actions Bar */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div>
          <h3 className="font-bold text-zinc-100">Ready for Round 2?</h3>
          <p className="text-xs text-zinc-400">
            Generate an instant rematch with fresh randomized questions in the same category!
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <Link href="/duel" className="w-full sm:w-auto">
            <Button variant="secondary" size="md" className="w-full">
              Duel Hub
            </Button>
          </Link>

          <Button
            variant="primary"
            size="md"
            onClick={handleRematchClick}
            className="w-full sm:w-auto gap-2 bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold"
          >
            {rematchOfferedBy ? (
              'Accept Rematch Offer!'
            ) : rematchRequested ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Waiting for Rival...
              </>
            ) : (
              'Rematch Rival'
            )}
          </Button>
        </div>
      </div>

      {/* Comprehensive Question Review Accordion */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
          <span>Question Review & Explanations</span>
          <span className="text-xs font-normal text-zinc-400">({results.review.length} Questions)</span>
        </h2>

        <div className="space-y-3">
          {results.review.map((item, idx) => {
            const isExpanded = expandedQuestion === item.questionId;
            const userAnswer = isUserHost ? item.hostAnswer : item.opponentAnswer;
            const isUserCorrect = userAnswer === item.correctOption;

            return (
              <div
                key={item.questionId}
                className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4 transition-all"
              >
                <div
                  className="flex items-start justify-between gap-4 cursor-pointer"
                  onClick={() => setExpandedQuestion(isExpanded ? null : item.questionId)}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-zinc-500">Q{idx + 1}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
                          isUserCorrect
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                        }`}
                      >
                        {isUserCorrect ? 'Correct (+pts)' : 'Incorrect'}
                      </span>
                    </div>
                    <div className="font-semibold text-zinc-200 text-sm sm:text-base">
                      {item.question}
                    </div>
                  </div>

                  <span className="text-zinc-500 text-xs shrink-0 mt-1">
                    {isExpanded ? 'Hide ▲' : 'Show Details ▼'}
                  </span>
                </div>

                {/* Code Snippet if present */}
                {item.codeSnippet && (
                  <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs font-mono text-indigo-300 overflow-x-auto">
                    <pre>{item.codeSnippet}</pre>
                  </div>
                )}

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="space-y-4 pt-3 border-t border-zinc-800/80 animate-fade-in">
                    {/* 4 Options Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {item.options.map((opt, oIdx) => {
                        const isCorrectOption = oIdx === item.correctOption;
                        const isUserSelected = oIdx === userAnswer;

                        let cardClass = 'bg-zinc-950/40 border-zinc-800 text-zinc-400';
                        if (isCorrectOption) {
                          cardClass = 'bg-emerald-950/40 border-emerald-500 text-emerald-200 font-semibold';
                        } else if (isUserSelected && !isCorrectOption) {
                          cardClass = 'bg-rose-950/40 border-rose-500 text-rose-300';
                        }

                        return (
                          <div
                            key={oIdx}
                            className={`p-3 rounded-lg border flex items-center justify-between gap-2 ${cardClass}`}
                          >
                            <span className="leading-snug">{opt}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              {isCorrectOption && (
                                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                                  Correct
                                </span>
                              )}
                              {isUserSelected && (
                                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded">
                                  Your Pick
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Server Explanation */}
                    <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-xl p-4 text-xs text-indigo-200 leading-relaxed">
                      <strong className="text-indigo-400 block mb-1">Explanation:</strong>
                      {item.explanation}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

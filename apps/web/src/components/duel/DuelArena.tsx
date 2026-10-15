'use client';

import React, { useState, useEffect } from 'react';
import { DuelClientQuestion, DuelPlayer, DUEL_CATEGORIES } from '@n1/shared';

interface DuelArenaProps {
  questions: DuelClientQuestion[];
  matchDurationSeconds: number;
  endsAt: string;
  currentUser: DuelPlayer;
  opponent: DuelPlayer | null;
  onAnswerSubmit: (questionIndex: number, selectedOption: number) => void;
  lastAnswerResult: {
    questionIndex: number;
    selectedOption: number;
    isCorrect: boolean;
    scoreEarned: number;
    totalScore: number;
    nextQuestionIndex: number;
  } | null;
}

export function DuelArena({
  questions,
  matchDurationSeconds,
  endsAt,
  currentUser,
  opponent,
  onAnswerSubmit,
  lastAnswerResult,
}: DuelArenaProps) {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(matchDurationSeconds);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(currentUser.currentQuestionIndex || 0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showFeedback, setShowFeedback] = useState<boolean>(false);

  // Synchronized countdown timer based on authoritative endsAt timestamp
  useEffect(() => {
    const targetTime = new Date(endsAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diffSec = Math.max(0, Math.ceil((targetTime - now) / 1000));
      setSecondsRemaining(diffSec);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [endsAt]);

  // When answer result arrives from server
  useEffect(() => {
    if (lastAnswerResult && lastAnswerResult.questionIndex === currentQuestionIdx) {
      setShowFeedback(true);
      const timer = setTimeout(() => {
        setShowFeedback(false);
        setSelectedOption(null);
        setIsSubmitting(false);
        setCurrentQuestionIdx(lastAnswerResult.nextQuestionIndex);
      }, 750);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [lastAnswerResult, currentQuestionIdx]);

  const currentQuestion = questions[currentQuestionIdx];
  const isFinished = currentQuestionIdx >= questions.length;
  const categoryMeta = currentQuestion ? DUEL_CATEGORIES.find(c => c.id === currentQuestion.category) : null;

  const handleSelectOption = (idx: number) => {
    if (isSubmitting || showFeedback || isFinished || secondsRemaining <= 0) return;
    setSelectedOption(idx);
    setIsSubmitting(true);
    onAnswerSubmit(currentQuestionIdx, idx);
  };

  // Keyboard shortcut listener (1-4 and A-D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSubmitting || showFeedback || isFinished) return;
      if (e.key === '1' || e.key === 'a' || e.key === 'A') handleSelectOption(0);
      if (e.key === '2' || e.key === 'b' || e.key === 'B') handleSelectOption(1);
      if (e.key === '3' || e.key === 'c' || e.key === 'C') handleSelectOption(2);
      if (e.key === '4' || e.key === 'd' || e.key === 'D') handleSelectOption(3);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, showFeedback, isFinished, currentQuestionIdx]);

  // Timer color calculation
  const timerPercent = Math.max(0, Math.min(100, (secondsRemaining / 60) * 100));
  const isTimerCritical = secondsRemaining <= 10;
  const isTimerWarning = secondsRemaining <= 25 && !isTimerCritical;

  const timerColor = isTimerCritical
    ? 'text-rose-500'
    : isTimerWarning
      ? 'text-amber-400'
      : 'text-indigo-400';

  const userScore = lastAnswerResult?.totalScore ?? currentUser.score;
  const oppScore = opponent?.score ?? 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-5 animate-fade-in">
      {/* Top Arena Header: Head-to-Head & Synchronized Timer */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3 sm:p-5 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* User Score Card */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-black text-sm sm:text-lg shrink-0">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] sm:text-xs text-zinc-400 font-medium truncate max-w-[70px] sm:max-w-[160px]">
                {currentUser.name} (You)
              </div>
              <div className="text-base sm:text-2xl font-black text-indigo-400 tabular-nums">
                {userScore} <span className="text-[10px] sm:text-xs font-normal text-zinc-500">pts</span>
              </div>
            </div>
          </div>

          {/* Synchronized Circular Timer */}
          <div className="flex flex-col items-center justify-center shrink-0">
            <div className="relative w-12 h-12 sm:w-20 sm:h-20 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 36 36">
                <path
                  className="text-zinc-800"
                  strokeWidth="3.2"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={`transition-all duration-300 ${timerColor}`}
                  strokeDasharray={`${timerPercent}, 100`}
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div
                className={`absolute text-center font-mono font-black text-sm sm:text-xl ${timerColor} ${isTimerCritical ? 'animate-pulse' : ''
                  }`}
              >
                {secondsRemaining}s
              </div>
            </div>
            <div className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-wider text-rose-400 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
              LIVE
            </div>
          </div>

          {/* Opponent Score Card */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-end text-right min-w-0">
            <div className="min-w-0">
              <div className="text-[11px] sm:text-xs text-zinc-400 font-medium truncate max-w-[70px] sm:max-w-[160px]">
                {opponent?.name || 'Rival'}
              </div>
              <div className="text-base sm:text-2xl font-black text-pink-400 tabular-nums">
                {oppScore} <span className="text-[10px] sm:text-xs font-normal text-zinc-500">pts</span>
              </div>
            </div>
            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl bg-pink-600/20 border border-pink-500/40 flex items-center justify-center text-pink-400 font-black text-sm sm:text-lg shrink-0">
              {opponent?.name ? opponent.name.charAt(0).toUpperCase() : 'R'}
            </div>
          </div>
        </div>

        {/* Progress Comparison Bar */}
        <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
          <div>
            Question <span className="text-zinc-200 font-bold">{Math.min(questions.length, currentQuestionIdx + 1)}</span> / {questions.length}
          </div>
          <div>
            Rival: <span className="text-zinc-200 font-bold">{opponent?.currentQuestionIndex || 0}</span> / {questions.length} answered
          </div>
        </div>
      </div>

      {/* Main Arena Content Area */}
      {isFinished ? (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-8 sm:p-12 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-3xl">
            ✓
          </div>
          <h2 className="text-2xl font-black text-zinc-100">All Questions Completed!</h2>
          <p className="text-zinc-400 text-sm max-w-md mx-auto">
            You have answered all challenge questions with an impressive score of{' '}
            <strong className="text-indigo-400">{userScore} pts</strong>. Waiting for match timer to finish or opponent to complete!
          </p>
          <div className="inline-flex items-center gap-2 text-xs font-mono text-zinc-500">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
            Match ends in {secondsRemaining}s
          </div>
        </div>
      ) : currentQuestion ? (
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
          {/* Question Meta Header */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${categoryMeta?.badgeColor || 'border-zinc-700 text-zinc-300'
                  }`}
              >
                {categoryMeta?.name || currentQuestion.category}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700 capitalize">
                {currentQuestion.difficulty}
              </span>
            </div>
            <div className="text-xs font-mono text-zinc-500">
              Q{currentQuestionIdx + 1}
            </div>
          </div>

          {/* Question Text */}
          <h3 className="text-lg sm:text-xl font-bold text-zinc-100 leading-snug">
            {currentQuestion.question}
          </h3>

          {/* Code Snippet Box (if present) */}
          {currentQuestion.codeSnippet && (
            <div className="bg-zinc-950/90 border border-zinc-800 rounded-xl p-4 overflow-x-auto text-xs sm:text-sm font-mono text-indigo-300 leading-relaxed">
              <pre>{currentQuestion.codeSnippet}</pre>
            </div>
          )}

          {/* Interactive Option Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {currentQuestion.options.map((optionText, optIdx) => {
              const isSelected = selectedOption === optIdx;
              const optionLetters = ['A', 'B', 'C', 'D'];

              let optionStyle = 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/40 text-zinc-200';

              if (showFeedback && isSelected && lastAnswerResult) {
                optionStyle = lastAnswerResult.isCorrect
                  ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500/30'
                  : 'bg-rose-950/60 border-rose-500 text-rose-200 ring-2 ring-rose-500/30';
              } else if (isSelected) {
                optionStyle = 'bg-indigo-950/60 border-indigo-500 text-indigo-200 ring-2 ring-indigo-500/30';
              }

              return (
                <button
                  key={optIdx}
                  type="button"
                  onClick={() => handleSelectOption(optIdx)}
                  disabled={isSubmitting || showFeedback}
                  className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all relative overflow-hidden group ${optionStyle}`}
                >
                  <span className="w-6 h-6 rounded-lg bg-zinc-900 border border-zinc-700/80 flex items-center justify-center text-xs font-bold text-zinc-400 group-hover:text-zinc-200 shrink-0 mt-0.5">
                    {optionLetters[optIdx]}
                  </span>
                  <span className="text-sm font-medium leading-relaxed flex-1">
                    {optionText}
                  </span>

                  {/* Feedback Points Toast */}
                  {showFeedback && isSelected && lastAnswerResult && (
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${lastAnswerResult.isCorrect
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                    >
                      {lastAnswerResult.isCorrect ? `+${lastAnswerResult.scoreEarned}` : '+0'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-2">
            <span>Tip: Press keys 1-4 or A-D for instant submission</span>
            <span>Speed bonus adds up to +50 pts!</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

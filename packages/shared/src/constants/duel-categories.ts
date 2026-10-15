import { DuelCategory } from '../types/duel.js';

export interface DuelCategoryMeta {
  id: DuelCategory;
  name: string;
  shortDesc: string;
  badgeColor: string;
  iconName: string;
}

export const DUEL_CATEGORIES: DuelCategoryMeta[] = [
  {
    id: 'python',
    name: 'Python',
    shortDesc: 'Decorators, generators, OOP, GIL, and idiomatic syntax.',
    badgeColor: 'border-yellow-500/40 text-yellow-300 bg-yellow-500/10',
    iconName: 'python',
  },
  {
    id: 'java',
    name: 'Java',
    shortDesc: 'JVM, memory model, concurrency, streams, and OOP design.',
    badgeColor: 'border-orange-500/40 text-orange-300 bg-orange-500/10',
    iconName: 'java',
  },
  {
    id: 'javascript',
    name: 'JavaScript',
    shortDesc: 'Closures, event loop, Promises, prototypes, and ES6+ internals.',
    badgeColor: 'border-amber-400/40 text-amber-300 bg-amber-400/10',
    iconName: 'javascript',
  },
  {
    id: 'sql',
    name: 'SQL',
    shortDesc: 'Joins, indexing, query optimization, ACID transactions, and CTEs.',
    badgeColor: 'border-cyan-500/40 text-cyan-300 bg-cyan-500/10',
    iconName: 'sql',
  },
  {
    id: 'debugging',
    name: 'Debugging',
    shortDesc: 'Spot subtle logic traps, off-by-one errors, and memory leaks.',
    badgeColor: 'border-rose-500/40 text-rose-300 bg-rose-500/10',
    iconName: 'debugging',
  },
  {
    id: 'aptitude',
    name: 'Aptitude',
    shortDesc: 'Speed math, time & work, ratios, percentages, and probability.',
    badgeColor: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10',
    iconName: 'aptitude',
  },
  {
    id: 'logical-reasoning',
    name: 'Logical Reasoning',
    shortDesc: 'Deductive reasoning, pattern recognition, syllogisms, and series.',
    badgeColor: 'border-indigo-500/40 text-indigo-300 bg-indigo-500/10',
    iconName: 'logic',
  },
  {
    id: 'technical-trivia',
    name: 'Technical Trivia',
    shortDesc: 'RFC standards, Linux internals, protocol headers, and milestones.',
    badgeColor: 'border-purple-500/40 text-purple-300 bg-purple-500/10',
    iconName: 'trivia',
  },
  {
    id: 'cs-fundamentals',
    name: 'CS Fundamentals',
    shortDesc: 'Big-O notation, trees, graphs, caching algorithms, and OS concepts.',
    badgeColor: 'border-blue-500/40 text-blue-300 bg-blue-500/10',
    iconName: 'cs',
  },
  {
    id: 'brain-puzzles',
    name: 'Brain Puzzles',
    shortDesc: 'Brain-teaser logic riddles, weighing puzzles, and probability traps.',
    badgeColor: 'border-fuchsia-500/40 text-fuchsia-300 bg-fuchsia-500/10',
    iconName: 'puzzle',
  },
];

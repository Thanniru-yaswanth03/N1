import { DuelCategory, DuelDifficulty, DuelQuestion } from '@n1/shared';

export const QUESTION_BANK: DuelQuestion[] = [
  // ── 1. Python ─────────────────────────────────────────────────────────────
  {
    id: 'py-1',
    category: 'python',
    difficulty: 'easy',
    question: 'What is the output of the following Python expression?',
    codeSnippet: 'print(type(5 / 2))',
    options: ["<class 'int'>", "<class 'float'>", "<class 'double'>", "<class 'number'>"],
    correctOption: 1,
    explanation: 'In Python 3, the / operator always performs true division and returns a float, even if both operands are integers.',
  },
  {
    id: 'py-2',
    category: 'python',
    difficulty: 'medium',
    question: 'What happens when mutating a default argument in Python?',
    codeSnippet: 'def add_item(item, lst=[]):\n    lst.append(item)\n    return lst\n\nprint(add_item(1))\nprint(add_item(2))',
    options: ['[1] then [2]', '[1] then [1, 2]', '[1, 2] then [1, 2]', 'TypeError: mutable default'],
    correctOption: 1,
    explanation: 'Default argument values in Python are evaluated once when the function definition is executed, so the same list object is retained across calls.',
  },
  {
    id: 'py-3',
    category: 'python',
    difficulty: 'medium',
    question: 'What is the purpose of the Global Interpreter Lock (GIL) in CPython?',
    options: [
      'To prevent deadlocks by serializing memory allocation',
      'To ensure thread-safe memory management in CPython without fine-grained locks',
      'To accelerate async I/O coroutines',
      'To compile Python bytecode directly to machine instructions',
    ],
    correctOption: 1,
    explanation: 'The GIL is a mutex in CPython that protects access to Python objects, preventing multiple threads from executing Python bytecodes simultaneously to simplify memory management.',
  },
  {
    id: 'py-4',
    category: 'python',
    difficulty: 'hard',
    question: 'What does the @property decorator do under the hood in Python?',
    options: [
      'Instantiates a metaclass with getter/setter hooks',
      'Creates a descriptor object implementing __get__, __set__, and __delete__ methods',
      'Overrides __getattr__ in the module namespace',
      'Wraps the function in a functools.partial closure',
    ],
    correctOption: 1,
    explanation: 'The property builtin creates a descriptor object implementing the descriptor protocol (__get__, __set__, __delete__), allowing method calls to act like attribute access.',
  },

  // ── 2. Java ───────────────────────────────────────────────────────────────
  {
    id: 'java-1',
    category: 'java',
    difficulty: 'easy',
    question: 'Which of the following is true regarding String objects in Java?',
    options: [
      'Strings are mutable by default',
      'Strings are stored exclusively on the thread stack',
      'Strings are immutable and stored in the String Constant Pool',
      'Strings can be subclassed to add custom methods',
    ],
    correctOption: 2,
    explanation: 'In Java, Strings are immutable and string literals are cached in the String Constant Pool inside heap memory to save space.',
  },
  {
    id: 'java-2',
    category: 'java',
    difficulty: 'medium',
    question: 'What is the difference between ArrayList and LinkedList in Java when accessing an element by index?',
    options: [
      'ArrayList is O(1) whereas LinkedList is O(n)',
      'LinkedList is O(1) whereas ArrayList is O(n)',
      'Both have O(1) random access',
      'ArrayList is O(log n) due to binary tree backing',
    ],
    correctOption: 0,
    explanation: 'ArrayList is backed by an array allowing O(1) random index access, whereas LinkedList must traverse node pointers taking O(n) worst-case.',
  },
  {
    id: 'java-3',
    category: 'java',
    difficulty: 'hard',
    question: 'In Java concurrency, what guarantee does the volatile keyword provide?',
    options: [
      'Mutual exclusion and atomicity for compound operations',
      'Visibility guarantee across CPU caches and instruction reordering prevention (happens-before)',
      'Thread serialization on object monitors',
      'Automatic garbage collection prevention for marked references',
    ],
    correctOption: 1,
    explanation: 'The volatile keyword in Java guarantees memory visibility (reads and writes go directly to main memory) and establishes a happens-before relationship preventing compiler/hardware reordering.',
  },

  // ── 3. JavaScript ─────────────────────────────────────────────────────────
  {
    id: 'js-1',
    category: 'javascript',
    difficulty: 'easy',
    question: 'What is the result of typeof NaN in JavaScript?',
    options: ["'undefined'", "'nan'", "'number'", "'object'"],
    correctOption: 2,
    explanation: 'In JavaScript (IEEE 754 floating point standard), NaN represents Not-a-Number, but its programmatic data type is technically "number".',
  },
  {
    id: 'js-2',
    category: 'javascript',
    difficulty: 'medium',
    question: 'What is logged to the console in this asynchronous JavaScript snippet?',
    codeSnippet: "console.log('1');\nsetTimeout(() => console.log('2'), 0);\nPromise.resolve().then(() => console.log('3'));\nconsole.log('4');",
    options: ['1, 2, 3, 4', '1, 4, 3, 2', '1, 4, 2, 3', '1, 3, 4, 2'],
    correctOption: 1,
    explanation: 'Synchronous code runs first (1, 4). Microtasks (Promise.then) run immediately after synchronous execution (3), before macrotasks (setTimeout) execute (2).',
  },
  {
    id: 'js-3',
    category: 'javascript',
    difficulty: 'medium',
    question: 'What will be output by this closure example?',
    codeSnippet: 'for (var i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i), 10);\n}',
    options: ['0, 1, 2', '3, 3, 3', 'undefined, undefined, undefined', '2, 1, 0'],
    correctOption: 1,
    explanation: 'Because var is function-scoped rather than block-scoped, by the time the setTimeout callbacks fire after 10ms, the loop has already completed with i = 3.',
  },
  {
    id: 'js-4',
    category: 'javascript',
    difficulty: 'hard',
    question: 'Which of the following creates a truly null-prototype object without Object.prototype inheritance?',
    options: [
      'const obj = {}',
      'const obj = Object.create(null)',
      'const obj = Object.freeze({})',
      'const obj = new Object()',
    ],
    correctOption: 1,
    explanation: 'Object.create(null) creates a clean dictionary object that does not inherit properties like toString, hasOwnProperty, or constructor from Object.prototype.',
  },

  // ── 4. SQL ────────────────────────────────────────────────────────────────
  {
    id: 'sql-1',
    category: 'sql',
    difficulty: 'easy',
    question: 'What is the key difference between WHERE and HAVING clauses in SQL?',
    options: [
      'WHERE filters rows before aggregation; HAVING filters groups after aggregation',
      'HAVING filters rows before aggregation; WHERE filters after aggregation',
      'WHERE can only be used with primary keys',
      'HAVING cannot be used together with GROUP BY',
    ],
    correctOption: 0,
    explanation: 'WHERE filters rows before any aggregate functions are computed. HAVING filters the grouped results after GROUP BY evaluation.',
  },
  {
    id: 'sql-2',
    category: 'sql',
    difficulty: 'medium',
    question: 'What does an INDEX typically improve and what does it degrade in a database table?',
    options: [
      'Improves write speed; degrades read speed',
      'Improves SELECT queries; degrades INSERT/UPDATE/DELETE performance',
      'Improves storage compression; degrades network bandwidth',
      'Eliminates duplicate rows automatically',
    ],
    correctOption: 1,
    explanation: 'B-Tree indexes speed up row lookups and range queries (SELECT), but add overhead to write operations (INSERT, UPDATE, DELETE) because the index tree must be updated.',
  },
  {
    id: 'sql-3',
    category: 'sql',
    difficulty: 'hard',
    question: 'In ACID transaction properties, which property prevents "Phantom Reads"?',
    options: [
      'Read Committed isolation level',
      'Read Uncommitted isolation level',
      'Serializable isolation level',
      'Atomicity rollback segment',
    ],
    correctOption: 2,
    explanation: 'Serializable isolation is the highest isolation level that prevents dirty reads, non-repeatable reads, and phantom reads through range locks or serial execution.',
  },

  // ── 5. Debugging ──────────────────────────────────────────────────────────
  {
    id: 'dbg-1',
    category: 'debugging',
    difficulty: 'easy',
    question: 'Why does this function return undefined instead of an object?',
    codeSnippet: 'function getUser() {\n  return\n  {\n    name: "Alex"\n  };\n}',
    options: [
      'Objects cannot be returned directly from functions',
      'Automatic Semicolon Insertion (ASI) inserts a semicolon immediately after "return"',
      'The object keys must be enclosed in single quotes',
      'Missing semicolon on line 4',
    ],
    correctOption: 1,
    explanation: 'JavaScript\'s Automatic Semicolon Insertion (ASI) places a semicolon after the return statement if a newline follows it, causing the function to return undefined.',
  },
  {
    id: 'dbg-2',
    category: 'debugging',
    difficulty: 'medium',
    question: 'Spot the bug in this binary search implementation:',
    codeSnippet: 'int mid = (low + high) / 2;\nif (arr[mid] == target) return mid;',
    options: [
      'The division operator must be floating point',
      '(low + high) can overflow integer limits when both are large; use low + (high - low) / 2',
      'Binary search requires high - low without adding low',
      'arr[mid] cannot be accessed inside an integer block',
    ],
    correctOption: 1,
    explanation: 'If low + high exceeds 2^31 - 1, integer overflow occurs, resulting in a negative number and ArrayIndexOutOfBoundsException. Using low + (high - low) / 2 prevents overflow.',
  },
  {
    id: 'dbg-3',
    category: 'debugging',
    difficulty: 'hard',
    question: 'Why does this Python snippet raise an UnboundLocalError?',
    codeSnippet: 'x = 10\ndef calculate():\n    print(x)\n    x += 1\ncalculate()',
    options: [
      'Python does not allow functions to read global variables',
      'Because x is assigned within calculate(), Python treats x as a local variable throughout the entire function scope',
      'The += operator is invalid on integers',
      'calculate() must take x as an explicit parameter',
    ],
    correctOption: 1,
    explanation: 'When Python parses a function, any variable assigned to (e.g. x += 1) is classified as local to the entire function scope, causing the earlier print(x) to fail with UnboundLocalError.',
  },

  // ── 6. Aptitude ───────────────────────────────────────────────────────────
  {
    id: 'apt-1',
    category: 'aptitude',
    difficulty: 'easy',
    question: 'A train travels at 72 km/h. How many meters does it travel in 10 seconds?',
    options: ['150 meters', '200 meters', '240 meters', '300 meters'],
    correctOption: 1,
    explanation: '72 km/h = 72 * (5/18) m/s = 20 m/s. In 10 seconds, distance = 20 m/s * 10 s = 200 meters.',
  },
  {
    id: 'apt-2',
    category: 'aptitude',
    difficulty: 'medium',
    question: 'A can finish a job in 12 days and B can finish it in 24 days. Working together, how many days will they take?',
    options: ['6 days', '8 days', '10 days', '18 days'],
    correctOption: 1,
    explanation: 'Rate = 1/12 + 1/24 = 2/24 + 1/24 = 3/24 = 1/8 job/day. Therefore, together they take 8 days.',
  },
  {
    id: 'apt-3',
    category: 'aptitude',
    difficulty: 'hard',
    question: 'Two dice are rolled simultaneously. What is the probability that the sum of the numbers is greater than 9?',
    options: ['1/6', '1/9', '5/36', '7/36'],
    correctOption: 0,
    explanation: 'Total outcomes = 36. Outcomes with sum > 9: Sum 10 (4,6; 5,5; 6,4 = 3), Sum 11 (5,6; 6,5 = 2), Sum 12 (6,6 = 1). Total favorable = 3 + 2 + 1 = 6. Probability = 6/36 = 1/6.',
  },

  // ── 7. Logical Reasoning ──────────────────────────────────────────────────
  {
    id: 'log-1',
    category: 'logical-reasoning',
    difficulty: 'easy',
    question: 'Find the next number in the sequence: 2, 6, 12, 20, 30, ?',
    options: ['38', '40', '42', '44'],
    correctOption: 2,
    explanation: 'The differences between consecutive numbers are +4, +6, +8, +10, so the next difference is +12. 30 + 12 = 42 (also n*(n+1): 1*2, 2*3, 3*4, 4*5, 5*6, 6*7=42).',
  },
  {
    id: 'log-2',
    category: 'logical-reasoning',
    difficulty: 'medium',
    question: 'Statement: All laptops are devices. Some devices are phones. Conclusion: I. Some laptops are phones. II. All phones are devices.',
    options: [
      'Only conclusion I follows',
      'Only conclusion II follows',
      'Neither conclusion follows',
      'Both conclusions follow',
    ],
    correctOption: 2,
    explanation: 'Some devices are phones does NOT imply all phones are devices (some phones could theoretically be other things in strict formal logic), and laptops and phones do not necessarily overlap.',
  },
  {
    id: 'log-3',
    category: 'logical-reasoning',
    difficulty: 'hard',
    question: 'Pointing to a photograph, John said: "She is the daughter of the only son of my grandfather." How is John related to the girl?',
    options: ['Father', 'Brother', 'Uncle', 'Cousin'],
    correctOption: 1,
    explanation: '"The only son of my grandfather" is John\'s father. The daughter of John\'s father is John\'s sister. Therefore, John is her brother.',
  },

  // ── 8. Technical Trivia ───────────────────────────────────────────────────
  {
    id: 'triv-1',
    category: 'technical-trivia',
    difficulty: 'easy',
    question: 'What port does standard HTTPS traffic use by default?',
    options: ['80', '8080', '443', '8443'],
    correctOption: 2,
    explanation: 'Standard HTTP uses port 80, while TLS/SSL-encrypted HTTPS uses port 443.',
  },
  {
    id: 'triv-2',
    category: 'technical-trivia',
    difficulty: 'medium',
    question: 'Who created the Linux operating system kernel in 1991?',
    options: ['Richard Stallman', 'Linus Torvalds', 'Ken Thompson', 'Dennis Ritchie'],
    correctOption: 1,
    explanation: 'Linus Torvalds created the Linux kernel in 1991 while a student at the University of Helsinki.',
  },
  {
    id: 'triv-3',
    category: 'technical-trivia',
    difficulty: 'hard',
    question: 'What is the purpose of the SYN-ACK step in the TCP 3-way handshake?',
    options: [
      'To terminate an existing socket connection gracefully',
      'The server acknowledges the client\'s SYN packet and synchronizes its own sequence number',
      'To verify DNS resolution before IP packet transmission',
      'To negotiate TLS encryption keys',
    ],
    correctOption: 1,
    explanation: 'In the TCP 3-way handshake (SYN, SYN-ACK, ACK), SYN-ACK confirms receipt of client sequence number and introduces server starting sequence number.',
  },

  // ── 9. CS Fundamentals ────────────────────────────────────────────────────
  {
    id: 'cs-1',
    category: 'cs-fundamentals',
    difficulty: 'easy',
    question: 'What is the average time complexity of searching for an element in a Hash Table with good distribution?',
    options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
    correctOption: 0,
    explanation: 'With a uniform hash function and low load factor, average lookup in a hash table is O(1) constant time.',
  },
  {
    id: 'cs-2',
    category: 'cs-fundamentals',
    difficulty: 'medium',
    question: 'Which sorting algorithm is guaranteed to have O(n log n) time complexity in the worst case?',
    options: ['Quick Sort', 'Merge Sort', 'Bubble Sort', 'Insertion Sort'],
    correctOption: 1,
    explanation: 'Merge Sort always divides the array in half and merges sorted sub-arrays, guaranteeing O(n log n) worst-case, whereas Quick Sort degrades to O(n²) with bad pivots.',
  },
  {
    id: 'cs-3',
    category: 'cs-fundamentals',
    difficulty: 'hard',
    question: 'What is the difference between a Process and a Thread in operating systems?',
    options: [
      'Threads have separate virtual address spaces whereas processes share memory',
      'Processes have independent address spaces whereas threads of the same process share code, data, and open files',
      'Threads cannot be scheduled by the OS kernel',
      'Processes cannot execute concurrent code',
    ],
    correctOption: 1,
    explanation: 'A process is an isolated execution environment with its own virtual memory space, whereas threads within a process share the heap, data, and code segments.',
  },

  // ── 10. Brain Puzzles ─────────────────────────────────────────────────────
  {
    id: 'puz-1',
    category: 'brain-puzzles',
    difficulty: 'easy',
    question: 'A farmer needs to cross a river with a wolf, a goat, and a cabbage. If left alone, wolf eats goat, goat eats cabbage. Who crosses first?',
    options: ['The Wolf', 'The Goat', 'The Cabbage', 'Farmer goes alone'],
    correctOption: 1,
    explanation: 'The farmer must take the goat first, leaving the wolf with the cabbage (wolf does not eat cabbage).',
  },
  {
    id: 'puz-2',
    category: 'brain-puzzles',
    difficulty: 'medium',
    question: 'In the Monty Hall Problem (3 doors, 1 car, 2 goats), after you pick a door and the host reveals a goat behind another door, should you switch?',
    options: [
      'No, odds are 50/50 so switching does not matter',
      'Yes, switching increases your probability of winning to 2/3',
      'No, your initial door choice retains a 2/3 probability',
      'Yes, switching gives you a 100% guarantee of winning',
    ],
    correctOption: 1,
    explanation: 'Your original door had a 1/3 chance of winning. The remaining unopened door carries the combined 2/3 probability of the other two doors, so switching doubles your chances.',
  },
  {
    id: 'puz-3',
    category: 'brain-puzzles',
    difficulty: 'hard',
    question: 'You have 8 identical-looking coins and a balance scale. Exactly 1 coin is heavier than the other 7. What is the minimum weighings needed to guarantee finding the heavy coin?',
    options: ['1 weighing', '2 weighings', '3 weighings', '4 weighings'],
    correctOption: 1,
    explanation: 'Weigh 3 coins against 3 coins. If they balance, weigh the remaining 2 coins (2nd weighing). If one group is heavier, weigh 1 against 1 of that group (2nd weighing). Exactly 2 weighings guaranteed.',
  },
];

/**
 * Samples randomized questions for a duel match.
 */
export function sampleDuelQuestions(
  category: DuelCategory,
  difficulty: DuelDifficulty,
  count: number = 10
): DuelQuestion[] {
  let pool = QUESTION_BANK.filter(q => {
    const matchesCat = category ? q.category === category : true;
    const matchesDiff = difficulty === 'mixed' ? true : q.difficulty === difficulty;
    return matchesCat && matchesDiff;
  });

  // If filtered pool is smaller than requested count, fallback to all questions in category
  if (pool.length < count && category) {
    const catPool = QUESTION_BANK.filter(q => q.category === category);
    if (catPool.length > 0) {
      pool = catPool;
    }
  }

  // If pool is still empty, fallback to entire question bank
  if (pool.length === 0) {
    pool = [...QUESTION_BANK];
  }

  // Fisher-Yates shuffle
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i]!;
    shuffled[i] = shuffled[j]!;
    shuffled[j] = temp;
  }

  const result: DuelQuestion[] = [];
  while (result.length < count && shuffled.length > 0) {
    for (const item of shuffled) {
      if (result.length >= count) break;
      result.push(item);
    }
  }

  return result;
}

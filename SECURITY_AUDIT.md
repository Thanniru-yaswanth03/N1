# N1 Drop System: Security and Abuse Hardening Audit

**Platform:** N1 Privacy-First Ephemeral Sharing  
**Phase:** 10 — Security & Abuse Hardening  
**Audit Scope:** Complete Drop System Architecture, Backend APIs, Storage, and Frontends  
**Compliance Standard:** Defense-in-depth, zero-trust input handling, strict resource attribution, ₹0 external infrastructure budget.

---

## Executive Summary

A comprehensive security audit and hardening process was conducted across the N1 Drop system. The audit focused on 25 critical vulnerability classes covering path traversal, unauthorized access, race conditions, NoSQL injection, resource exhaustion, rate limiting, and sensitive data leakage.

Every vector was systematically audited, remediated at the database and application levels, and verified via automated regression tests in [`apps/api/tests/security-hardening.test.ts`](file:///c:/Users/batma/Desktop/VibeCode/PROJECT_N1/apps/api/tests/security-hardening.test.ts) and [`apps/api/tests/security.test.ts`](file:///c:/Users/batma/Desktop/VibeCode/PROJECT_N1/apps/api/tests/security.test.ts).

All **166 unit, integration, and security tests** across the monorepo pass cleanly.

---

## Detailed Findings & Hardening Matrix

### 1. Path Traversal
* **Finding:** Client-supplied filenames and storage keys could allow relative directory traversal sequences (`../`, `..\`, `%2e%2e`, `%00` null byte injection) to target host files outside the designated uploads root.
* **Risk:** Arbitrary file read, server source code disclosure, or sensitive configuration exposure.
* **Fix:** 
  1. Implemented `sanitizeFilename` with URI decoding before stripping control characters (`0x00-0x1F`, `0x7F`), directory separators, and path traversal patterns (`..\+[/\]?`).
  2. Implemented `validatePathSafety(baseDir, relativePath)` which enforces strict path resolution and verifies that the resolved path starts with the authorized base directory + path separator, explicitly rejecting embedded null bytes (`\0`).
* **Test Proving the Fix:** `tests/security-hardening.test.ts` > *"Vector 1: Path Traversal Protection"*
  - Verifies rejection of `../../etc/passwd`, `..\..\windows\system32\cmd.exe`, and null-byte `%00` traversal attempts.

---

### 2. Unauthorized Download
* **Finding:** Files associated with password-protected drops could potentially be accessed by guessing or enumerating Mongo `fileId` values if authentication was not verified on individual file routes. Additionally, an attacker could attempt to download a file belonging to Drop A using Drop B's code.
* **Risk:** Data leakage of protected documents and violation of drop compartmentalization.
* **Fix:**
  1. `dropService.getFileForDownload` verifies that the drop is unlocked via valid session token or password header before streaming.
  2. The service enforces strict relationship integrity: `if (!fileDoc.dropId.equals(drop._id))` it immediately throws `404 FILE_NOT_FOUND`.
  3. Drops past expiration or view limits reject download requests with `410 DROP_EXPIRED`.
* **Test Proving the Fix:** `tests/security-hardening.test.ts` > *"Vector 2: Unauthorized Download Prevention"*
  - Verifies HTTP 401 on unauthenticated downloads and HTTP 404 when attempting cross-drop fileId swapping.

---

### 3. Unauthorized Deletion
* **Finding:** Public DELETE routes without strong ownership verification allow unauthorized third parties to delete active drops prematurely.
* **Risk:** Denial-of-service and malicious deletion of shared content.
* **Fix:** Requiring an owner deletion token provided via `x-deletion-token` header, JSON body, or query param. Verifies against the stored SHA-256 hash using `crypto.timingSafeEqual`.
* **Test Proving the Fix:** `tests/security-hardening.test.ts` > *"Vector 3 & 4: Unauthorized Deletion and Token Hardening"*
  - Verifies HTTP 401 when the deletion token is missing or incorrect, and HTTP 200 with permanent purging only when the authentic token is supplied.

---

### 4. Invalid Owner Token
* **Finding:** Deletion token comparison using standard string equality (`===`) is vulnerable to timing attacks that leak token characters one by one. Passing non-string objects could bypass verification or trigger unhandled errors.
* **Risk:** Owner token brute-forcing and unauthorized drop deletion.
* **Fix:**
  1. Tokens are hashed with SHA-256 (`hashToken`) before persistence. Raw tokens are never stored.
  2. Token verification utilizes constant-time comparison (`crypto.timingSafeEqual`) on fixed-length 32-byte buffers.
  3. Strict `typeof === 'string'` checks reject objects or arrays with HTTP 400 `INVALID_REQUEST`.
* **Test Proving the Fix:** `tests/security-hardening.test.ts` > *"Vector 3 & 4: Unauthorized Deletion and Token Hardening"* & `tests/security.test.ts` > *"2. Owner Deletion Token & Constant-Time Hashing"*.

---

### 5. Password Brute Force
* **Finding:** Password unlock endpoints could be subjected to high-speed dictionary attacks. IPv6 addresses could rotate interfaces to bypass naive IP rate limiting.
* **Risk:** Compromise of password-protected confidential drops.
* **Fix:**
  1. Applied `unlockRateLimiter` allowing a maximum of 5 failed attempts per 5-minute window.
  2. Partitioned rate-limit keys by `${ipKeyGenerator(ip)}:${dropCode}` to restrict attacks per individual drop while integrating `ipKeyGenerator` to aggregate IPv6 subnets (/56).
  3. Exceeding attempts returns HTTP 429 `UNLOCK_RATE_LIMITED`.
* **Test Proving the Fix:** `tests/security-hardening.test.ts` > *"Vector 5 & 6: Password Brute Force Defense & Rate Limiting"*
  - Simulates 5 failed unlock attempts; proves the 6th attempt is blocked with HTTP 429.

---

### 6. Rate Limiting
* **Finding:** API endpoints without rate limiting are susceptible to denial of service, database connection exhaustion, and short code enumeration.
* **Risk:** Resource exhaustion, degradation of service for legitimate users.
* **Fix:**
  1. Configured tiered Express rate limiters:
     - Global limiter: 120 req/min per IP.
     - Code lookup limiter: 30 req/min per IP (mitigates code enumeration).
     - Upload limiter: 15 uploads per 15 min per IP.
     - Unlock limiter: 5 attempts per 5 min per IP+code.
  2. Integrated `ipKeyGenerator` to normalize and subnet IPv6 addresses.
* **Test Proving the Fix:** `tests/security-hardening.test.ts` > *"Vector 5 & 6"* & rate limiter unit configurations.

---

### 7. Oversized Requests
* **Finding:** Sending unbounded request bodies or multipart payloads could exhaust node heap memory or fill disk storage.
* **Risk:** Denial-of-service via memory exhaustion or disk filling.
* **Fix:**
  1. Express JSON body parser strictly limited to 1MB (`express.json({ limit: '1mb' })`).
  2. Multer limits configure `fileSize: 50MB`, `files: 10`, `parts: 40`, `fieldSize: 100KB`, and `fields: 20`.
  3. Aggregate drop size is validated before and after storage, strictly enforcing a 200MB ceiling.
* **Test Proving the Fix:** `tests/security-hardening.test.ts` > *"Vector 7 & 8: Oversized Requests & Multipart Abuse"*
  - Verifies HTTP 413 Payload Too Large when submitting >1MB JSON payloads.

---

### 8. Multipart Abuse
* **Finding:** Malicious clients could send endless multipart form fields without files, empty 0-byte files, or abort connections mid-upload leaving stranded temporary files.
* **Risk:** Inode exhaustion, temporary directory disk bloat, worker process lockup.
* **Fix:**
  1. Restricted Multer form field limits (`fields: 20`, `fieldSize: 100KB`).
  2. Added explicit validation rejecting 0-byte uploaded files with HTTP 400 `EMPTY_FILE`.
  3. Added `req.on('close')` abort listeners that unlink any partially staged files if the client disconnects before completion.
* **Test Proving the Fix:** `tests/security-hardening.test.ts` > *"Vector 7 & 8: Oversized Requests & Multipart Abuse"*
  - Confirms HTTP 400 `EMPTY_FILE` rejection and cleans up temporary uploads.

---

### 9. Invalid MIME Types
* **Finding:** Browsers and clients supply unverified `Content-Type` headers that can claim an executable or script is an image.
* **Risk:** Remote code execution or Cross-Site Scripting (XSS) if files are served with unsafe MIME types.
* **Fix:**
  1. Maintained a strict mapping between file extension and permitted MIME types in `mime-whitelist.ts`.
  2. Declared MIME types must strictly match the file extension (`isValidMimeForExtension`).
  3. Performed magic-byte header inspection on the uploaded binary to confirm real file type.
* **Test Proving the Fix:** `tests/security-hardening.test.ts` > *"Vector 9 & 10: MIME Validation & Extension Hardening"*
  - Verifies rejection of `.png` uploaded with `application/x-msdownload` with HTTP 400 `INVALID_MIME_TYPE`.

---

### 10. Fake File Extensions
* **Finding:** Attackers use double extensions (e.g. `report.pdf.exe` or `image.php.png`) or unsupported file extensions to bypass filters.
* **Risk:** Execution of server-side or client-side malicious binaries.
* **Fix:**
  1. Implemented `hasDangerousDoubleExtension` regex scanner checking for secondary executable extensions (`.php`, `.exe`, `.sh`, `.bat`, `.cmd`, `.vbs`, etc.).
  2. Whitelisted only safe productivity extensions (`.jpg`, `.jpeg`, `.png`, `.webp`, `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.ppt`, `.pptx`, `.txt`, `.zip`).
* **Test Proving the Fix:** `tests/security-hardening.test.ts` > *"Vector 9 & 10"*
  - Proves rejection of `malicious.php.png` with HTTP 400 `DANGEROUS_FILE_EXTENSION`.

---

### 11. Malicious Filenames
* **Finding:** Filenames containing Windows reserved device names (`CON`, `PRN`, `AUX`, `NUL`, `COM1-9`, `LPT1-9`) or illegal characters can cause system-level file system crashes on Windows servers.
* **Risk:** Server crash, denial-of-service, or unexpected file overwrite.
* **Fix:**
  1. `sanitizeFilename` checks base names against `WINDOWS_RESERVED_NAMES` and automatically prefixes reserved names (`safe_CON.txt`).
  2. Strips illegal characters (`< > : " / \ | ? *`), control characters, and leading/trailing dots and spaces.
* **Test Proving the Fix:** `tests/security-hardening.test.ts` > *"Vector 11: Malicious Filenames & Reserved Device Names"*
  - Validates `CON.txt` -> `safe_CON.txt` and strips control characters.

---

### 12. Expired Drop Access
* **Finding:** Expired drops could leak data if expiration checks only run periodically in background workers or are omitted on download routes.
* **Risk:** Access to sensitive data past the authorized retention window.
* **Fix:**
  1. Every route (`GET /:code`, `POST /:code/unlock`, `GET /:code/download/:fileId`, `GET /:code/download-zip`) verifies expiration before retrieving or streaming content.
  2. Checks both boolean `isExpired` and `expiresAt <= new Date()`.
  3. Atomically marks expired drops and returns HTTP 410 `DROP_EXPIRED`.
* **Test Proving the Fix:** `tests/security-hardening.test.ts` > *"Vector 12: Expired Drop Access Rejection"*
  - Proves that metadata, unlock, download, and zip endpoints all return HTTP 410 once expiration time passes.

---

### 13. View-Limit Bypass (Time-of-Check to Time-of-Use Race Condition)
* **Finding:** In concurrent environments, two simultaneous requests could read `viewCount = 0` (where `viewLimit = 1`), and both proceed to return content before either incremented the counter.
* **Risk:** Leaking confidential drops to multiple unauthorized viewers beyond the configured limit.
* **Fix:**
  1. Replaced non-atomic read-then-write logic with MongoDB's atomic `findOneAndUpdate`:
     ```ts
     { _id: id, status: 'active', isExpired: false, expiresAt: { $gt: now }, viewCount: { $lt: viewLimit } }
     ```
  2. Atomic increment `{ $inc: { viewCount: 1 } }`. If the condition fails, Mongo matches 0 documents and returns `null`, denying all subsequent concurrent requests.
* **Test Proving the Fix:** `tests/security-hardening.test.ts` > *"Vector 13 & 23: View-Limit Bypass & Race Condition Hardening"*
  - Fires 10 concurrent requests to a drop with `viewLimit: 1`. Proves exactly 1 receives HTTP 200 and 9 receive HTTP 410.

---

### 14. Burn-After-Reading Bypass
* **Finding:** Concurrent HTTP requests to a burn-after-reading drop could both read the text or stream the file if content deletion happened asynchronously after response completion.
* **Risk:** Multiple parties accessing a single-use drop before self-destruction.
* **Fix:**
  1. Atomically transitions status to `burned` and `isExpired: true` *before* returning content using `atomicBurnTextDrop` and `atomicBurnFileDrop`.
  2. Text drops return pre-update document atomically (`{ returnDocument: 'before' }`) and clear `textContent: null`.
  3. Only the single request that successfully executes the atomic state transition receives the content; all other concurrent requests receive HTTP 410 `DROP_BURNED`.
* **Test Proving the Fix:** `tests/security-hardening.test.ts` > *"Vector 14: Burn-After-Reading Bypass & Concurrency Defense"*
  - Concurrently fires 8 requests for burned text and 6 for burned files; verifies exactly 1 succeeds and all others receive HTTP 410.

---

### 15. ZIP Abuse & Zip Slip
* **Finding:** Dynamic ZIP archive generators that accept stored filenames without path sanitization can construct archives with relative path traversals (`../../cron.d/job`), causing Zip Slip when extracted by recipients. Furthermore, abandoned client streams could leak file descriptors.
* **Risk:** Remote code execution on recipient extraction, server memory leaks.
* **Fix:**
  1. Every file entry name passed to the ZIP stream is processed through `sanitizeFilename`, ensuring flat, traversal-free entry names.
  2. Added `req.on('close')` listeners on the ZIP route to invoke `archive.destroy()`, terminating archive compression immediately if a client aborts.
  3. Added `Content-Security-Policy: default-src 'none'; sandbox` to ZIP response headers.
* **Test Proving the Fix:** `tests/security-hardening.test.ts` > *"Vector 15: ZIP Abuse & Zip Slip Prevention"*
  - Validates entry name sanitization, security headers, and safe streaming.

---

### 16. Duplicate Code Generation
* **Finding:** Random code generation could collide. If an unhandled MongoDB duplicate key collision (E11000) occurred, the server would return a 500 error or fail drop creation.
* **Risk:** Intermittent upload failures and degraded availability.
* **Fix:**
  1. Drop code generator uses `crypto.randomInt` from an unambiguous 32-character alphabet (excluding `0, O, 1, I`), providing $32^6 \approx 1.07 \times 10^9$ combinations.
  2. Implemented collision check loop during code generation.
  3. Added retry loop on database insertion catching MongoDB E11000 duplicate key errors to transparently generate a fresh code and re-attempt persistence without failing user requests.
* **Test Proving the Fix:** `tests/security-hardening.test.ts` > *"Vector 16: Cryptographic Drop Code Security"* & `tests/security.test.ts` > *"1. Drop Code Generator"*.

---

### 17. NoSQL Injection
* **Finding:** Express JSON parser parses nested objects (`{"$gt": ""}`, `{"$ne": null}`). If passed directly into MongoDB query objects, attackers could bypass password checks or extract unauthorized records.
* **Risk:** Authentication bypass and unauthorized data access.
* **Fix:**
  1. Implemented global `noSqlSanitizer` middleware that recursively strips keys starting with `$` or containing `.`.
  2. Enforced strict primitive type checks (`typeof code === 'string'`, `typeof deletionToken === 'string'`) in route handlers and service layers.
* **Test Proving the Fix:** `tests/security-hardening.test.ts` > *"Vector 17: NoSQL Operator Injection Defense"*
  - Submits payloads with `$where` and `$ne` operators; verifies keys are stripped and non-string token objects are rejected with HTTP 400.

---

### 18. XSS Through Text Content
* **Finding:** Stored text drops containing `<script>` or HTML tags could execute in the recipient's browser if rendered improperly via `innerHTML` or if served with HTML content types.
* **Risk:** Session hijacking, credential theft, and Cross-Site Scripting.
* **Fix:**
  1. API serves text drops inside JSON envelopes (`Content-Type: application/json; charset=utf-8`) with `X-Content-Type-Options: nosniff`.
  2. Frontend React components render text content strictly as standard text nodes `{drop.textContent}`, completely avoiding `dangerouslySetInnerHTML`.
  3. Code preview components render text inside escaped `<pre><code>` blocks.
* **Test Proving the Fix:** `tests/security-hardening.test.ts` > *"Vector 18: Stored XSS Neutralization"*
  - Verifies text drops containing script and onerror tags are safely retrieved with `nosniff` headers and zero HTML execution.

---

### 19. Header Security
* **Finding:** Missing HTTP security headers allow clickjacking, MIME confusion, and unauthorized framing.
* **Risk:** Clickjacking, MIME sniffing attacks, data leakage.
* **Fix:**
  1. Hardened Helmet configuration in API:
     - `Content-Security-Policy`: Restricts scripts, objects, frames.
     - `X-Frame-Options: DENY`: Prevents framing and clickjacking.
     - `X-Content-Type-Options: nosniff`: Prevents MIME confusion.
     - `Referrer-Policy: strict-origin-when-cross-origin`.
     - `X-Powered-By`: Removed.
  2. File download endpoints attach `Content-Security-Policy: default-src 'none'; sandbox`.
* **Test Proving the Fix:** `tests/security-hardening.test.ts` > *"Vector 19: HTTP Security Headers"*.

---

### 20. CORS
* **Finding:** Overly permissive CORS policies (`Access-Control-Allow-Origin: *`) allow malicious third-party websites to make credentialed requests and read private drop data. Unhandled origin rejection could crash Node with 500 errors.
* **Risk:** Cross-origin data exfiltration.
* **Fix:**
  1. Configured CORS whitelist matching only authorized frontends (`CLIENT_URL`, `http://localhost:3000`, `http://127.0.0.1:3000`).
  2. Updated origin handler to return `callback(null, false)` for unauthorized origins rather than throwing exceptions, preventing HTTP 500 crashes while cleanly omitting CORS headers.
* **Test Proving the Fix:** `tests/security-hardening.test.ts` > *"Vector 20: CORS Isolation"*
  - Proves foreign origins do not receive `Access-Control-Allow-Origin` and legitimate origins are permitted.

---

### 21. Error Leakage
* **Finding:** Uncaught exceptions or database errors could return internal stack traces, database schema names, and server directory paths (`C:\Users\...` or `/home/...`).
* **Risk:** Internal architecture reconnaissance and path disclosure for attackers.
* **Fix:**
  1. Implemented centralized `secureErrorHandler` middleware.
  2. In production (`NODE_ENV === 'production'`), 500 errors return generic messages (`"An internal server error occurred."`) without stack traces.
  3. Implemented `sanitizeErrorMessage` regex scrubber that redacts both Windows and Unix absolute system file paths to `[redacted_path]`.
* **Test Proving the Fix:** `tests/security-hardening.test.ts` > *"Vector 21: Error Information Leakage Prevention"*
  - Verifies Windows and Unix file paths are scrubbed from error messages.

---

### 22. Sensitive Logging
* **Finding:** Logging connection strings or request objects could leak database credentials (`mongodb://user:pass@host`), drop passwords, or owner deletion tokens into server logs.
* **Risk:** Credential compromise via log aggregation systems or monitoring tools.
* **Fix:**
  1. Database connection URI logs are filtered through credential masking regex (`replace(/\/\/[^:]+:[^@]+@/, '//****:****@')`).
  2. Drop passwords and deletion tokens are hashed immediately; raw secrets are never passed to loggers.
  3. Expiration service logs only aggregate summary metrics (counts of deleted files, active drops), avoiding filesystem paths and hashes.
* **Test Proving the Fix:** `tests/security-hardening.test.ts` > *"Vector 22: Sensitive Information Masking"*
  - Verifies URI credential masking and raw token exclusion.

---

### 23. Race Conditions Around View Counts
* **Finding:** Rapid parallel requests could increment view counts concurrently without serialization, allowing views to exceed the configured maximum.
* **Risk:** View limit bypass and retention policy failure.
* **Fix:**
  1. Utilized MongoDB's `$inc` operator within a conditional atomic query filter that guarantees `viewCount < viewLimit`.
  2. Atomic state transition immediately sets `status: 'expired'` upon reaching the limit.
* **Test Proving the Fix:** `tests/security-hardening.test.ts` > *"Vector 13 & 23: View-Limit Bypass & Race Condition Hardening"*.

---

### 24. Race Conditions Around Expiration
* **Finding:** A drop accessed at the exact millisecond of expiration could succeed if the check was executed before an uncoordinated background worker marked the record.
* **Risk:** Expired content access during transition window.
* **Fix:**
  1. Every query and atomic operation includes `{ expiresAt: { $gt: new Date() } }` in the MongoDB criteria.
  2. If the drop has passed its expiration timestamp, the atomic find-and-update returns `null`, immediately triggering HTTP 410 `DROP_EXPIRED`.
* **Test Proving the Fix:** `tests/security-hardening.test.ts` > *"Vector 24: Expiration Race Condition Prevention"*
  - Forces drop timestamp to 1ms in the past; verifies atomic denial of access.

---

### 25. Partial Upload Failures
* **Finding:** If an upload contains 5 files and the 4th file fails validation or storage, previously written files could remain orphaned on disk.
* **Risk:** Gradual disk space exhaustion and orphaned unlinked files.
* **Fix:**
  1. Implemented transactional rollback compensation in `dropService.createDrop`.
  2. If file validation, storage, or MongoDB persistence fails, `storageService.cleanupFiles(storedAbsolutePaths)` immediately unlinks all stored files.
  3. `finally` block unlinks all incoming Multer temporary files regardless of success or failure.
  4. Client disconnect events (`req.on('close')`) trigger immediate cleanup of temporary files.
* **Test Proving the Fix:** `tests/security-hardening.test.ts` > *"Vector 25: Partial Upload Failures Cleanup"*
  - Simulates upload failure mid-batch; asserts that no orphan files linger on disk.

---

## Verification & Test Results

```bash
pnpm test
```

### Monorepo Test Summary
- **Scope:** All workspace projects (`packages/*`, `apps/*`)
- **Total Test Files:** 8 passed (8)
- **Total Tests:** 166 passed (166)
- **Security Hardening Tests:** 33 passed (33)
- **Regressions:** 0
- **TypeScript Typecheck:** 0 errors
- **ESLint:** 0 errors
- **Production Build:** Next.js & API compiled successfully

---

## Conclusion
The N1 Drop system is fully hardened against the 25 audited vulnerability classes. All fixes adhere strictly to zero-budget architectural constraints and defense-in-depth principles.

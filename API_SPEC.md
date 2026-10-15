# N1 — REST API Specification

> **Version:** 1.0.0  
> **Base URL:** `/api/v1`  
> **Protocol:** HTTPS  
> **Data Format:** JSON & Multipart Form Data  
> **Budget Constraint:** ₹0 (Native Node/Express endpoints)

---

## 1. Global Conventions & Standards

### 1.1 Response Envelope Format

All API responses adhere strictly to a standardized envelope format:

#### Standard Success Envelope

```json
{
  "success": true,
  "data": {/* Payload object or array */},
  "timestamp": "2026-09-28T07:15:30.123Z"
}
```

#### Standard Error Envelope

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "File exceeds the 50 MB limit.",
    "details": [
      {
        "field": "files[0]",
        "issue": "File 'dataset.zip' is 62.4 MB (maximum allowed is 50 MB)."
      }
    ]
  },
  "timestamp": "2026-09-28T07:15:30.123Z"
}
```

### 1.2 Standard HTTP Status Codes

| Status Code                 | Meaning       | Usage in N1                                        |
| :-------------------------- | :------------ | :------------------------------------------------- |
| **`200 OK`**                | Success       | Successful metadata retrieval, unlock, or deletion |
| **`201 Created`**           | Created       | Successful Drop generation                         |
| **`400 Bad Request`**       | Client Error  | Schema validation failure, unsupported file type   |
| **`401 Unauthorized`**      | Auth Required | Password required or invalid unlock attempt        |
| **`403 Forbidden`**         | Forbidden     | Invalid owner deletion token provided              |
| **`404 Not Found`**         | Not Found     | Drop code does not exist                           |
| **`410 Gone`**              | Expired       | Drop has passed its expiration time or burned      |
| **`413 Payload Too Large`** | Too Large     | File > 50 MB or total drop > 200 MB                |
| **`429 Too Many Requests`** | Throttled     | Rate limit threshold exceeded                      |
| **`500 Internal Error`**    | Server Error  | Storage error or unhandled backend fault           |

---

## 2. Endpoints Specification

### 2.1 Create a Drop

`POST /api/v1/drops`

Creates a new anonymous text or file drop.

- **Content-Type:** `multipart/form-data`
- **Rate Limit:** 15 requests per 15 minutes per IP

#### Form Fields

| Field Name           | Type    | Required      | Description                                                      |
| :------------------- | :------ | :------------ | :--------------------------------------------------------------- |
| `drop_type`          | String  | Yes           | Either `"files"` or `"text"`.                                    |
| `expiry`             | String  | Yes           | Preset: `"15m"`, `"1h"`, `"6h"`, `"24h"`, or `"7d"`.             |
| `text_content`       | String  | If type=text  | Max 10,000 characters. Plain text only.                          |
| `files[]`            | Binary  | If type=files | 1 to 10 binary files ($\le 50$ MB each, $\le 200$ MB aggregate). |
| `password`           | String  | No            | Optional passphrase to lock the drop.                            |
| `burn_after_reading` | Boolean | No            | If `"true"`, destroys drop immediately after first view.         |
| `max_views`          | Number  | No            | Optional max viewing sessions before expiration ($1 - 100$).     |

#### Success Response: `201 Created`

```json
{
  "success": true,
  "data": {
    "code": "MGS538",
    "redirectUrl": "/drop/success/MGS538",
    "shareUrl": "https://n1.domain/d/MGS538",
    "deletionToken": "a3f58e1b9c2d7f4e8b0a1d6c3e9f2a5b7d4c8e1f0a2b5d7e9f1a3c6e8b0d2f4",
    "dropType": "files",
    "expiresAt": "2026-09-28T08:15:30.000Z",
    "fileCount": 2,
    "totalSizeBytes": 15482910,
    "burnAfterReading": false,
    "isPasswordProtected": false
  },
  "timestamp": "2026-09-28T07:15:30.123Z"
}
```

---

### 2.2 Retrieve Drop Metadata

`GET /api/v1/drops/:code`

Fetches metadata and content (if unlocked) for a drop.

- **URL Parameters:** `code` (6-character short code, case-insensitive)
- **Headers:** `Authorization: Bearer <unlock_token>` (optional, required if password-protected)

#### Scenario A: Unlocked Text Drop Response (`200 OK`)

```json
{
  "success": true,
  "data": {
    "code": "MGS538",
    "status": "ACTIVE",
    "dropType": "text",
    "textContent": "Database credentials:\nHOST=10.0.0.4\nPORT=5432",
    "createdAt": "2026-09-28T07:00:00.000Z",
    "expiresAt": "2026-09-28T08:00:00.000Z",
    "viewCount": 1,
    "maxViews": null,
    "burnAfterReading": false
  },
  "timestamp": "2026-09-28T07:05:00.000Z"
}
```

#### Scenario B: Unlocked Files Drop Response (`200 OK`)

```json
{
  "success": true,
  "data": {
    "code": "UFNUC9",
    "status": "ACTIVE",
    "dropType": "files",
    "totalSizeBytes": 18450124,
    "fileCount": 2,
    "files": [
      {
        "id": "66f7a8b1c2e3",
        "name": "project_report.pdf",
        "sizeBytes": 2450124,
        "extension": "pdf",
        "mimeType": "application/pdf",
        "downloadUrl": "/api/v1/drops/UFNUC9/download/66f7a8b1c2e3"
      },
      {
        "id": "66f7a8b1c2e4",
        "name": "assets.zip",
        "sizeBytes": 16000000,
        "extension": "zip",
        "mimeType": "application/zip",
        "downloadUrl": "/api/v1/drops/UFNUC9/download/66f7a8b1c2e4"
      }
    ],
    "downloadAllUrl": "/api/v1/drops/UFNUC9/download-all",
    "createdAt": "2026-09-28T07:00:00.000Z",
    "expiresAt": "2026-09-28T08:00:00.000Z"
  },
  "timestamp": "2026-09-28T07:05:00.000Z"
}
```

#### Scenario C: Password-Protected Drop (`200 OK` with Challenge)

```json
{
  "success": true,
  "data": {
    "code": "K7P4X9",
    "status": "PASSWORD_LOCKED",
    "dropType": "files",
    "requiresPassword": true,
    "expiresAt": "2026-09-28T08:00:00.000Z"
  },
  "timestamp": "2026-09-28T07:05:00.000Z"
}
```

#### Scenario D: Expired or Burned Drop (`410 Gone`)

```json
{
  "success": false,
  "error": {
    "code": "DROP_EXPIRED",
    "message": "This Drop has expired. The content was automatically deleted after the expiry time."
  },
  "timestamp": "2026-09-28T07:05:00.000Z"
}
```

---

### 2.3 Unlock Password-Protected Drop

`POST /api/v1/drops/:code/unlock`

Submits passphrase to unlock a locked drop.

- **Content-Type:** `application/json`
- **Rate Limit:** 5 attempts per 5 minutes per IP per drop

#### Request Body

```json
{
  "password": "user_provided_passphrase"
}
```

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOi...",
    "drop": {/* Full drop payload as in 2.2 */}
  },
  "timestamp": "2026-09-28T07:06:00.000Z"
}
```

#### Invalid Passphrase Response (`401 Unauthorized`)

```json
{
  "success": false,
  "error": {
    "code": "INVALID_PASSWORD",
    "message": "The passphrase you entered is incorrect. 4 attempts remaining."
  },
  "timestamp": "2026-09-28T07:06:00.000Z"
}
```

---

### 2.4 Download Single File

`GET /api/v1/drops/:code/download/:fileId`

Streams the specified file binary with controlled attachment headers.

- **URL Parameters:** `code` (Drop short code), `fileId` (File identifier)
- **Headers:** `Authorization: Bearer <unlock_token>` (if drop is password protected)
- **Response:** Binary Stream (`application/octet-stream` or canonical MIME)
- **Response Headers:**
  - `Content-Disposition: attachment; filename="project_report.pdf"`
  - `Content-Length: 2450124`
  - `X-Content-Type-Options: nosniff`

---

### 2.5 Download All Files as ZIP

`GET /api/v1/drops/:code/download-all`

Dynamically streams an on-the-fly compressed `.zip` archive containing every file in the drop.

- **URL Parameters:** `code` (Drop short code)
- **Response:** Binary ZIP Stream (`application/zip`)
- **Response Headers:**
  - `Content-Disposition: attachment; filename="UFNUC9_files.zip"`
  - `Transfer-Encoding: chunked`

---

### 2.6 Early Owner Deletion

`DELETE /api/v1/drops/:code`

Permanently destroys a drop and wipes its files immediately using the creator's cryptographic token.

- **Headers:** `X-Deletion-Token: <32_byte_hex_token>` (or JSON body `{ "deletionToken": "..." }`)

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "data": {
    "message": "Drop MGS538 was permanently destroyed and deleted from storage."
  },
  "timestamp": "2026-09-28T07:10:00.000Z"
}
```

#### Invalid Token Response (`403 Forbidden`)

```json
{
  "success": false,
  "error": {
    "code": "INVALID_DELETION_TOKEN",
    "message": "Invalid deletion token. You do not have permission to delete this drop."
  },
  "timestamp": "2026-09-28T07:10:00.000Z"
}
```

---

### 2.7 System Health & Storage Status

`GET /api/v1/health`

Internal diagnostics and liveness probe.

#### Response (`200 OK`)

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "database": "connected",
    "storage": {
      "driver": "local",
      "healthy": true
    },
    "uptimeSeconds": 14285
  },
  "timestamp": "2026-09-28T07:15:30.123Z"
}
```

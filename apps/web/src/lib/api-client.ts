import { HealthCheckData } from '@n1/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export class ApiError extends Error {
  code: string;
  details?: Array<{ field?: string; issue: string }>;

  constructor(
    message: string,
    code = 'API_ERROR',
    details?: Array<{ field?: string; issue: string }>
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}

export interface CreateDropApiResponse {
  success: boolean;
  code: string;
  redirectUrl: string;
  shareUrl: string;
  expiresAt: string;
  deletionToken: string;
  ownerDeletionToken: string;
  dropType?: string;
  fileCount?: number;
  totalSizeBytes?: number;
  burnAfterReading?: boolean;
  isPasswordProtected?: boolean;
  viewLimit?: number | null;
  data?: unknown;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const json = await response.json().catch(() => null);

  if (!response.ok || !json?.success) {
    const error = json?.error;
    throw new ApiError(
      error?.message || `HTTP ${response.status} - Request failed`,
      error?.code || `HTTP_${response.status}`,
      error?.details
    );
  }

  return (json.data ?? json) as T;
}

export const apiClient = {
  /**
   * Returns base URL for the API.
   */
  getApiBaseUrl(): string {
    return API_BASE_URL;
  },

  /**
   * Fetches backend health diagnostics.
   */
  async getHealth(): Promise<HealthCheckData> {
    return request<HealthCheckData>('/health');
  },

  /**
   * Submits a new file or text Drop to POST /api/drop with real-time upload progress tracking.
   */
  async createDrop(
    payload: FormData | Record<string, unknown>,
    onProgress?: (percent: number) => void
  ): Promise<CreateDropApiResponse> {
    const isFormData = typeof FormData !== 'undefined' && payload instanceof FormData;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}/api/drop`);

      if (onProgress && xhr.upload) {
        xhr.upload.onprogress = event => {
          if (event.lengthComputable && event.total > 0) {
            const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        let json: {
          success?: boolean;
          error?: {
            message?: string;
            code?: string;
            details?: Array<{ field?: string; issue: string }>;
          };
          [key: string]: unknown;
        } | null = null;

        try {
          json = JSON.parse(xhr.responseText);
        } catch {
          // ignore non-json response
        }

        if (xhr.status >= 200 && xhr.status < 300 && json?.['success']) {
          resolve(json as unknown as CreateDropApiResponse);
        } else {
          const errObj = json?.error;
          const msg = errObj?.message || `HTTP ${xhr.status} - Drop creation failed.`;
          const code = errObj?.code || `HTTP_${xhr.status}`;
          reject(new ApiError(msg, code, errObj?.details));
        }
      };

      xhr.onerror = () => {
        reject(
          new ApiError(
            'Network connection failed. Could not reach N1 API server.',
            'NETWORK_ERROR'
          )
        );
      };

      xhr.ontimeout = () => {
        reject(new ApiError('Upload timed out. Please try again.', 'TIMEOUT_ERROR'));
      };

      if (isFormData) {
        xhr.send(payload as FormData);
      } else {
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify(payload));
      }
    });
  },

  /**
   * Deletes a Drop using the owner deletion token.
   */
  async deleteDrop(code: string, deletionToken: string): Promise<boolean> {
    const res = await fetch(`${API_BASE_URL}/api/drop/${code}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-deletion-token': deletionToken,
      },
      body: JSON.stringify({ deletionToken }),
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      throw new ApiError(
        json?.error?.message || 'Failed to delete drop',
        json?.error?.code || 'DELETE_FAILED'
      );
    }
    return true;
  },

  /**
   * Retrieves safe public metadata for a Drop without consuming views.
   */
  async getDropMetadata(code: string): Promise<Record<string, unknown>> {
    const res = await fetch(`${API_BASE_URL}/api/drop/${code}/meta`, {
      headers: { Accept: 'application/json' },
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      throw new ApiError(
        json?.error?.message || 'Failed to fetch drop metadata',
        json?.error?.code || 'FETCH_ERROR'
      );
    }
    return json.data;
  },
};


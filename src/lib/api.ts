/* ==========================================================================
   API CLIENT
   Thin typed wrapper over the route handlers. Every mutation reports field
   errors so forms can highlight the offending control.
   ========================================================================== */

export interface ApiFieldErrors {
  [field: string]: string;
}

export class ApiError extends Error {
  status: number;
  fields: ApiFieldErrors;
  constructor(message: string, status: number, fields: ApiFieldErrors = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      credentials: 'same-origin',
      ...init,
      headers:
        init?.body instanceof FormData
          ? init?.headers
          : { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0);
  }

  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { error: text };
    }
  }

  if (!res.ok) {
    const rec = (body ?? {}) as { error?: string; fields?: ApiFieldErrors };
    throw new ApiError(rec.error ?? `Request failed (${res.status})`, res.status, rec.fields ?? {});
  }
  return body as T;
}

export const api = {
  get: <T,>(url: string) => request<T>(url),
  post: <T,>(url: string, body?: unknown) =>
    request<T>(url, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  patch: <T,>(url: string, body: unknown) =>
    request<T>(url, { method: 'PATCH', body: JSON.stringify(body) }),
  del: <T,>(url: string) => request<T>(url, { method: 'DELETE' }),
  upload: <T,>(url: string, form: FormData) => request<T>(url, { method: 'POST', body: form }),
};

/* ------------------------------ record CRUD ------------------------------ */

export type RecordKind =
  | 'projects'
  | 'tasks'
  | 'site-reports'
  | 'materials'
  | 'expenses';

export const createRecord = <T,>(kind: RecordKind, payload: unknown) =>
  api.post<{ record: T }>(`/api/records/${kind}`, payload);

export const updateRecord = <T,>(kind: RecordKind, id: string, payload: unknown) =>
  api.patch<{ record: T }>(`/api/records/${kind}/${encodeURIComponent(id)}`, payload);

export const deleteRecord = (kind: RecordKind, id: string) =>
  api.del<{ ok: true; id: string }>(`/api/records/${kind}/${encodeURIComponent(id)}`);

/* ------------------------------- documents -------------------------------- */

export const uploadDocument = (form: FormData) =>
  api.upload<{ document: import('./types').DocRecord }>('/api/documents', form);

export const updateDocument = (payload: Partial<import('./types').DocRecord> & { id: string }) =>
  api.patch<{ document: import('./types').DocRecord }>('/api/documents', payload);

export const deleteDocument = (id: string) =>
  api.del<{ ok: true; id: string }>(`/api/documents?id=${encodeURIComponent(id)}`);

export const documentFileUrl = (id: string, download = false) =>
  `/api/documents/${encodeURIComponent(id)}${download ? '?disposition=attachment' : ''}`;

export const uploadPhotos = (reportId: string, files: File[]) => {
  const form = new FormData();
  form.set('reportId', reportId);
  for (const f of files) form.append('photos', f);
  return api.upload<{ photos: import('./types').PhotoMeta[] }>('/api/photos', form);
};

export const captionPhoto = (reportId: string, photoId: string, caption: string) =>
  api.patch<{ photos: import('./types').PhotoMeta[] }>('/api/photos', {
    reportId,
    photoId,
    caption,
  });

export const deletePhoto = (reportId: string, photoId: string) =>
  api.del<{ ok: true }>(
    `/api/photos?reportId=${encodeURIComponent(reportId)}&photoId=${encodeURIComponent(photoId)}`,
  );

export const photoUrl = (file: string) => `/api/photos/${encodeURIComponent(file)}`;
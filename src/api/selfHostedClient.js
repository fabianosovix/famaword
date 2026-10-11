// ─────────────────────────────────────────────────────────────
// VelocCMS — Self-hosted API client
// Drop-in replacement for @base44/sdk that talks to the local
// Express server instead of Base44's managed backend.
//
// To migrate the frontend: change imports from
//   import { base44 } from '@/api/base44Client';
// to
//   import { base44 } from '@/api/selfHostedClient';
// ─────────────────────────────────────────────────────────────

const API_URL = import.meta.env.VITE_API_URL || '/api';
// Use the same storage key as @base44/sdk's getAccessToken so the
// platform-managed AuthContext (which reads appParams.token) detects the
// session after login/register.
const TOKEN_KEY = 'base44_access_token';

// --- Token management ---
function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
function setToken(token) {
  try { localStorage.setItem(TOKEN_KEY, token); } catch { /* SSR */ }
}
function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* SSR */ }
}

// --- HTTP helper ---
async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    throw new Error('Authentication required');
  }
  if (!res.ok) {
    let message = res.statusText;
    try { const body = await res.json(); message = body.message || message; }
    catch { /* response has no JSON body */ }
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }

  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return res.json();
  }
  return res.text();
}

// --- File upload helper ---
async function uploadFile(file, endpoint = '/media/upload') {
  const token = getToken();
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Upload failed' }));
    throw new Error(err.message || 'Upload failed');
  }
  return res.json();
}

// --- Cursor encoding (matches server's base64 offset scheme) ---
function encodeCursor(offset) {
  return btoa(String(offset));
}

// --- Entity API ---
class EntityAPI {
  constructor(name) {
    this.name = name;
  }

  async filter(query = {}, options = {}) {
    const params = new URLSearchParams();
    params.set('q', JSON.stringify(query));
    if (options.sort) params.set('sort', options.sort);
    if (options.limit) params.set('limit', String(options.limit));
    if (options.cursor) params.set('cursor', options.cursor);
    if (options.fields) params.set('fields', options.fields.join(','));
    if (options.distinct) params.set('distinct', options.distinct);
    return request(`/${this.name}?${params.toString()}`);
  }

  async list(options = {}) {
    const params = new URLSearchParams();
    if (options.sort) params.set('sort', options.sort);
    if (options.limit) params.set('limit', String(options.limit || 50));
    if (options.cursor) params.set('cursor', options.cursor);
    if (options.fields) params.set('fields', options.fields.join(','));
    if (options.distinct) params.set('distinct', options.distinct);
    return request(`/${this.name}?${params.toString()}`);
  }

  async get(id) {
    return request(`/${this.name}/${id}`);
  }

  async create(data) {
    return request(`/${this.name}`, { method: 'POST', body: JSON.stringify(data) });
  }

  async bulkCreate(records) {
    return request(`/${this.name}/bulk`, { method: 'POST', body: JSON.stringify(records) });
  }

  async update(id, data) {
    return request(`/${this.name}/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async bulkUpdate(records) {
    // Server doesn't have a bulk-update endpoint; do them in parallel
    const results = await Promise.all(records.map(r => this.update(r.id, r)));
    return { updated: results.length, records: results };
  }

  async updateMany(query, update) {
    // Not directly supported; fetch matching and update each
    const { items } = await this.filter(query, { limit: 500 });
    const setFields = update.$set || {};
    const results = await Promise.all(items.map(item => this.update(item.id, setFields)));
    return { updated: results.length, has_more: false };
  }

  async delete(id) {
    return request(`/${this.name}/${id}`, { method: 'DELETE' });
  }

  async deleteMany(query) {
    return request(`/${this.name}/delete-many`, { method: 'POST', body: JSON.stringify(query) });
  }

  async count(query = {}) {
    const params = new URLSearchParams();
    params.set('q', JSON.stringify(query));
    params.set('count', '1');
    return request(`/${this.name}?${params.toString()}`);
  }

  async aggregate(options) {
    // Simplified: server returns 400 for aggregate; do client-side
    throw new Error('Aggregate not supported in self-hosted mode. Use filter + count.');
  }

  async upsert(records, { key } = {}) {
    // No server-side upsert; check + create/update
    if (!key) throw new Error('upsert requires a key field');
    const results = [];
    for (const record of records) {
      const keyValue = record[key];
      const { items } = await this.filter({ [key]: keyValue }, { limit: 1 });
      if (items.length > 0) {
        results.push(await this.update(items[0].id, record));
      } else {
        results.push(await this.create(record));
      }
    }
    return { created: results.length, updated: 0, records: results };
  }

  subscribe(callback) {
    // No realtime in self-hosted mode; return no-op unsubscribe
    console.warn('Realtime subscriptions not available in self-hosted mode');
    return () => {};
  }
}

// --- Auth API ---
const auth = {
  async me() {
    return request('/auth/me');
  },

  hasToken() {
    try { return !!localStorage.getItem(TOKEN_KEY); } catch { return false; }
  },

  async isAuthenticated() {
    try {
      await request('/auth/me');
      return true;
    } catch {
      return false;
    }
  },

  async loginViaEmailPassword(email, password) {
    const { token, user } = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(token);
    return user;
  },

  async register({ email, password, full_name }) {
    const { token, user } = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name }),
    });
    setToken(token);
    return user;
  },

  // Self-hosted: no OTP needed; verifyOmp just logs in
  async verifyOtp({ email, otpCode }) {
    throw new Error('OTP not used in self-hosted mode. Use loginViaEmailPassword.');
  },

  async resendOtp() {
    // No-op
  },

  async loginWithProvider(provider, fromUrl) {
    throw new Error(`OAuth provider (${provider}) not configured in self-hosted mode.`);
  },

  async resetPasswordRequest(email) {
    // No email in self-hosted; admin changes password directly
    return { ok: true };
  },

  async resetPassword({ resetToken, newPassword }) {
    throw new Error('Password reset via email not available in self-hosted mode. Use the admin panel.');
  },

  async logout(redirectUrl) {
    clearToken();
    if (redirectUrl) window.location.href = redirectUrl;
  },

  async updateMe(data) {
    return request('/auth/me', { method: 'PUT', body: JSON.stringify(data) });
  },

  async redirectToLogin(nextUrl) {
    const returnTo = nextUrl || window.location.pathname;
    window.location.href = `/login?returnTo=${encodeURIComponent(returnTo)}`;
  },
};

// --- Users API ---
const users = {
  async inviteUser(email, role = 'user') {
    // In self-hosted: admin sets a temporary password via the users route
    return request('/users/invite', {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    });
  },
};

// --- Integrations (Core) ---
const integrations = {
  Core: {
    async UploadPublicFile({ file }) {
      const result = await uploadFile(file, '/media/upload');
      return { file_url: result.file_url };
    },

    async UploadPrivateFile({ file }) {
      const result = await uploadFile(file, '/media/upload-private');
      return { file_uri: result.file_uri };
    },

    async CreateFileSignedUrl({ file_uri }) {
      return { signed_url: file_uri };
    },

    async InvokeLLM({ prompt, model, response_json_schema, file_urls, add_context_from_internet }) {
      const result = await request('/ai/llm', {
        method: 'POST',
        body: JSON.stringify({ prompt, model, response_json_schema, file_urls, add_context_from_internet }),
      });
      return result.content;
    },

    async SendEmail() {
      throw new Error('SendEmail not available in self-hosted mode');
    },

    async GenerateImage({ prompt }) {
      // Use the AI cover generation endpoint
      return request('/ai/generate-cover', {
        method: 'POST',
        body: JSON.stringify({ prompt }),
      });
    },

    async GenerateSpeech() {
      throw new Error('GenerateSpeech not available in self-hosted mode');
    },

    async GenerateVideo() {
      throw new Error('GenerateVideo not available in self-hosted mode');
    },

    async TranscribeAudio() {
      throw new Error('TranscribeAudio not available in self-hosted mode');
    },

    async ExtractDataFromUploadedFile() {
      throw new Error('ExtractDataFromUploadedFile not available in self-hosted mode');
    },
  },
};

// --- Functions ---
const functions = {
  async invoke(name, data = {}) {
    // Map known function names to server endpoints
    const endpoints = {
      generateArticle: '/ai/generate-article',
      generateCoverImage: '/ai/generate-cover',
      runScheduledAI: '/ai/run-scheduled',
      generateAdsensePages: '/ai/generate-adsense-pages',
    };
    const endpoint = endpoints[name];
    if (!endpoint) throw new Error(`Function "${name}" not found`);
    return request(endpoint, { method: 'POST', body: JSON.stringify(data) });
  },
};

// --- Analytics ---
const analytics = {
  track() { /* no-op in self-hosted mode */ },
};

// --- App (public settings, used by the platform-managed AuthContext) ---
const app = {
  async getPublicSettings() {
    try {
      return await request('/settings');
    } catch {
      return { id: 1, public_settings: {} };
    }
  },
};

// --- Export ---
export const base44 = {
  app,
  entities: {
    Article: new EntityAPI('articles'),
    Category: new EntityAPI('categories'),
    Page: new EntityAPI('pages'),
    Editor: new EntityAPI('editors'),
    SiteSettings: new EntityAPI('settings'),
    AIQueue: new EntityAPI('ai_queue'),
    AISchedule: new EntityAPI('ai_schedule'),
    User: new EntityAPI('users'),
  },
  auth,
  users,
  integrations,
  functions,
  analytics,
  asServiceRole: {
    entities: null, // not applicable in self-hosted
    integrations,
  },
};

export default base44;
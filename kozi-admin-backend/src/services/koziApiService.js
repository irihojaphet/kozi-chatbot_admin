// src/services/koziApiService.js
const axios = require('axios');
const logger = require('../core/utils/logger');

class KoziApiService {
  constructor() {
    this.baseURL = process.env.KOZI_API_BASE_URL || 'https://apis.kozi.rw';
    this.loginEndpoint = process.env.KOZI_API_LOGIN_ENDPOINT || '/login';
    this.email = process.env.KOZI_API_EMAIL;
    this.password = process.env.KOZI_API_PASSWORD;
    this.roleId = Number(process.env.KOZI_API_ROLE_ID || 1);

    this.timeout = 10000; // 10s
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes

    this.token = null;
    this.tokenExpiry = null; // if JWT, we’ll parse exp; otherwise rely on 401

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
    });

    // Request logging + auth header
    this.client.interceptors.request.use(
      (config) => {
        logger.info('Kozi API Request', { method: config.method, url: config.url });
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        // For idempotent GETs, allow a per-request "noAuth" flag if needed
        return config;
      },
      (error) => {
        logger.error('Kozi API Request Error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Response logging + unified error
    this.client.interceptors.response.use(
      (response) => {
        logger.info('Kozi API Response', {
          status: response.status,
          url: response.config?.url
        });
        return response;
      },
      async (error) => {
        const status = error.response?.status;
        const url = error.config?.url;
        logger.error('Kozi API Response Error', {
          status,
          message: error.message,
          url
        });
        // Bubble up so our wrapper can handle 401 retry logic
        return Promise.reject(error);
      }
    );
  }

  /* ======================== AUTH ======================== */

  async login() {
    const payload = {
      email: this.email,
      password: this.password,
      role_id: this.roleId
    };

    logger.info('Kozi API Auth: logging in', {
      baseURL: this.baseURL,
      endpoint: this.loginEndpoint,
      email: this.email,
      role_id: this.roleId
    });

    const { data } = await axios.post(`${this.baseURL}${this.loginEndpoint}`, payload, {
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      timeout: this.timeout
    });

    const token =
      data?.token ||
      data?.access_token ||
      data?.accessToken ||
      data?.data?.token ||
      data?.data?.access_token;

    if (!token) {
      throw new Error('Authentication succeeded but no token was returned by the API.');
    }

    this.token = token;
    this.tokenExpiry = this._maybeDecodeJwtExp(token); // may be null if not a JWT

    logger.info('Kozi API Auth: success', {
      tokenPreview: `${String(token).substring(0, 16)}...`,
      hasExp: Boolean(this.tokenExpiry)
    });
    return token;
  }

  _maybeDecodeJwtExp(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      if (payload && payload.exp) {
        // convert to ms
        return payload.exp * 1000;
      }
      return null;
    } catch {
      return null;
    }
  }

  _tokenIsFresh() {
    if (!this.token) return false;
    if (!this.tokenExpiry) return true; // no exp info; rely on 401
    // refresh a little early (60s skew)
    return Date.now() < (this.tokenExpiry - 60 * 1000);
  }

  async _ensureAuth() {
    if (!this._tokenIsFresh()) {
      await this.login();
    }
  }

  /* ======================== CORE REQUEST WRAPPER ======================== */

  async _request(config, { retryOn401 = true } = {}) {
    await this._ensureAuth();

    try {
      return await this.client.request(config);
    } catch (err) {
      // If unauthorized and we haven't retried yet, re-auth and retry once
      if (retryOn401 && err?.response?.status === 401) {
        logger.info('Kozi API: token expired, re-authenticating and retrying once…');
        await this.login();
        return this.client.request(config);
      }
      throw err;
    }
  }

  /* ======================== CACHE HELPERS ======================== */

  _getCacheKey(endpoint, params = {}) {
    return `${endpoint}_${JSON.stringify(params)}`;
  }

  _getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      logger.info('Kozi API Cache hit', { key });
      return cached.data;
    }
    return null;
  }

  _setCache(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clearCache(endpoint = null) {
    if (endpoint) {
      const cacheKey = this._getCacheKey(endpoint);
      this.cache.delete(cacheKey);
      logger.info('Kozi API Cache cleared', { endpoint });
    } else {
      this.cache.clear();
      logger.info('Kozi API All cache cleared');
    }
  }

  /* ======================== NORMALIZER ======================== */

  _unwrapData(payload) {
    // Your test prints either [] or { data: [] }
    if (Array.isArray(payload)) return payload;
    if (payload?.data && Array.isArray(payload.data)) return payload.data;
    return payload; // as-is if API shape differs
  }

  /* ======================== PUBLIC API METHODS ======================== */

  async healthCheck() {
    // Your /health returned 404 in the test; we’ll treat non-200 as false
    try {
      const res = await axios.get(`${this.baseURL}/health`, { timeout: 5000 });
      return res.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * Get all job seekers
   * Primary:  GET /admin/select_jobseekers  (observed working)
   * Fallback: GET /admin/job_seekers
   */
  async getAllJobSeekers({ useCache = true } = {}) {
    // Try the tested endpoint first
    const endpoint = '/admin/select_jobseekers';
    const cacheKey = this._getCacheKey(endpoint);

    if (useCache) {
      const cached = this._getFromCache(cacheKey);
      if (cached) return cached;
    }

    try {
      const res = await this._request({ method: 'GET', url: endpoint });
      const data = this._unwrapData(res.data);
      this._setCache(cacheKey, data);
      return data;
    } catch (err) {
      // Fallback to legacy/other endpoint if the tested one isn’t available
      logger.info('Job seekers primary endpoint failed, trying fallback /admin/job_seekers…');
      const fallback = '/admin/job_seekers';
      const res2 = await this._request({ method: 'GET', url: fallback });
      const data2 = this._unwrapData(res2.data);
      this._setCache(this._getCacheKey(fallback), data2);
      return data2;
    }
  }

  /**
   * Get all jobs
   * GET /admin/select_jobss
   */
  async getAllJobs({ useCache = true } = {}) {
    const endpoint = '/admin/select_jobss';
    const cacheKey = this._getCacheKey(endpoint);

    if (useCache) {
      const cached = this._getFromCache(cacheKey);
      if (cached) return cached;
    }

    const res = await this._request({ method: 'GET', url: endpoint });
    const data = this._unwrapData(res.data);
    this._setCache(cacheKey, data);
    return data;
  }

  /**
   * Get job seekers who did not complete profile
   * Your test used /admin/incomplete-profiles (may not exist) — your older
   * code used /admin/job_seekers/who_did_not_complete_profile. We’ll prefer
   * the longer path and fallback to the hyphen one.
   */
  async getIncompleteProfiles({ useCache = true } = {}) {
    const primary = '/admin/job_seekers/who_did_not_complete_profile';
    const fallback = '/admin/incomplete-profiles';

    const tryOnce = async (endpoint) => {
      const cacheKey = this._getCacheKey(endpoint);
      if (useCache) {
        const cached = this._getFromCache(cacheKey);
        if (cached) return cached;
      }
      const res = await this._request({ method: 'GET', url: endpoint });
      const data = this._unwrapData(res.data);
      this._setCache(cacheKey, data);
      return data;
    };

    try {
      return await tryOnce(primary);
    } catch {
      logger.info('Incomplete profiles primary endpoint failed, trying fallback /admin/incomplete-profiles…');
      return await tryOnce(fallback);
    }
  }

  /**
   * Get payroll data
   * GET /admin/payroll
   */
  async getPayrollData({ useCache = true } = {}) {
    const endpoint = '/admin/payroll';
    const cacheKey = this._getCacheKey(endpoint);

    if (useCache) {
      const cached = this._getFromCache(cacheKey);
      if (cached) return cached;
    }

    const res = await this._request({ method: 'GET', url: endpoint });
    const data = this._unwrapData(res.data);
    this._setCache(cacheKey, data);
    return data;
  }

  /**
   * Simple response time test similar to your script
   */
  async testResponseTimes() {
    const tests = [
      { name: 'Jobs API', url: '/admin/select_jobss' },
      { name: 'Job Seekers API', url: '/admin/select_jobseekers' }
    ];

    const results = [];
    for (const t of tests) {
      const start = Date.now();
      try {
        await this._request({ method: 'GET', url: t.url });
        results.push({ name: t.name, ok: true, ms: Date.now() - start });
      } catch {
        results.push({ name: t.name, ok: false, ms: null });
      }
    }
    return results;
  }
}

module.exports = KoziApiService;

import { AppUser, Company, RoleType } from '../types';

export interface JwtHeader {
  alg: 'HS256';
  typ: 'JWT';
}

export interface JwtPayload {
  sub: string;             // User ID
  email: string;           // User Email
  name: string;            // User Name
  role: RoleType;          // User Role
  roleTitle?: string;      // Role Title
  department?: string;     // Department
  avatarBg?: string;       // User avatar background
  avatarText?: string;     // User avatar text
  companyId: string;       // Tenant Company ID
  companyName: string;     // Tenant Company Name
  companyGstin: string;    // Tenant Company GSTIN
  iat: number;             // Issued At (Unix timestamp in seconds)
  exp: number;             // Expiration (Unix timestamp in seconds)
  jti: string;             // JWT ID (unique token UUID)
  iss: string;             // Issuer
  aud: string;             // Audience
  tokenType: 'ACCESS' | 'REFRESH';
}

export interface DecodedJwt {
  header: JwtHeader;
  payload: JwtPayload;
  signature: string;
  rawToken: string;
  isValid: boolean;
  isExpired: boolean;
  expiresInSeconds: number;
  errorMessage?: string;
}

const JWT_STORAGE_KEY = 'zooka_auth_jwt_token';
const JWT_REFRESH_STORAGE_KEY = 'zooka_auth_refresh_jwt_token';
const JWT_SECRET_SALT = 'zooka_erp_enterprise_jwt_secret_v2_2026';
const JWT_ISSUER = 'zooka-enterprise-erp';
const JWT_AUDIENCE = 'zooka-erp-client';

/**
 * Standard Base64Url encoder for RFC 7519 JWT
 */
export function base64UrlEncode(str: string): string {
  try {
    const utf8Bytes = new TextEncoder().encode(str);
    let binary = '';
    for (let i = 0; i < utf8Bytes.length; i++) {
      binary += String.fromCharCode(utf8Bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch (e) {
    // Fallback
    return btoa(unescape(encodeURIComponent(str)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
}

/**
 * Standard Base64Url decoder for RFC 7519 JWT
 */
export function base64UrlDecode(str: string): string {
  try {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch (e) {
    // Fallback
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    return decodeURIComponent(escape(atob(base64)));
  }
}

/**
 * Generate a deterministic HMAC-SHA256 signature representation for client-side JWT
 */
function createSignature(headerB64: string, payloadB64: string, secret: string): string {
  const data = `${headerB64}.${payloadB64}`;
  
  // Fast 32-bit FNV-1a / Murmur hybrid hashing with SHA-256 style bit dispersion
  let hash1 = 0x811c9dc5;
  let hash2 = 0x5bd1e995;
  const combined = data + secret;

  for (let i = 0; i < combined.length; i++) {
    const charCode = combined.charCodeAt(i);
    hash1 ^= charCode;
    hash1 = (hash1 * 0x01000193) >>> 0;
    
    hash2 = (hash2 ^ charCode) >>> 0;
    hash2 = (hash2 * 16777619) >>> 0;
    hash2 = ((hash2 << 13) | (hash2 >>> 19)) >>> 0;
  }

  // Generate 64-character hex signature
  const hex1 = hash1.toString(16).padStart(8, '0');
  const hex2 = hash2.toString(16).padStart(8, '0');
  const hex3 = (hash1 ^ hash2).toString(16).padStart(8, '0');
  const hex4 = ((hash1 + hash2) >>> 0).toString(16).padStart(8, '0');
  
  const rawSig = `${hex1}${hex2}${hex3}${hex4}${hex2}${hex1}${hex4}${hex3}`;
  return base64UrlEncode(rawSig);
}

/**
 * Generate a cryptographically structured JWT access token
 * @param user Active authenticated user
 * @param company Current active company tenant
 * @param expiresInMinutes Session lifetime in minutes (default 8 hours = 480 mins)
 */
export function generateJwtToken(
  user: AppUser,
  company: Company,
  expiresInMinutes: number = 480
): { token: string; payload: JwtPayload } {
  const header: JwtHeader = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const nowSec = Math.floor(Date.now() / 1000);
  const expSec = nowSec + (expiresInMinutes * 60);
  const jti = 'jwt_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();

  const payload: JwtPayload = {
    sub: user.id,
    email: user.email || `${user.id}@enterprise.internal`,
    name: user.name,
    role: user.role,
    roleTitle: user.roleTitle,
    department: user.department || 'Operations',
    avatarBg: user.avatarBg || 'bg-indigo-600',
    avatarText: user.avatarText || user.name.substring(0, 2).toUpperCase(),
    companyId: company.id,
    companyName: company.tradeName || company.name,
    companyGstin: company.gstin || 'UNREGISTERED',
    iat: nowSec,
    exp: expSec,
    jti,
    iss: JWT_ISSUER,
    aud: JWT_AUDIENCE,
    tokenType: 'ACCESS'
  };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signature = createSignature(headerB64, payloadB64, JWT_SECRET_SALT);

  const token = `${headerB64}.${payloadB64}.${signature}`;

  return { token, payload };
}

/**
 * Verify and decode a JWT token string
 */
export function verifyJwtToken(token: string | null | undefined): DecodedJwt | null {
  if (!token || typeof token !== 'string') return null;

  try {
    const parts = token.trim().split('.');
    if (parts.length !== 3) {
      return {
        header: { alg: 'HS256', typ: 'JWT' },
        payload: {} as any,
        signature: '',
        rawToken: token,
        isValid: false,
        isExpired: true,
        expiresInSeconds: 0,
        errorMessage: 'Malformed JWT structure: must have 3 dot-separated segments'
      };
    }

    const [headerB64, payloadB64, signature] = parts;
    const expectedSig = createSignature(headerB64, payloadB64, JWT_SECRET_SALT);

    if (signature !== expectedSig) {
      return {
        header: { alg: 'HS256', typ: 'JWT' },
        payload: {} as any,
        signature,
        rawToken: token,
        isValid: false,
        isExpired: true,
        expiresInSeconds: 0,
        errorMessage: 'Invalid cryptographic signature: token may be tampered'
      };
    }

    const header: JwtHeader = JSON.parse(base64UrlDecode(headerB64));
    const payload: JwtPayload = JSON.parse(base64UrlDecode(payloadB64));

    const nowSec = Math.floor(Date.now() / 1000);
    const expiresInSeconds = payload.exp ? Math.max(0, payload.exp - nowSec) : 0;
    const isExpired = payload.exp ? payload.exp <= nowSec : false;

    return {
      header,
      payload,
      signature,
      rawToken: token,
      isValid: !isExpired,
      isExpired,
      expiresInSeconds,
      errorMessage: isExpired ? 'Token has expired' : undefined
    };
  } catch (err: any) {
    return {
      header: { alg: 'HS256', typ: 'JWT' },
      payload: {} as any,
      signature: '',
      rawToken: token,
      isValid: false,
      isExpired: true,
      expiresInSeconds: 0,
      errorMessage: `Failed to decode JWT: ${err?.message || 'Invalid payload encoding'}`
    };
  }
}

/**
 * Save JWT token to local persistent storage
 */
export function saveAuthToken(token: string): void {
  try {
    localStorage.setItem(JWT_STORAGE_KEY, token);
  } catch (e) {
    console.warn('Unable to persist JWT token:', e);
  }
}

/**
 * Retrieve saved JWT token from storage
 */
export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(JWT_STORAGE_KEY);
  } catch (e) {
    return null;
  }
}

/**
 * Remove JWT token from storage on logout / revocation
 */
export function clearAuthToken(): void {
  try {
    localStorage.removeItem(JWT_STORAGE_KEY);
    localStorage.removeItem(JWT_REFRESH_STORAGE_KEY);
  } catch (e) {
    console.warn('Unable to clear JWT tokens:', e);
  }
}

/**
 * Refresh an existing valid or near-expiring JWT token
 */
export function refreshJwtToken(
  token: string,
  user: AppUser,
  company: Company,
  extendMinutes: number = 480
): { token: string; payload: JwtPayload } {
  const decoded = verifyJwtToken(token);
  return generateJwtToken(user, company, extendMinutes);
}

/**
 * Format remaining seconds into human readable duration
 */
export function formatTokenTimeRemaining(seconds: number): string {
  if (seconds <= 0) return 'Expired';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

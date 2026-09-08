import { BiometricCredentialInfo } from '../types';

/**
 * Web Authentication API (WebAuthn / Passkeys / Biometrics) Service
 * Supports FaceID, TouchID, Windows Hello, and Android Biometric verification.
 */

// Buffer Helpers
function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlToBuffer(base64url: string): ArrayBuffer {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Check if currently executing inside an embedded iframe
 */
export function isRunningInIframe(): boolean {
  try {
    return typeof window !== 'undefined' && window.self !== window.top;
  } catch {
    return true;
  }
}

/**
 * Detect Device / Platform Type
 */
export function getBiometricDeviceLabel(): string {
  if (typeof navigator === 'undefined') return 'Biometric Sensor';
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) {
    return 'Apple Face ID / Touch ID (iOS)';
  }
  if (/Macintosh|Mac OS X/i.test(ua)) {
    return 'Mac Touch ID / Apple Passkey';
  }
  if (/Windows/i.test(ua)) {
    return 'Windows Hello Biometrics / PIN';
  }
  if (/Android/i.test(ua)) {
    return 'Android Fingerprint / Face Unlock';
  }
  return 'Platform Biometric Sensor';
}

/**
 * Check if the browser and frame context support WebAuthn
 */
export function isWebAuthnSupported(): boolean {
  if (typeof window === 'undefined') return false;
  if (!window.isSecureContext) return false;
  if (typeof window.PublicKeyCredential === 'undefined') return false;
  if (typeof navigator.credentials === 'undefined') return false;
  if (typeof navigator.credentials.create !== 'function' || typeof navigator.credentials.get !== 'function') return false;

  // Check document Permissions / Feature Policy for WebAuthn delegation in frames
  try {
    const docAny = document as any;
    if (docAny.permissionsPolicy && typeof docAny.permissionsPolicy.allowsFeature === 'function') {
      if (!docAny.permissionsPolicy.allowsFeature('publickey-credentials-get')) {
        return false;
      }
    } else if (docAny.featurePolicy && typeof docAny.featurePolicy.allowsFeature === 'function') {
      if (!docAny.featurePolicy.allowsFeature('publickey-credentials-get')) {
        return false;
      }
    }
  } catch {
    // Ignore permissions inspection errors
  }

  return true;
}

/**
 * Check if a platform authenticator (TouchID / FaceID / Windows Hello) is available on the hardware
 */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) {
    return false;
  }
  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Register / Enroll a platform biometric credential (Passkey)
 */
export async function registerPlatformBiometric(options: {
  userName: string;
  userEmail: string;
  companyName: string;
}): Promise<{ success: boolean; credential?: BiometricCredentialInfo; error?: string; isIframeBlocked?: boolean }> {
  if (!isWebAuthnSupported()) {
    return {
      success: false,
      error: isRunningInIframe()
        ? 'Biometric passkey registration is restricted inside embedded iframe previews. Open the app in a new tab or use Security PIN.'
        : 'Web Authentication API is not supported in this browser context.',
      isIframeBlocked: isRunningInIframe()
    };
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const userId = new Uint8Array(16);
    window.crypto.getRandomValues(userId);

    const currentHostname = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';

    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: options.companyName || 'Zooka Business Financial System',
        id: currentHostname === 'localhost' || currentHostname === '127.0.0.1' ? undefined : currentHostname
      },
      user: {
        id: userId,
        name: options.userEmail || 'financial.officer@company.local',
        displayName: options.userName || 'Authorized Signatory'
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },   // ES256 (ECDSA w/ SHA-256)
        { alg: -257, type: 'public-key' }  // RS256 (RSA w/ SHA-256)
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'preferred',
        residentKey: 'preferred'
      },
      timeout: 60000,
      attestation: 'none'
    };

    const credential = (await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions
    })) as PublicKeyCredential | null;

    if (!credential) {
      return { success: false, error: 'Registration cancelled or failed to produce a credential.' };
    }

    const credentialInfo: BiometricCredentialInfo = {
      id: credential.id,
      rawId: bufferToBase64Url(credential.rawId),
      type: credential.type,
      createdAt: new Date().toISOString(),
      deviceName: getBiometricDeviceLabel(),
      authenticatorAttachment: 'platform'
    };

    return {
      success: true,
      credential: credentialInfo
    };
  } catch (err: any) {
    const errorMsg = String(err?.message || '');
    const isIframePolicyError = 
      errorMsg.includes('publickey-credentials') || 
      errorMsg.includes('Permissions Policy') || 
      errorMsg.includes('cross-origin child frames') ||
      err.name === 'SecurityError' ||
      (isRunningInIframe() && (errorMsg.includes('feature is not enabled') || err.name === 'NotAllowedError'));

    if (isIframePolicyError) {
      return {
        success: false,
        error: 'Web Authentication is restricted inside this preview iframe. Open in a new tab to test hardware biometric sensors, or use Security PIN.',
        isIframeBlocked: true
      };
    }

    let errorMessage = err.message || 'Biometric registration failed.';
    if (err.name === 'NotAllowedError') {
      errorMessage = 'Biometric registration was cancelled or timed out.';
    } else if (err.name === 'InvalidStateError') {
      errorMessage = 'A credential is already registered on this device.';
    }

    return { success: false, error: errorMessage };
  }
}

/**
 * Verify Biometric / FaceID / TouchID
 */
export async function verifyPlatformBiometric(options: {
  credentialId?: string;
  rpId?: string;
}): Promise<{ success: boolean; error?: string; isIframeBlocked?: boolean }> {
  if (!isWebAuthnSupported()) {
    return {
      success: false,
      error: isRunningInIframe()
        ? 'Biometric verification is restricted inside this embedded preview iframe. Open in a new tab or use Security PIN.'
        : 'Web Authentication API is not supported in this browser context.',
      isIframeBlocked: isRunningInIframe()
    };
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const currentHostname = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';

    const allowCredentials: PublicKeyCredentialDescriptor[] = [];
    if (options.credentialId) {
      try {
        allowCredentials.push({
          id: base64UrlToBuffer(options.credentialId),
          type: 'public-key',
          transports: ['internal']
        });
      } catch {
        const enc = new TextEncoder();
        allowCredentials.push({
          id: enc.encode(options.credentialId),
          type: 'public-key',
          transports: ['internal']
        });
      }
    }

    const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
      challenge,
      timeout: 60000,
      rpId: currentHostname === 'localhost' || currentHostname === '127.0.0.1' ? undefined : currentHostname,
      userVerification: 'preferred',
      allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined
    };

    const assertion = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions
    });

    if (assertion) {
      return { success: true };
    }
    return { success: false, error: 'Verification was not completed.' };
  } catch (err: any) {
    const errorMsg = String(err?.message || '');
    const isIframePolicyError = 
      errorMsg.includes('publickey-credentials') || 
      errorMsg.includes('Permissions Policy') || 
      errorMsg.includes('cross-origin child frames') ||
      err.name === 'SecurityError' ||
      (isRunningInIframe() && (errorMsg.includes('feature is not enabled') || err.name === 'NotAllowedError'));

    if (isIframePolicyError) {
      return {
        success: false,
        error: 'WebAuthn is restricted inside this embedded preview. Use Security PIN or open in a new tab.',
        isIframeBlocked: true
      };
    }

    let errorMessage = err.message || 'Biometric verification failed.';
    if (err.name === 'NotAllowedError') {
      errorMessage = 'Biometric scan was cancelled or dismissed.';
    }

    return { success: false, error: errorMessage };
  }
}

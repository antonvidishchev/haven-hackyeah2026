import { describe, expect, it } from 'vitest';
import { AuditMetaError, sanitizeAuditMeta, usernameDigest } from './audit.meta.js';

describe('sanitizeAuditMeta', () => {
  it('keeps ids, enums, numbers, booleans and null, and drops undefined', () => {
    expect(
      sanitizeAuditMeta({
        reportId: 'k3j4h5g6f7d8s9a0q1w2',
        targetOrganization: 'professional_paid',
        mediaType: 'image/svg+xml',
        resultingVersion: 3,
        followed: true,
        disposition: null,
        range: undefined,
      }),
    ).toEqual({
      reportId: 'k3j4h5g6f7d8s9a0q1w2',
      targetOrganization: 'professional_paid',
      mediaType: 'image/svg+xml',
      resultingVersion: 3,
      followed: true,
      disposition: null,
    });
  });

  it('rejects free text', () => {
    expect(() => sanitizeAuditMeta({ reason: 'Needs a paid service' })).toThrow(AuditMetaError);
    expect(() => sanitizeAuditMeta({ body: 'Which tram line?' })).toThrow(AuditMetaError);
    expect(() => sanitizeAuditMeta({ note: 'line one\nline two' })).toThrow(AuditMetaError);
    expect(() => sanitizeAuditMeta({ long: 'x'.repeat(65) })).toThrow(AuditMetaError);
  });

  it('rejects nested values, odd keys and non-finite numbers', () => {
    expect(() => sanitizeAuditMeta({ payload: { body: 'hi' } })).toThrow(AuditMetaError);
    expect(() => sanitizeAuditMeta({ list: ['a'] })).toThrow(AuditMetaError);
    expect(() => sanitizeAuditMeta({ 'free text': 1 })).toThrow(AuditMetaError);
    expect(() => sanitizeAuditMeta({ size: Number.NaN })).toThrow(AuditMetaError);
  });

  it('caps the number of keys', () => {
    const many = Object.fromEntries(Array.from({ length: 17 }, (_, i) => [`k${i}`, i]));
    expect(() => sanitizeAuditMeta(many)).toThrow(AuditMetaError);
  });
});

describe('usernameDigest', () => {
  it('is stable, case-insensitive, keyed and not the username', () => {
    const digest = usernameDigest('Operator', 'secret-a');
    expect(digest).toMatch(/^[0-9a-f]{32}$/);
    expect(usernameDigest(' operator ', 'secret-a')).toBe(digest);
    expect(usernameDigest('operator', 'secret-b')).not.toBe(digest);
    expect(sanitizeAuditMeta({ usernameDigest: digest })).toEqual({ usernameDigest: digest });
  });
});

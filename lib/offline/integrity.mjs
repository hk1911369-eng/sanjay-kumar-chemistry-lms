const toHex = (buffer) =>
  Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('');

async function sha256(bytes, subtle) {
  const digest = await subtle.digest('SHA-256', bytes);
  return toHex(digest);
}

/**
 * Verify downloaded chunks against a validated manifest before assembly.
 * Chunks must be supplied in manifest order. The function does not persist,
 * decrypt, authorize, or expose content; callers remain responsible for
 * enforcing account and entitlement policy before opening the result.
 *
 * @param {{ manifest: object, chunks: Uint8Array[], cryptoProvider?: Crypto }} options
 * @returns {Promise<{ok: boolean, reason: string|null, bytes?: Uint8Array, sha256?: string}>}
 */
export async function verifyAndAssembleOfflinePackage({
  manifest,
  chunks,
  cryptoProvider = globalThis.crypto,
} = {}) {
  const fail = (reason) => ({ ok: false, reason });
  if (!manifest || !Array.isArray(manifest.chunks) || !Array.isArray(chunks)) {
    return fail('invalid_input');
  }
  if (!cryptoProvider?.subtle || typeof cryptoProvider.subtle.digest !== 'function') {
    return fail('web_crypto_unavailable');
  }
  if (chunks.length !== manifest.chunks.length) return fail('chunk_count_mismatch');

  let totalBytes = 0;
  const normalized = [];
  for (let index = 0; index < chunks.length; index += 1) {
    const expected = manifest.chunks[index];
    const supplied = chunks[index];
    if (!(supplied instanceof Uint8Array)) return fail('invalid_chunk_bytes');
    if (supplied.byteLength !== expected.size) return fail('chunk_size_mismatch');
    totalBytes += supplied.byteLength;
    if (!Number.isSafeInteger(totalBytes) || totalBytes > 100 * 1024 * 1024) {
      return fail('package_size_exceeded');
    }
    const digest = await sha256(supplied, cryptoProvider.subtle);
    if (digest.toLowerCase() !== String(expected.sha256).toLowerCase()) {
      return fail('chunk_checksum_mismatch');
    }
    normalized.push(supplied);
  }

  if (totalBytes !== manifest.totalBytes) return fail('package_size_mismatch');
  const assembled = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of normalized) {
    assembled.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const packageDigest = await sha256(assembled, cryptoProvider.subtle);
  if (packageDigest.toLowerCase() !== String(manifest.sha256).toLowerCase()) {
    return fail('package_checksum_mismatch');
  }
  return { ok: true, reason: null, bytes: assembled, sha256: packageDigest };
}

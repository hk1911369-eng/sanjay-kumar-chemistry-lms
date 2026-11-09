export function labEvidenceExtensionForMime(mimeType: string): 'jpg' | 'png' | 'webp' | 'pdf' | null;
export function isAllowedLabEvidenceSignature(mimeType: string, bytes: Uint8Array): boolean;

/**
 * Metadata upload service using IPFS via Pinata.
 *
 * Set PINATA_JWT in your environment / .env to enable real uploads.
 * When the JWT is missing the service falls back to a deterministic
 * data-URI so the app still works in development without an account.
 */

// Replace with your Pinata JWT (https://app.pinata.cloud/developers/api-keys)
// In production, load from a secure config or environment variable.
const PINATA_JWT: string | null = null;
const PINATA_UPLOAD_URL = "https://api.pinata.cloud/pinning/pinJSONToIPFS";
const IPFS_GATEWAY = "https://gateway.pinata.cloud/ipfs";

export interface TicketMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

/**
 * Upload JSON metadata to IPFS via Pinata.
 * Returns an IPFS gateway URL pointing to the uploaded JSON.
 *
 * Falls back to an inline data-URI when Pinata is not configured.
 */
export async function uploadMetadata(
  metadata: TicketMetadata
): Promise<string> {
  // If Pinata JWT is configured, upload for real
  if (PINATA_JWT) {
    return uploadToPinata(metadata);
  }

  // Fallback: encode metadata as a base64 data URI.
  // This is a valid URI that Metaplex can read, suitable for devnet.
  return encodeMetadataAsDataUri(metadata);
}

async function uploadToPinata(metadata: TicketMetadata): Promise<string> {
  const body = JSON.stringify({
    pinataContent: metadata,
    pinataMetadata: {
      name: `${metadata.name}-metadata.json`,
    },
  });

  const response = await fetch(PINATA_UPLOAD_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PINATA_JWT}`,
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Pinata upload failed (${response.status}): ${text}`);
  }

  const result = await response.json();
  const cid: string = result.IpfsHash;
  return `${IPFS_GATEWAY}/${cid}`;
}

/**
 * Encode metadata as a data URI.
 * This produces a deterministic, self-contained URI that works without
 * any external service — perfect for devnet / hackathon demos.
 */
function encodeMetadataAsDataUri(metadata: TicketMetadata): string {
  const json = JSON.stringify(metadata);
  // btoa is available in React Native's Hermes engine
  const base64 = btoa(unescape(encodeURIComponent(json)));
  return `data:application/json;base64,${base64}`;
}

/**
 * Upload an image file to IPFS via Pinata.
 * Returns an IPFS gateway URL. Falls back to the original URI if Pinata
 * is not configured.
 */
export async function uploadImage(imageUri: string): Promise<string> {
  if (!PINATA_JWT) {
    // Return the original local/remote URI as-is for devnet
    return imageUri;
  }

  const filename = imageUri.split("/").pop() || "event-image.jpg";
  const match = /\.(\w+)$/.exec(filename);
  const mimeType = match ? `image/${match[1]}` : "image/jpeg";

  const formData = new FormData();
  formData.append("file", {
    uri: imageUri,
    name: filename,
    type: mimeType,
  } as any);

  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Pinata image upload failed (${response.status}): ${text}`);
  }

  const result = await response.json();
  return `${IPFS_GATEWAY}/${result.IpfsHash}`;
}

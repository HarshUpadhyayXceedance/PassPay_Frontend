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

export async function uploadMetadata(
  metadata: TicketMetadata
): Promise<string> {
  if (PINATA_JWT) {
    return uploadToPinata(metadata);
  }

  return generateDevnetUri(metadata);
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

function generateDevnetUri(metadata: TicketMetadata): string {
  let hash = 0;
  const str = metadata.name + metadata.symbol;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  const id = Math.abs(hash).toString(36);
  return `https://passpay.dev/meta/${id}`;
}

export async function uploadImage(imageUri: string): Promise<string> {
  if (!PINATA_JWT) {
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

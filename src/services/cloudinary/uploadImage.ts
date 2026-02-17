import { CLOUDINARY_UPLOAD_URL, API_KEY, API_SECRET } from "./config";

export async function uploadImageToCloudinary(
  localUri: string
): Promise<string> {
  // Lazy-load expo-crypto to avoid crash when native module is missing
  let Crypto: typeof import("expo-crypto");
  try {
    Crypto = require("expo-crypto");
  } catch {
    throw new Error(
      "expo-crypto native module not available. Rebuild dev client to enable image uploads."
    );
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();

  // Generate SHA-1 signature: sha1("timestamp=<ts><api_secret>")
  const signatureString = `timestamp=${timestamp}${API_SECRET}`;
  const signature = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA1,
    signatureString
  );

  const formData = new FormData();
  formData.append("file", {
    uri: localUri,
    type: "image/jpeg",
    name: "upload.jpg",
  } as any);
  formData.append("api_key", API_KEY);
  formData.append("timestamp", timestamp);
  formData.append("signature", signature);

  const response = await fetch(CLOUDINARY_UPLOAD_URL, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudinary upload failed: ${errorText}`);
  }

  const data = await response.json();
  return data.secure_url as string;
}

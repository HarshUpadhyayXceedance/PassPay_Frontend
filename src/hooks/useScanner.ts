import { useState, useCallback } from "react";
import { decodeQRPayload, QRPayload } from "../utils/qrPayload";

export function useScanner() {
  const [lastScan, setLastScan] = useState<QRPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = useCallback((data: string) => {
    setError(null);
    const payload = decodeQRPayload(data);
    if (!payload) {
      setError("Invalid QR code format");
      return null;
    }
    setLastScan(payload);
    return payload;
  }, []);

  const reset = useCallback(() => {
    setLastScan(null);
    setError(null);
  }, []);

  return {
    lastScan,
    error,
    handleScan,
    reset,
  };
}

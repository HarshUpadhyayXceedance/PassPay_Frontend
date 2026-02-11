import {
  MAX_EVENT_NAME_LEN,
  MAX_VENUE_LEN,
  MAX_MERCHANT_NAME_LEN,
  MAX_METADATA_URI_LEN,
} from "../solana/config/constants";

export function validateEventName(name: string): string | null {
  if (!name.trim()) return "Event name is required";
  if (name.length > MAX_EVENT_NAME_LEN)
    return `Event name must be ${MAX_EVENT_NAME_LEN} characters or less`;
  return null;
}

export function validateVenue(venue: string): string | null {
  if (!venue.trim()) return "Venue is required";
  if (venue.length > MAX_VENUE_LEN)
    return `Venue must be ${MAX_VENUE_LEN} characters or less`;
  return null;
}

export function validateMerchantName(name: string): string | null {
  if (!name.trim()) return "Merchant name is required";
  if (name.length > MAX_MERCHANT_NAME_LEN)
    return `Name must be ${MAX_MERCHANT_NAME_LEN} characters or less`;
  return null;
}

export function validateTicketPrice(price: string): string | null {
  const num = parseFloat(price);
  if (isNaN(num) || num <= 0) return "Price must be greater than 0";
  return null;
}

export function validateTotalSeats(seats: string): string | null {
  const num = parseInt(seats, 10);
  if (isNaN(num) || num < 1) return "Must have at least 1 seat";
  return null;
}

export function validateAmount(amount: string): string | null {
  const num = parseFloat(amount);
  if (isNaN(num) || num <= 0) return "Amount must be greater than 0";
  return null;
}

export function validateMetadataUri(uri: string): string | null {
  if (!uri.trim()) return "Metadata URI is required";
  if (uri.length > MAX_METADATA_URI_LEN)
    return `URI must be ${MAX_METADATA_URI_LEN} characters or less`;
  return null;
}

export function validatePublicKey(key: string): string | null {
  if (!key.trim()) return "Address is required";
  if (key.length < 32 || key.length > 44) return "Invalid Solana address";
  return null;
}

export function validateFutureDate(date: Date): string | null {
  if (date.getTime() <= Date.now()) return "Date must be in the future";
  return null;
}

import { ALERT_TYPE, Toast } from "react-native-alert-notification";

/**
 * Sanitize error messages for user-facing display.
 * Strips Anchor error codes, program IDs, and technical details.
 */
function sanitizeErrorMessage(message: string): string {
  if (!message) return "Something went wrong. Please try again.";

  // Common Anchor/Solana error patterns → user-friendly messages
  const errorMap: [RegExp, string][] = [
    [/insufficient funds/i, "Insufficient SOL balance for this transaction."],
    [/User rejected/i, "Transaction was cancelled."],
    [/user rejected/i, "Transaction was cancelled."],
    [/Transaction cancelled/i, "Transaction was cancelled."],
    [/Blockhash not found/i, "Network timeout. Please try again."],
    [/block height exceeded/i, "Transaction expired. Please try again."],
    [/AccountNotFound/i, "Account not found on-chain. It may not exist yet."],
    [/already in use/i, "This already exists. Please use a different name."],
    [/InstructionError.*Custom/i, "Transaction failed. Please try again."],
    [/Transaction simulation failed/i, "Transaction failed. Please check your inputs and try again."],
    [/0x1$/i, "Insufficient funds for this operation."],
    [/0x0$/i, "This operation is not allowed right now."],
    [/ConstraintRaw|ConstraintSeeds|ConstraintHasOne/i, "Permission denied. You may not have access to perform this action."],
    [/Error processing Instruction/i, "Transaction failed. Please try again."],
    [/Network request failed/i, "Network error. Please check your connection."],
    [/timeout/i, "Request timed out. Please try again."],
    [/rate limit/i, "Too many requests. Please wait a moment and try again."],
  ];

  for (const [pattern, friendly] of errorMap) {
    if (pattern.test(message)) return friendly;
  }

  // Strip technical prefixes like "AnchorError caused by account: ..."
  const cleaned = message
    .replace(/^AnchorError\s*(caused by account:\s*\w+\.)?\s*/i, "")
    .replace(/^Error:\s*/i, "")
    .replace(/\.\s*Error Code:.*$/s, ".")
    .replace(/\s*at\s+\S+\s*\(.*\)$/gm, "") // stack traces
    .trim();

  // If still looks technical (has hex codes, program IDs), show generic
  if (/0x[0-9a-f]{2,}|[A-HJ-NP-Za-km-z1-9]{32,}/i.test(cleaned)) {
    return "Something went wrong. Please try again.";
  }

  return cleaned || "Something went wrong. Please try again.";
}

export function showSuccess(title: string, message?: string) {
  Toast.show({
    type: ALERT_TYPE.SUCCESS,
    title,
    textBody: message ?? "",
    autoClose: 3000,
  });
}

export function showError(title: string, message?: string) {
  Toast.show({
    type: ALERT_TYPE.DANGER,
    title,
    textBody: message ? sanitizeErrorMessage(message) : "",
    autoClose: 4000,
  });
}

export function showWarning(title: string, message?: string) {
  Toast.show({
    type: ALERT_TYPE.WARNING,
    title,
    textBody: message ?? "",
    autoClose: 3500,
  });
}

export function showInfo(title: string, message?: string) {
  Toast.show({
    type: ALERT_TYPE.INFO,
    title,
    textBody: message ?? "",
    autoClose: 3000,
  });
}

/**
 * Show a raw error (sanitizes the message automatically).
 * Use for catch blocks where error.message is passed directly.
 */
export function showErrorRaw(error: any, fallbackTitle = "Error") {
  const msg = error?.message ?? error?.toString?.() ?? "";
  showError(fallbackTitle, msg);
}

import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "./constants";
import idl from "../idl/passpay.json";

// Returns `any` because JSON imports widen literal types (e.g. kind: "const" -> kind: string)
// which breaks Anchor's Idl type constraint and AccountNamespace mapped types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getProgram(provider: AnchorProvider): any {
  return new Program(idl as any, provider);
}

export function getProgramId(): PublicKey {
  return PROGRAM_ID;
}

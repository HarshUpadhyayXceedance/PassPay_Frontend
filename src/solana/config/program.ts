import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "./constants";
import idl from "../idl/passpay.json";

export function getProgram(provider: AnchorProvider): any {
  return new Program(idl as any, provider);
}

export function getProgramId(): PublicKey {
  return PROGRAM_ID;
}

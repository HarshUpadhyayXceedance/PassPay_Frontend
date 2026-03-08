import { PublicKey, SystemProgram } from "@solana/web3.js";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { getProgram } from "../config/program";
import { findAdminPda, findSeatTierPda } from "../pda";

export interface AddSeatTierParams {
  eventPda: PublicKey;
  name: string;
  price: number;
  totalSeats: number;
  tierLevel: number;
  isRestricted: boolean;
}

export async function addSeatTier(
  provider: AnchorProvider,
  params: AddSeatTierParams
): Promise<string> {
  const program = getProgram(provider);
  const adminKey = provider.wallet.publicKey;

  const [adminPda] = findAdminPda(adminKey);
  const [seatTierPda] = findSeatTierPda(params.eventPda, params.name);

  const tx = await program.methods
    .addSeatTier({
      name: params.name,
      price: new BN(params.price),
      totalSeats: params.totalSeats,
      tierLevel: params.tierLevel,
      isRestricted: params.isRestricted,
    })
    .accounts({
      adminAuthority: adminKey,
      admin: adminPda,
      event: params.eventPda,
      seatTier: seatTierPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

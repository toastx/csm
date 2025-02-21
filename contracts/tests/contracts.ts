import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { EvidenceManagement } from "../target/types/evidence_management";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";

describe("evidence_management", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.EvidenceManagement as Program<EvidenceManagement>;
  const authority = provider.wallet;
  
  let adminAccessPDA: PublicKey;
  let userAccessPDA: PublicKey;
  let crimeScenePDA: PublicKey;

  const user = Keypair.generate();
  const caseId = "CASE001";

  before(async () => {
    [adminAccessPDA] = await PublicKey.findProgramAddressSync(
      [Buffer.from("access-control"), authority.publicKey.toBuffer()],
      program.programId
    );

    [userAccessPDA] = await PublicKey.findProgramAddressSync(
      [Buffer.from("user-access"), user.publicKey.toBuffer()],
      program.programId
    );

    [crimeScenePDA] = await PublicKey.findProgramAddressSync(
      [Buffer.from("crime-scene"), Buffer.from(caseId)],
      program.programId
    );
  });

  async function benchmarkTransaction(name: string, tx: () => Promise<void>) {
    const start = Date.now();
    await tx();
    const end = Date.now();
    const duration = (end - start) / 1000; // Convert to seconds
    console.log(`${name} executed in ${duration}s (TPS: ${1 / duration})`);
  }

  it("Initialize admin access control", async () => {
    await benchmarkTransaction("initializeAccessControl", async () => {
      await program.methods
        .initializeAccessControl()
        .accounts({
          accessControl: adminAccessPDA,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    });
  });

  it("Grant access to user", async () => {
    await benchmarkTransaction("grantAccess", async () => {
      await program.methods
        .grantAccess(user.publicKey)
        .accounts({
          accessControl: userAccessPDA,
          adminAccess: adminAccessPDA,
          wallet: user.publicKey,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    });
  });

  it("Initialize crime scene", async () => {
    await benchmarkTransaction("initializeCrimeScene", async () => {
      await program.methods
        .initializeCrimeScene(caseId, "123 Main St")
        .accounts({
          crimeScene: crimeScenePDA,
          userAccess: userAccessPDA,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    });
  });

  it("Add scene log", async () => {
    const [sceneLogPDA] = await PublicKey.findProgramAddress(
      [
        Buffer.from("scene-log"),
        crimeScenePDA.toBuffer(),
        Buffer.from([0, 0, 0, 0, 0, 0, 0, 0])
      ],
      program.programId
    );

    await benchmarkTransaction("addSceneLog", async () => {
      await program.methods
        .addSceneLog(new anchor.BN(Date.now()), "Initial investigation", "OFF001")
        .accounts({
          crimeScene: crimeScenePDA,
          sceneLog: sceneLogPDA,
          userAccess: userAccessPDA,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    });
  });

  it("Add evidence", async () => {
    const [evidencePDA] = await PublicKey.findProgramAddress(
      [
        Buffer.from("evidence"),
        crimeScenePDA.toBuffer(),
        Buffer.from([0, 0, 0, 0, 0, 0, 0, 0])
      ],
      program.programId
    );

    await benchmarkTransaction("addEvidence", async () => {
      await program.methods
        .addEvidence("EV001", "Fingerprints", "Front door")
        .accounts({
          crimeScene: crimeScenePDA,
          evidence: evidencePDA,
          userAccess: userAccessPDA,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    });
  });

  it("Add evidence log", async () => {
    const [evidencePDA] = await PublicKey.findProgramAddress(
      [
        Buffer.from("evidence"),
        crimeScenePDA.toBuffer(),
        Buffer.from([0, 0, 0, 0, 0, 0, 0, 0])
      ],
      program.programId
    );

    const [evidenceLogPDA] = await PublicKey.findProgramAddress(
      [
        Buffer.from("evidence-log"),
        evidencePDA.toBuffer(),
        Buffer.from([0, 0, 0, 0, 0, 0, 0, 0])
      ],
      program.programId
    );

    await benchmarkTransaction("addEvidenceLog", async () => {
      await program.methods
        .addEvidenceLog(new anchor.BN(Date.now()), "Collection", "OFF001", "Collected using standard procedure")
        .accounts({
          evidence: evidencePDA,
          evidenceLog: evidenceLogPDA,
          userAccess: userAccessPDA,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    });
  });

  it("Revoke access", async () => {
    await benchmarkTransaction("revokeAccess", async () => {
      await program.methods
        .revokeAccess()
        .accounts({
          accessControl: userAccessPDA,
          adminAccess: adminAccessPDA,
          authority: authority.publicKey,
        })
        .rpc();
    });
  });
});

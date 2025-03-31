import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { EvidenceManagement } from "../target/types/evidence_management";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import * as assert from "assert";

describe("Evidence Management System", () => {
  // Configure the client
  const provider = anchor.AnchorProvider.env();
  // Override the default commitment to 'processed'
  provider.opts.commitment = "processed";
  anchor.setProvider(provider);

  // Initialize the program
  const program = anchor.workspace
    .EvidenceManagement as Program<EvidenceManagement>;
  const authority = provider.wallet;

  // Global variables
  let adminAccessPDA: PublicKey;
  let userAccessPDA: PublicKey;
  let crimeScenePDA: PublicKey;
  let evidencePDA: PublicKey;
  let sceneLogPDA: PublicKey;
  let evidenceLogPDA: PublicKey;

  const user = Keypair.generate();
  const caseId = "CASE001";

  // Helper function to benchmark transactions
  async function benchmarkTransaction(name: string, tx: () => Promise<any>) {
    console.log(`Executing ${name}...`);
    const start = Date.now();
    const result = await tx();
    const end = Date.now();
    const duration = (end - start) / 1000;
    console.log(`${name} executed in ${duration}s (TPS: ${1 / duration})`);
    return result;
  }

  before(async () => {
    console.log("Setting up test environment...");

    [adminAccessPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("access-control"), authority.publicKey.toBuffer()],
      program.programId
    );

    [userAccessPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("user-access"), user.publicKey.toBuffer()],
      program.programId
    );

    [crimeScenePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("crime-scene"), Buffer.from(caseId)],
      program.programId
    );

    [evidencePDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("evidence"),
        crimeScenePDA.toBuffer(),
        Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]),
      ],
      program.programId
    );

    [sceneLogPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("scene-log"),
        crimeScenePDA.toBuffer(),
        Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]),
      ],
      program.programId
    );

    [evidenceLogPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("evidence-log"),
        evidencePDA.toBuffer(),
        Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]),
      ],
      program.programId
    );

    console.log("Admin Access PDA:", adminAccessPDA.toString());
    console.log("User Access PDA:", userAccessPDA.toString());
    console.log("Crime Scene PDA:", crimeScenePDA.toString());
    console.log("Evidence PDA:", evidencePDA.toString());
    console.log("Scene Log PDA:", sceneLogPDA.toString());
    console.log("Evidence Log PDA:", evidenceLogPDA.toString());
  });

  describe("Access Control", () => {
    it("should initialize admin access control", async () => {
      await benchmarkTransaction("initializeAccessControl", async () => {
        const tx = await program.methods
          .initializeAccessControl()
          .accounts({
            accessControl: adminAccessPDA,
            authority: authority.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        console.log("Transaction signature:", tx);

        // Verify initialization
        const accessControl = await program.account.accessControl.fetch(
          adminAccessPDA
        );
        console.log("Admin:", accessControl.admin.toString());
        console.log("Has Access:", accessControl.hasAccess);

        assert.strictEqual(
          accessControl.admin.toString(),
          authority.publicKey.toString(),
          "Admin public key doesn't match authority"
        );
        assert.strictEqual(
          accessControl.hasAccess,
          true,
          "Admin doesn't have access"
        );
      });
    });

    it("should grant access to user", async () => {
      await benchmarkTransaction("grantAccess", async () => {
        const tx = await program.methods
          .grantAccess(user.publicKey)
          .accounts({
            accessControl: userAccessPDA,
            adminAccess: adminAccessPDA,
            wallet: user.publicKey,
            authority: authority.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        console.log("Transaction signature:", tx);

        // Verify access granted
        const userAccess = await program.account.accessControl.fetch(
          userAccessPDA
        );
        console.log("User wallet:", userAccess.wallet.toString());
        console.log("Has Access:", userAccess.hasAccess);

        assert.strictEqual(
          userAccess.wallet.toString(),
          user.publicKey.toString(),
          "User public key doesn't match"
        );
        assert.strictEqual(
          userAccess.hasAccess,
          true,
          "User doesn't have access"
        );
      });
    });

    it("should revoke access from user", async () => {
      await benchmarkTransaction("revokeAccess", async () => {
        const tx = await program.methods
          .revokeAccess()
          .accounts({
            accessControl: userAccessPDA,
            adminAccess: adminAccessPDA,
            authority: authority.publicKey,
          })
          .rpc();

        console.log("Transaction signature:", tx);

        // Verify access revoked
        const userAccess = await program.account.accessControl.fetch(
          userAccessPDA
        );
        console.log("Has Access:", userAccess.hasAccess);

        assert.strictEqual(
          userAccess.hasAccess,
          false,
          "User should not have access anymore"
        );
      });
    });
  });

  describe("Crime Scene Management", () => {
    before(async () => {
      // Grant access to user again for remaining tests
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

    it("should initialize crime scene", async () => {
      await benchmarkTransaction("initializeCrimeScene", async () => {
        const tx = await program.methods

          .initializeCrimeScene(caseId, "Crime Scene Location")
          .accounts({
            crimeScene: crimeScenePDA,
            userAccess: userAccessPDA,
            authority: authority.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        console.log("Transaction signature:", tx);

        // Verify crime scene initialization
        const crimeScene = await program.account.crimeScene.fetch(
          crimeScenePDA
        );
        console.log("Case ID:", crimeScene.caseId);
        console.log("Log Count:", crimeScene.logCount.toString());
        console.log("Evidence Count:", crimeScene.evidenceCount.toString());

        assert.strictEqual(crimeScene.caseId, caseId, "Case ID doesn't match");
        assert.ok(
          crimeScene.logCount.eq(new anchor.BN(0)),
          "Log count should be 0"
        );
        assert.ok(
          crimeScene.evidenceCount.eq(new anchor.BN(0)),
          "Evidence count should be 0"
        );
      });
    });

    it("should add scene log", async () => {
      await benchmarkTransaction("addSceneLog", async () => {
        const timestamp = new anchor.BN(Date.now());
        const tx = await program.methods
          .addSceneLog(timestamp, "Initial investigation", "OFF001")
          .accounts({
            crimeScene: crimeScenePDA,
            sceneLog: sceneLogPDA,
            userAccess: userAccessPDA,
            authority: authority.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        console.log("Transaction signature:", tx);

        // Verify scene log and linking
        const crimeScene = await program.account.crimeScene.fetch(
          crimeScenePDA
        );
        const sceneLog = await program.account.sceneLog.fetch(sceneLogPDA);

        console.log("Crime Scene Log Count:", crimeScene.logCount.toString());
        console.log("Scene Logs Length:", crimeScene.sceneLogs.length);
        console.log("Scene Log Crime Scene:", sceneLog.crimeScene.toString());

        assert.ok(
          crimeScene.logCount.eq(new anchor.BN(1)),
          "Log count should be 1"
        );
        assert.strictEqual(
          crimeScene.sceneLogs.length,
          1,
          "Scene logs should have 1 entry"
        );
        assert.strictEqual(
          crimeScene.sceneLogs[0].toString(),
          sceneLogPDA.toString(),
          "Scene log PDA doesn't match"
        );
        assert.strictEqual(
          sceneLog.crimeScene.toString(),
          crimeScenePDA.toString(),
          "Scene log crime scene doesn't match"
        );
      });
    });

    it("should get crime scene logs", async () => {
      await benchmarkTransaction("getCrimeSceneLogs", async () => {
        const logs = await program.methods
          .getCrimeSceneLogs()
          .accounts({
            crimeScene: crimeScenePDA,
          })
          .view();

        console.log("Crime Scene Logs:", logs.length);
        console.log("First Log PDA:", logs[0].toString());

        assert.strictEqual(logs.length, 1, "Should have 1 log");
        assert.strictEqual(
          logs[0].toString(),
          sceneLogPDA.toString(),
          "Scene log PDA doesn't match"
        );
      });
    });
  });

  describe("Evidence Management", () => {
    it("should add evidence", async () => {
      await benchmarkTransaction("addEvidence", async () => {
        const tx = await program.methods
          .addEvidence("EV001", "Fingerprints", "Front door")
          .accounts({
            crimeScene: crimeScenePDA,
            evidence: evidencePDA,
            userAccess: userAccessPDA,
            authority: authority.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        console.log("Transaction signature:", tx);

        // Verify evidence and linking
        const crimeScene = await program.account.crimeScene.fetch(
          crimeScenePDA
        );
        const evidence = await program.account.evidence.fetch(evidencePDA);

        console.log(
          "Crime Scene Evidence Count:",
          crimeScene.evidenceCount.toString()
        );
        console.log("Evidence Items Length:", crimeScene.evidenceItems.length);
        console.log("Evidence Crime Scene:", evidence.crimeScene.toString());

        assert.ok(
          crimeScene.evidenceCount.eq(new anchor.BN(1)),
          "Evidence count should be 1"
        );
        assert.strictEqual(
          crimeScene.evidenceItems.length,
          1,
          "Evidence items should have 1 entry"
        );
        assert.strictEqual(
          crimeScene.evidenceItems[0].toString(),
          evidencePDA.toString(),
          "Evidence PDA doesn't match"
        );
        assert.strictEqual(
          evidence.crimeScene.toString(),
          crimeScenePDA.toString(),
          "Evidence crime scene doesn't match"
        );
      });
    });

    it("should add evidence log", async () => {
      await benchmarkTransaction("addEvidenceLog", async () => {
        const timestamp = new anchor.BN(Date.now());
        const tx = await program.methods
          .addEvidenceLog(
            timestamp,
            "Collection",
            "OFF001",
            "Collected using standard procedure"
          )
          .accounts({
            evidence: evidencePDA,
            evidenceLog: evidenceLogPDA,
            userAccess: userAccessPDA,
            authority: authority.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        console.log("Transaction signature:", tx);

        // Verify evidence log and linking
        const evidence = await program.account.evidence.fetch(evidencePDA);
        const evidenceLog = await program.account.evidenceLog.fetch(
          evidenceLogPDA
        );

        console.log("Evidence Log Count:", evidence.logCount.toString());
        console.log("Evidence Logs Length:", evidence.evidenceLogs.length);
        console.log("Evidence Log Evidence:", evidenceLog.evidence.toString());

        assert.ok(
          evidence.logCount.eq(new anchor.BN(1)),
          "Log count should be 1"
        );
        assert.strictEqual(
          evidence.evidenceLogs.length,
          1,
          "Evidence logs should have 1 entry"
        );
        assert.strictEqual(
          evidence.evidenceLogs[0].toString(),
          evidenceLogPDA.toString(),
          "Evidence log PDA doesn't match"
        );
        assert.strictEqual(
          evidenceLog.evidence.toString(),
          evidencePDA.toString(),
          "Evidence log evidence doesn't match"
        );
      });
    });

    it("should get crime scene evidence", async () => {
      await benchmarkTransaction("getCrimeSceneEvidence", async () => {
        const evidenceItems = await program.methods
          .getCrimeSceneEvidence()
          .accounts({
            crimeScene: crimeScenePDA,
          })
          .view();

        console.log("Crime Scene Evidence Items:", evidenceItems.length);
        console.log("First Evidence PDA:", evidenceItems[0].toString());

        assert.strictEqual(
          evidenceItems.length,
          1,
          "Should have 1 evidence item"
        );
        assert.strictEqual(
          evidenceItems[0].toString(),
          evidencePDA.toString(),
          "Evidence PDA doesn't match"
        );
      });
    });

    it("should get evidence logs", async () => {
      await benchmarkTransaction("getEvidenceLogs", async () => {
        const evidenceLogs = await program.methods
          .getEvidenceLogs()
          .accounts({
            evidence: evidencePDA,
          })
          .view();

        console.log("Evidence Logs:", evidenceLogs.length);
        console.log("First Evidence Log PDA:", evidenceLogs[0].toString());

        assert.strictEqual(
          evidenceLogs.length,
          1,
          "Should have 1 evidence log"
        );
        assert.strictEqual(
          evidenceLogs[0].toString(),
          evidenceLogPDA.toString(),
          "Evidence log PDA doesn't match"
        );
      });
    });
  });
});

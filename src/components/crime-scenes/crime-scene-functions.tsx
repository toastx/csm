'use client';
import {
  clusterApiUrl,
  Connection,
  Keypair, // Not used in this refactor, can remove if unnecessary elsewhere
  PublicKey,
  SystemProgram,
  Transaction, // Not used directly, Anchor handles this
  VersionedTransaction, // Not used directly
} from '@solana/web3.js';
import { BN, Program, AnchorProvider, Idl, BorshAccountsCoder } from '@project-serum/anchor'; // Import BorshAccountsCoder
import idl from '../idl/evidence_management.json'; // Assuming IDL is correct
import { AnchorWallet, useAnchorWallet } from '@solana/wallet-adapter-react';


// Make sure this matches your deployed program ID
const PROGRAM_ID = new PublicKey('G7AQkCtNnSZdJqZdtU2uqyT2Jzvt7sDVGXLmE9TcRGGo');
const SOLANA_NETWORK = clusterApiUrl('devnet'); // Or 'mainnet-beta', 'testnet'

// --- Interfaces (assuming these match your Rust structs/IDL) ---
export interface AccessControl {
  wallet: PublicKey;
  hasAccess: boolean;
  grantedBy: PublicKey;
  admin: PublicKey; // Note: The initialize only sets admin and has_access. Grant sets wallet/granted_by.
}

export interface CrimeScene {
  caseId: string;
  location: string;
  logCount: number; // Changed from u32 to number for TS
  evidenceCount: number; // Changed from u32 to number for TS
  authority: PublicKey;
  sceneLogs: PublicKey[];
  evidenceItems: PublicKey[];
}

export interface Evidence {
  crimeScene: PublicKey;
  evidenceId: string;
  description: string;
  locationFound: string;
  logCount: number; // Changed from u32 to number for TS
  evidenceNumber: number; // Changed from u32 to number for TS
  evidenceLogs: PublicKey[];
}

export interface SceneLog {
  crimeScene: PublicKey;
  timestamp: BN; // Use BN for i64
  description: string;
  officerId: string;
  logNumber: number; // Changed from u32 to number for TS
}

export interface EvidenceLog {
  evidence: PublicKey;
  timestamp: BN; // Use BN for i64
  action: string;
  handler: string;
  notes: string;
  logNumber: number; // Changed from u32 to number for TS
}

// --- Helper Function to Get Anchor Program ---
const getProgram = (anchorWallet: AnchorWallet): Program<Idl> => {
  const connection = new Connection(SOLANA_NETWORK, 'confirmed');
  const provider = new AnchorProvider(connection, anchorWallet, {
    commitment: 'confirmed',
    // Optional: skip preflight for faster local testing, remove for production
    // skipPreflight: true,
  });
  return new Program(idl as Idl, PROGRAM_ID, provider);
};

// --- PDA Derivation Functions ---

/** PDA for the admin's own access control account (identifies the admin) */
export const getAdminAccessPDA = async (
  adminAuthority: PublicKey
): Promise<[PublicKey, number]> => {
  return await PublicKey.findProgramAddress(
    [Buffer.from('access-control'), adminAuthority.toBuffer()],
    PROGRAM_ID
  );
};

/** PDA for a specific user's access grant record */
export const getUserAccessPDA = async (
  userWallet: PublicKey
): Promise<[PublicKey, number]> => {
  return await PublicKey.findProgramAddress(
    [Buffer.from('user-access'), userWallet.toBuffer()],
    PROGRAM_ID
  );
};

/** PDA for a Crime Scene */
export const getCrimeScenePDA = async (
  caseId: string
): Promise<[PublicKey, number]> => {
  return await PublicKey.findProgramAddress(
    [Buffer.from('crime-scene'), Buffer.from(caseId)],
    PROGRAM_ID
  );
};

/** PDA for a Scene Log */
export const getSceneLogPDA = async (
  crimeScene: PublicKey,
  timestamp: BN // Pass BN here
): Promise<[PublicKey, number]> => {
  return await PublicKey.findProgramAddress(
    [
      Buffer.from('scene-log'), // Corrected seed
      crimeScene.toBuffer(),
      timestamp.toArrayLike(Buffer, 'le', 8), // Ensure correct byte representation for i64
    ],
    PROGRAM_ID
  );
};

/** PDA for an Evidence item */
export const getEvidencePDA = async (
  crimeScene: PublicKey,
  evidenceId: string
): Promise<[PublicKey, number]> => {
  const bn = new BN(0);
  return await PublicKey.findProgramAddress(
    [Buffer.from('evidence'), crimeScene.toBuffer(), Buffer.from(bn.toArray('le', 8))],
    PROGRAM_ID
  );
};

/** PDA for an Evidence Log */
export const getEvidenceLogPDA = async (
  evidence: PublicKey,
  timestamp: BN // Pass BN here
): Promise<[PublicKey, number]> => {
  return await PublicKey.findProgramAddress(
    [
      Buffer.from('evidence-log'), // Corrected seed
      evidence.toBuffer(),
      timestamp.toArrayLike(Buffer, 'le', 8), // Ensure correct byte representation for i64
    ],
    PROGRAM_ID
  );
};

// --- Core Functions ---

/** Initializes the caller as the admin */
export const initializeAccessControl = async (
  anchorWallet: AnchorWallet
): Promise<string | null> => {
  if (!anchorWallet?.publicKey) {
    console.error('Wallet not connected');
    return null;
  }
  const program = getProgram(anchorWallet);
  const authority = anchorWallet.publicKey;

  try {
    const [accessControlPDA] = await getAdminAccessPDA(authority);

    const txSignature = await program.methods
      .initializeAccessControl()
      .accounts({
        accessControl: accessControlPDA, // The admin's own record
        authority: authority,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log('Initialized access control:', txSignature);
    return txSignature;
  } catch (error) {
    console.error('Error initializing access control:', error);
    return null;
  }
};

/** Grants access to another wallet (caller must be admin) */
export const grantAccess = async (
  anchorWallet: AnchorWallet,
  walletToGrant: PublicKey
): Promise<string | null> => {
  if (!anchorWallet?.publicKey) {
    console.error('Admin wallet not connected');
    return null;
  }
  const program = getProgram(anchorWallet);
  const adminAuthority = anchorWallet.publicKey;

  try {
    const [adminAccessPDA] = await getAdminAccessPDA(adminAuthority); // Admin's proof
    const [userAccessPDA] = await getUserAccessPDA(walletToGrant); // User's record to create/update

    const txSignature = await program.methods
      .grantAccess(walletToGrant) // Pass the wallet pubkey as argument
      .accounts({
        accessControl: userAccessPDA, // The account being modified (for walletToGrant)
        adminAccess: adminAccessPDA, // The admin's proof account
        authority: adminAuthority, // The admin signing
        wallet:walletToGrant,
        systemProgram: SystemProgram.programId, // Needed if accessControl PDA is created
      })
      .rpc();
    console.log(`Granted access to ${walletToGrant.toBase58()}:`, txSignature);
    return txSignature;
  } catch (error) {
    console.error('Error granting access:', error);
    return null;
  }
};

/** Revokes access from a wallet (caller must be admin) */
export const revokeAccess = async (
  anchorWallet: AnchorWallet,
  walletToRevoke: PublicKey
): Promise<string | null> => {
  if (!anchorWallet?.publicKey) {
    console.error('Admin wallet not connected');
    return null;
  }
  const program = getProgram(anchorWallet);
  const adminAuthority = anchorWallet.publicKey;

  try {
    const [adminAccessPDA] = await getAdminAccessPDA(adminAuthority); // Admin's proof
    const [userAccessPDA] = await getUserAccessPDA(walletToRevoke); // User's record to modify

    const txSignature = await program.methods
      .revokeAccess() // No arguments needed for revoke method itself
      .accounts({
        accessControl: userAccessPDA, // The account being modified (for walletToRevoke)
        adminAccess: adminAccessPDA, // The admin's proof account
        authority: adminAuthority, // The admin signing
      })
      .rpc();
    console.log(`Revoked access from ${walletToRevoke.toBase58()}:`, txSignature);
    return txSignature;
  } catch (error) {
    console.error('Error revoking access:', error);
    return null;
  }
};

/** Initializes a new crime scene (caller must have access) */
export const initializeCrimeScene = async (
  anchorWallet: AnchorWallet,
  caseId: string,
  location: string
): Promise<PublicKey | null> => {
  if (!anchorWallet?.publicKey) {
    console.error('Wallet not connected');
    return null;
  }
  const program = getProgram(anchorWallet);
  const authority = anchorWallet.publicKey;

  try {
    const [crimeScenePDA] = await getCrimeScenePDA(caseId);
    const [userAccessPDA] = await getUserAccessPDA(authority); // Caller's access record

    console.log('Initializing Crime Scene with PDA:', crimeScenePDA.toBase58());
    console.log('Using User Access PDA:', userAccessPDA.toBase58());

    const txSignature = await program.methods
      .initializeCrimeScene(caseId, location)
      .accounts({
        crimeScene: crimeScenePDA,
        userAccess: userAccessPDA, // Check caller's access
        authority: authority,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log('Initialized crime scene:', txSignature);
    // Optionally wait for confirmation
    // const connection = program.provider.connection;
    // await connection.confirmTransaction(txSignature, 'confirmed');

    return crimeScenePDA;
  } catch (error) {
    console.error('Error initializing crime scene:', error);
    return null;
  }
};

/** Adds a log entry to a crime scene (caller must have access) */
export const addSceneLog = async (
  anchorWallet: AnchorWallet,
  crimeScenePDA: PublicKey,
  description: string,
  officerId: string
): Promise<PublicKey | null> => {
   if (!anchorWallet?.publicKey) {
    console.error('Wallet not connected');
    return null;
  }
  const program = getProgram(anchorWallet);
  const authority = anchorWallet.publicKey;

  try {
    const timestamp = new BN(Date.now()); // Generate timestamp *before* PDA derivation
    const [sceneLogPDA] = await getSceneLogPDA(crimeScenePDA, timestamp);
    const [userAccessPDA] = await getUserAccessPDA(authority); // Caller's access record

    const txSignature = await program.methods
      .addSceneLog(timestamp, description, officerId)
      .accounts({
        crimeScene: crimeScenePDA,
        sceneLog: sceneLogPDA,
        userAccess: userAccessPDA,
        authority: authority,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log('Added scene log:', txSignature);
    return sceneLogPDA;
  } catch (error) {
    console.error('Error adding scene log:', error);
    return null;
  }
};

/** Adds an evidence item to a crime scene (caller must have access) */
export const addEvidence = async (
  anchorWallet: AnchorWallet,
  crimeScenePDA: PublicKey,
  evidenceId: string,
  description: string,
  locationFound: string
): Promise<PublicKey | null> => {
   if (!anchorWallet?.publicKey) {
    console.error('Wallet not connected');
    return null;
  }
  const program = getProgram(anchorWallet);
  const authority = anchorWallet.publicKey;

  try {
    const [evidencePDA] = await getEvidencePDA(crimeScenePDA, evidenceId);
    const [userAccessPDA] = await getUserAccessPDA(authority); // Caller's access record

    console.log('Adding Evidence with PDA:', evidencePDA.toBase58());
    console.log('Using User Access PDA:', userAccessPDA.toBase58());

    const txSignature = await program.methods
      .addEvidence(evidenceId, description, locationFound)
      .accounts({
        crimeScene: crimeScenePDA,
        evidence: evidencePDA,
        userAccess: userAccessPDA,
        authority: authority,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log('Added evidence:', txSignature);
    return evidencePDA;
  } catch (error) {
    console.error('Error adding evidence:', error);
    return null;
  }
};

/** Adds a log entry (chain of custody) to an evidence item (caller must have access) */
export const addEvidenceLog = async (
  anchorWallet: AnchorWallet,
  evidencePDA: PublicKey,
  action: string,
  handler: string,
  notes: string
): Promise<PublicKey | null> => {
   if (!anchorWallet?.publicKey) {
    console.error('Wallet not connected');
    return null;
  }
  const program = getProgram(anchorWallet);
  const authority = anchorWallet.publicKey;

  try {
    const timestamp = new BN(Date.now()); // Generate timestamp *before* PDA derivation
    const [evidenceLogPDA] = await getEvidenceLogPDA(evidencePDA, timestamp);
    const [userAccessPDA] = await getUserAccessPDA(authority); // Caller's access record

    const txSignature = await program.methods
      .addEvidenceLog(timestamp, action, handler, notes)
      .accounts({
        evidence: evidencePDA,
        evidenceLog: evidenceLogPDA,
        userAccess: userAccessPDA,
        authority: authority,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log('Added evidence log:', txSignature);
    return evidenceLogPDA;
  } catch (error) {
    console.error('Error adding evidence log:', error);

    return null;
  }
};

// --- Getter Functions ---

/** Fetches the list of SceneLog PDAs for a given CrimeScene */
export const getCrimeSceneLogs = async (
  anchorWallet: AnchorWallet,
  crimeScenePDA: PublicKey
): Promise<PublicKey[] | null> => {
   if (!anchorWallet?.publicKey) {
    console.error('Wallet not connected');
    return null;
  }
  const program = getProgram(anchorWallet);
  try {
    // Use .view() for read-only RPC calls if available and appropriate
    // If .view() isn't suitable or the method isn't marked view, fetch the account
    const crimeSceneAccount = await program.account.crimeScene.fetch(crimeScenePDA);
    return (crimeSceneAccount as any).sceneLogs; // Return the vector directly
  } catch (error) {
    console.error('Error fetching crime scene logs:', error);
    return null;
  }
};

/** Fetches the list of Evidence PDAs for a given CrimeScene */
export const getCrimeSceneEvidence = async (
  anchorWallet: AnchorWallet,
  crimeScenePDA: PublicKey
): Promise<PublicKey[] | null> => {
    if (!anchorWallet?.publicKey) {
     console.error('Wallet not connected');
     return null;
   }
   const program = getProgram(anchorWallet);
   try {
     const crimeSceneAccount = await program.account.crimeScene.fetch(crimeScenePDA);
     return (crimeSceneAccount as any).evidenceItems; // Return the vector directly
   } catch (error) {
     console.error('Error fetching crime scene evidence:', error);
     return null;
   }
};

/** Fetches the list of EvidenceLog PDAs for a given Evidence item */
export const getEvidenceLogs = async (
  anchorWallet: AnchorWallet,
  evidencePDA: PublicKey
): Promise<PublicKey[] | null> => {
    if (!anchorWallet?.publicKey) {
     console.error('Wallet not connected');
     return null;
   }
   const program = getProgram(anchorWallet);
   try {
     const evidenceAccount = await program.account.evidence.fetch(evidencePDA);
     return (evidenceAccount as any).evidenceLogs; // Return the vector directly
   } catch (error) {
     console.error('Error fetching evidence logs:', error);
     return null;
   }
};


// --- Fetch All Crime Scenes (with corrections and caveats) ---

// Define a type for the decoded CrimeScene account for clarity
type DecodedCrimeSceneAccount = {
  publicKey: PublicKey;
  account: CrimeScene;
}



// --- Function to Fetch and Decode a Specific Account ---
// Useful for getting details after retrieving PDAs from getter functions

export const fetchCrimeSceneData = async (anchorWallet: AnchorWallet, pda: PublicKey): Promise<CrimeScene | null> => {
  const program = getProgram(anchorWallet);
  try {
    let account = await program.account.crimeScene.fetch(pda);
    return account as any
  } catch (error) {
    console.error(`Error fetching CrimeScene ${pda.toBase58()}:`, error);
    return null;
  }
}

export const fetchEvidenceData = async (anchorWallet: AnchorWallet, pda: PublicKey): Promise<Evidence | null> => {
  const program = getProgram(anchorWallet);
  try {
    let account = await program.account.evidence.fetch(pda);
    return account as any
  } catch (error) {
    console.error(`Error fetching Evidence ${pda.toBase58()}:`, error);
    return null;
  }
}

export const fetchSceneLogData = async (anchorWallet: AnchorWallet, pda: PublicKey): Promise<SceneLog | null> => {
  const program = getProgram(anchorWallet);
  try {
    let account = await program.account.sceneLog.fetch(pda);
    return account as any
  } catch (error) {
    console.error(`Error fetching SceneLog ${pda.toBase58()}:`, error);
    return null;
  }
}

export const fetchEvidenceLogData = async (anchorWallet: AnchorWallet, pda: PublicKey): Promise<EvidenceLog | null> => {
  const program = getProgram(anchorWallet);
  try {
    let account = await program.account.evidenceLog.fetch(pda);
    return account as any
  } catch (error) {
    console.error(`Error fetching EvidenceLog ${pda.toBase58()}:`, error);
    return null;
  }
}

export const fetchAccessControlData = async (anchorWallet: AnchorWallet, pda: PublicKey): Promise<AccessControl | null> => {
  const program = getProgram(anchorWallet);
  try {
    // Ensure your IDL has "AccessControl" defined correctly as an account type
    let account = await program.account.accessControl.fetch(pda);
    return account as any
  } catch (error) {
    console.error(`Error fetching AccessControl ${pda.toBase58()}:`, error);
    return null;
  }
}



export const getCrimeScenes = async (anchorWallet: any): Promise<any[]> => {
  if (!anchorWallet?.publicKey) return [];

  const connection = new Connection("https://devnet.helius-rpc.com/?api-key=dd0e8d2e-6413-4782-9cd7-d1e6c287b6ec", "confirmed");
  const pubkey = anchorWallet.publicKey.toBase58();
  const results: any[] = [];

    try {
      const accounts = await connection.getProgramAccounts(
        PROGRAM_ID,
        {
          filters: [
            {
              memcmp: {
                offset:46,
                bytes: pubkey,
              },
            },
          ],
        }
      );

      const coder = new BorshAccountsCoder(idl as Idl);

      const decoded = accounts.map((account) => {
        const decodedData = coder.decode("crimeScene", account.account.data);

        return {
          id: account.pubkey.toBase58(),
          location: decodedData.location,
          caseId: decodedData.case_id,
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
        };
      });

      results.push(...decoded);
    } catch (error) {
      console.error(`Error fetching at offset :`, error);
    }

  return results;
};


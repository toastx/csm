import { PublicKey, SystemProgram } from '@solana/web3.js';
import { BN, Program, AnchorProvider, Idl } from '@project-serum/anchor';

import idl from "../idl/evidence_management.json";


const PROGRAM_ID = new PublicKey("Your_Program_ID_Here");
const provider = AnchorProvider.env();
const program = new Program(idl as Idl, PROGRAM_ID, provider);

// Types
export interface CrimeScene {
  caseId: string;
  location: string;
  logCount: number;
  evidenceCount: number;
  authority: PublicKey;
}

export interface Evidence {
  crimeScene: PublicKey;
  evidenceId: string;
  description: string;
  locationFound: string;
  logCount: number;
  evidenceNumber: number;
}

export interface SceneLog {
  crimeScene: PublicKey;
  timestamp: number;
  description: string;
  officerId: string;
  logNumber: number;
}

export interface EvidenceLog {
  evidence: PublicKey;
  timestamp: number;
  action: string;
  handler: string;
  notes: string;
  logNumber: number;
}


export const initializeAccessControl = async (
  authority: PublicKey
): Promise<boolean> => {
  try {
    const accessControlPDA = await getAccessControlPDA(authority);

    await program.methods
      .initializeAccessControl()
      .accounts({
        accessControl: accessControlPDA,
        authority,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    return true;
  } catch (error) {
    console.error('Error initializing access control:', error);
    return false;
  }
};

export const grantAccess = async (
  authority: PublicKey,
  walletToGrant: PublicKey
): Promise<boolean> => {
  try {
    await program.methods
      .grantAccess(walletToGrant)
      .accounts({
        accessControl: await getAccessControlPDA(walletToGrant),
        adminAccess: await getAccessControlPDA(authority),
        wallet: walletToGrant,
        authority,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    return true;
  } catch (error) {
    console.error('Error granting access:', error);
    return false;
  }
};


export const initializeCrimeScene = async (
  authority: PublicKey,
  caseId: string,
  location: string
): Promise<PublicKey | null> => {
  try {
    const crimeScenePDA = await getCrimeScenePDA(caseId);

    await program.methods
      .initializeCrimeScene(caseId, location)
      .accounts({
        crimeScene: crimeScenePDA,
        userAccess: await getAccessControlPDA(authority),
        authority,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    return crimeScenePDA;
  } catch (error) {
    console.error('Error initializing crime scene:', error);
    return null;
  }
};

export const addSceneLog = async (
  authority: PublicKey,
  crimeScenePDA: PublicKey,
  description: string,
  officerId: string
): Promise<boolean> => {
  try {
    const timestamp = new BN(Date.now());
    const sceneLogPDA = await getSceneLogPDA(crimeScenePDA, timestamp);

    await program.methods
      .addSceneLog(timestamp, description, officerId)
      .accounts({
        crimeScene: crimeScenePDA,
        sceneLog: sceneLogPDA,
        userAccess: await getAccessControlPDA(authority),
        authority,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    return true;
  } catch (error) {
    console.error('Error adding scene log:', error);
    return false;
  }
};

// Functions for evidence management
export const addEvidence = async (
  authority: PublicKey,
  crimeScenePDA: PublicKey,
  evidenceId: string,
  description: string,
  locationFound: string
): Promise<PublicKey | null> => {
  try {
    const evidencePDA = await getEvidencePDA(crimeScenePDA, evidenceId);

    await program.methods
      .addEvidence(evidenceId, description, locationFound)
      .accounts({
        crimeScene: crimeScenePDA,
        evidence: evidencePDA,
        userAccess: await getAccessControlPDA(authority),
        authority,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    return evidencePDA;
  } catch (error) {
    console.error('Error adding evidence:', error);
    return null;
  }
};

export const addEvidenceLog = async (
  authority: PublicKey,
  evidencePDA: PublicKey,
  action: string,
  handler: string,
  notes: string
): Promise<boolean> => {
  try {
    const timestamp = new BN(Date.now());
    const evidenceLogPDA = await getEvidenceLogPDA(evidencePDA, timestamp);

    await program.methods
      .addEvidenceLog(timestamp, action, handler, notes)
      .accounts({
        evidence: evidencePDA,
        evidenceLog: evidenceLogPDA,
        userAccess: await getAccessControlPDA(authority),
        authority,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    return true;
  } catch (error) {
    console.error('Error adding evidence log:', error);
    return false;
  }
};

// Helper function to get PDAs (Program Derived Addresses)
export const getAccessControlPDA = async (wallet: PublicKey): Promise<PublicKey> => {
  const [pda] = await PublicKey.findProgramAddress(
    [Buffer.from('access_control'), wallet.toBuffer()],
    program.programId
  );
  return pda;
};

export const getCrimeScenePDA = async (caseId: string): Promise<PublicKey> => {
  const [pda] = await PublicKey.findProgramAddress(
    [Buffer.from('crime_scene'), Buffer.from(caseId)],
    program.programId
  );
  return pda;
};

export const getSceneLogPDA = async (crimeScene: PublicKey, timestamp: BN): Promise<PublicKey> => {
  const [pda] = await PublicKey.findProgramAddress(
    [Buffer.from('scene_log'), crimeScene.toBuffer(), timestamp.toArrayLike(Buffer)],
    program.programId
  );
  return pda;
};

export const getEvidencePDA = async (crimeScene: PublicKey, evidenceId: string): Promise<PublicKey> => {
  const [pda] = await PublicKey.findProgramAddress(
    [Buffer.from('evidence'), crimeScene.toBuffer(), Buffer.from(evidenceId)],
    program.programId
  );
  return pda;
};

export const getEvidenceLogPDA = async (evidence: PublicKey, timestamp: BN): Promise<PublicKey> => {
  const [pda] = await PublicKey.findProgramAddress(
    [Buffer.from('evidence_log'), evidence.toBuffer(), timestamp.toArrayLike(Buffer)],
    program.programId
  );
  return pda;
};

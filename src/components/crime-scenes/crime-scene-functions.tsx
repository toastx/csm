'use client'
import { clusterApiUrl, Connection, Keypair, PublicKey, SystemProgram, Transaction, VersionedTransaction } from '@solana/web3.js';
import { BN, Program, AnchorProvider, Idl } from '@project-serum/anchor';
import idl from "../idl/evidence_management.json";
import { AnchorWallet, useAnchorWallet } from "@solana/wallet-adapter-react";

const PROGRAM_ID = new PublicKey("64AzKjj5yYeW7dTiMSSSw2DLABy26YEgHout3KJPdQDk");
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
    authority: PublicKey,
    anchorWallet:AnchorWallet
): Promise<boolean> => {

    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const provider = new AnchorProvider(connection, anchorWallet, { commitment: 'confirmed' });
    const program = new Program(idl as Idl, PROGRAM_ID, provider);
  try {
    const accessControlPDA = await getAccessControlPDA(authority, anchorWallet);

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
    walletToGrant: PublicKey,
    anchorWallet:AnchorWallet
): Promise<boolean> => {

    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const provider = new AnchorProvider(connection, anchorWallet, { commitment: 'confirmed' });
    const program = new Program(idl as Idl, PROGRAM_ID, provider);
  const adminAccessPDA = await getAccessControlPDA(authority, anchorWallet);
  const accessControlPDA = await grantAccessControlPDA(authority, anchorWallet);
  try {
    await program.methods
      .grantAccess(walletToGrant)
      .accounts({
        accessControl: accessControlPDA,
        adminAccess: adminAccessPDA,
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
location: string,
  wallet:AnchorWallet
  
): Promise<PublicKey | null> => {
    console.log(authority.toString())
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
    const program = new Program(idl as Idl, PROGRAM_ID, provider);
    try {
        const userAccessPDA = await grantAccessControlPDA(wallet.publicKey, wallet);
        const userAccessAccount = await program.account.accessControl.fetchNullable(userAccessPDA);
    
        // If the userAccess account doesn't exist, initialize it
        if (!userAccessAccount) {
      await initializeAccessControl(authority, wallet);
        }

      const crimeScenePDA = await getCrimeScenePDA(caseId, wallet);
    console.log(crimeScenePDA.toString())

    await program.methods
      .initializeCrimeScene(caseId, location)
      .accounts({
        crimeScene: crimeScenePDA,
        userAccess: await getAccessControlPDA(authority, wallet),
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
    officerId: string,
    anchorWallet:AnchorWallet
): Promise<boolean> => {


    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const provider = new AnchorProvider(connection, anchorWallet, { commitment: 'confirmed' });
    const program = new Program(idl as Idl, PROGRAM_ID, provider);
  try {
    const timestamp = new BN(Date.now());
    const sceneLogPDA = await getSceneLogPDA(
      crimeScenePDA,
      timestamp,
      anchorWallet
    );

    await program.methods
      .addSceneLog(timestamp, description, officerId)
      .accounts({
        crimeScene: crimeScenePDA,
        sceneLog: sceneLogPDA,
        userAccess: await getAccessControlPDA(authority, anchorWallet),
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
locationFound: string,
anchorWallet:AnchorWallet
): Promise<PublicKey | null> => {
    

    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const provider = new AnchorProvider(connection, anchorWallet, { commitment: 'confirmed' });
    const program = new Program(idl as Idl, PROGRAM_ID, provider);
  try {
    const evidencePDA = await getEvidencePDA(
      crimeScenePDA,
      evidenceId,
      anchorWallet
    );
    const userAccessPDA = await getAccessControlPDA(anchorWallet.publicKey, anchorWallet);
    const userAccessAccount = await program.account.accessControl.fetchNullable(userAccessPDA);
        if (!userAccessAccount) {
      await initializeAccessControl(authority, anchorWallet);
        }
    
    await program.methods
      .addEvidence(evidenceId, description, locationFound)
      .accounts({
        crimeScene: crimeScenePDA,
        evidence: evidencePDA,
        userAccess: userAccessPDA,
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
    notes: string,
    anchorWallet:AnchorWallet
): Promise<boolean> => {
 

    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const provider = new AnchorProvider(connection, anchorWallet, { commitment: 'confirmed' });
    const program = new Program(idl as Idl, PROGRAM_ID, provider);
  try {
    const timestamp = new BN(Date.now());
    const evidenceLogPDA = await getEvidenceLogPDA(evidencePDA, timestamp,anchorWallet);

    await program.methods
      .addEvidenceLog(timestamp, action, handler, notes)
      .accounts({
        evidence: evidencePDA,
        evidenceLog: evidenceLogPDA,
        userAccess: await getAccessControlPDA(authority, anchorWallet),
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
export const getAccessControlPDA = async (wallet: PublicKey,anchorWallet:AnchorWallet): Promise<PublicKey> => {
    
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const provider = new AnchorProvider(connection, anchorWallet, { commitment: 'confirmed' });
    const program = new Program(idl as Idl, PROGRAM_ID, provider);

    const seeds = [Buffer.from('access-control'), wallet.toBuffer()];

  
    const [pda] = await PublicKey.findProgramAddress(seeds, program.programId);
 

  return pda;
};

export const grantAccessControlPDA = async (wallet: PublicKey,anchorWallet:AnchorWallet): Promise<PublicKey> => {
    
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const provider = new AnchorProvider(connection, anchorWallet, { commitment: 'confirmed' });
    const program = new Program(idl as Idl, PROGRAM_ID, provider);

    const seeds = [Buffer.from('user-access'), wallet.toBuffer()];
    const [pda] = await PublicKey.findProgramAddress(seeds, program.programId);
  return pda;
};

export const getCrimeScenePDA = async (caseId: string,anchorWallet:AnchorWallet): Promise<PublicKey> => {

    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const provider = new AnchorProvider(connection, anchorWallet, { commitment: 'confirmed' });
    const program = new Program(idl as Idl, PROGRAM_ID, provider);
  const [pda] = await PublicKey.findProgramAddress(
    [Buffer.from('crime-scene'), Buffer.from(caseId)],
    program.programId
  );
  return pda;
};

export const getSceneLogPDA = async (crimeScene: PublicKey, timestamp: BN,anchorWallet:AnchorWallet): Promise<PublicKey> => {
    
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const provider = new AnchorProvider(connection, anchorWallet, { commitment: 'confirmed' });
    const program = new Program(idl as Idl, PROGRAM_ID, provider);
   const [pda] = await PublicKey.findProgramAddress(
    [Buffer.from('scene_log'), crimeScene.toBuffer(), timestamp.toArrayLike(Buffer)],
    program.programId
  );
  return pda;
};

export const getEvidencePDA = async (crimeScene: PublicKey, evidenceId: string,anchorWallet:AnchorWallet): Promise<PublicKey> => {

    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const provider = new AnchorProvider(connection, anchorWallet, { commitment: 'confirmed' });
  const program = new Program(idl as Idl, PROGRAM_ID, provider);
  const seeds = [
    Buffer.from("evidence"),
    crimeScene.toBuffer(),
    Buffer.from(evidenceId),
];
  console.log('Seeds:', seeds);

  const [pda] = await PublicKey.findProgramAddress(seeds, program.programId);
  console.log('Derived PDA:', pda.toBase58());

  return pda;
};

export const getEvidenceLogPDA = async (evidence: PublicKey, timestamp: BN,anchorWallet:AnchorWallet): Promise<PublicKey> => {

    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const provider = new AnchorProvider(connection, anchorWallet, { commitment: 'confirmed' });
    const program = new Program(idl as Idl, PROGRAM_ID, provider);
    const [pda] = await PublicKey.findProgramAddress(
    [Buffer.from('evidence_log'), evidence.toBuffer(), timestamp.toArrayLike(Buffer)],
    program.programId
  );
  return pda;
};

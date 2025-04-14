import { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useWallet, useAnchorWallet } from '@solana/wallet-adapter-react';
// Assuming these functions in 'crime-scene-functions.ts' are updated
// to handle the new arguments and the 'user_access' PDA requirement.
import { initializeCrimeScene, addEvidence } from './crime-scene-functions';

/**
 * Hook for creating new crime scenes on the Solana blockchain.
 * Relies on the user having access granted via the access control mechanism.
 */
export function useCrimeScene() {
  // Removed 'wallet' hook as anchorWallet provides both signer and publicKey
  // const { wallet } = useWallet(); // Keep if you need wallet state apart from signing
  const anchorWallet = useAnchorWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Creates a new crime scene account.
   * @param location - The location description of the crime scene.
   * @returns The PublicKey of the newly created crime scene PDA.
   * @throws Error if the wallet is not connected or access is denied by the program.
   */
  const createCrimeScene = async (location: string): Promise<PublicKey> => {
    // Use anchorWallet directly for publicKey check and signing
    if (!anchorWallet?.publicKey) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      const caseId = Math.random().toString(36).substr(2, 9); // Generate a random case ID (consider a more robust method if needed)

      // Call the updated initializeCrimeScene function.
      // This function (in crime-scene-functions.ts) MUST now handle deriving
      // the user_access PDA and including it in the transaction accounts.
      // It also needs the anchorWallet for signing.
      const crimeScenePDA = await initializeCrimeScene(
        anchorWallet, // authority
        caseId,
        location,
         // Pass the anchorWallet for signing and potentially deriving PDAs
      );
      return crimeScenePDA;
    } catch (err) {
      console.error('Error creating crime scene:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      // Try to parse AnchorError for more specific messages if possible
      // Example: if (err.toString().includes("Unauthorized")) setError("Access denied.");
      setError(`Failed to create crime scene: ${errorMessage}`);
      throw err; // Re-throw the error for the caller to handle if needed
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createCrimeScene,
    isLoading,
    error,
  };
}

/**
 * Hook for adding evidence to an existing crime scene.
 * Relies on the user having access granted via the access control mechanism.
 */
export function useEvidence() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const anchorWallet = useAnchorWallet();

  /**
   * Adds a new evidence item to a specific crime scene.
   * @param crimeScenePDA - The PublicKey of the crime scene account.
   * @param description - A description of the evidence.
   * @param locationFound - Where the evidence was found at the scene.
   * @returns The PublicKey of the newly created evidence PDA, or null if an error occurred.
   * @throws Error if the wallet is not connected or access is denied by the program.
   */
  const addNewEvidence = async (
    crimeScenePDA: PublicKey,
    description: string, // Changed from metadata
    locationFound: string // Changed from ipfsHash and hardcoded string
  ): Promise<PublicKey | null> => { // Return type remains PublicKey | null for consistency
    setIsLoading(true);
    setError(null);

    if (!anchorWallet?.publicKey) {
        // It's often better to throw here so the calling component knows immediately
        setError('Wallet not connected');
        setIsLoading(false);
        throw new Error('Wallet not connected');
        // return null; // Or return null if preferred
    }

    try {
      const authority = anchorWallet.publicKey;
      const evidenceId = Math.random().toString(36).substr(2, 9); // Generate a random evidence ID

      // Call the updated addEvidence function.
      // This function (in crime-scene-functions.ts) MUST now handle deriving
      // the user_access PDA and including it in the transaction accounts.
      // It also needs the anchorWallet for signing.
      const evidencePDA = await addEvidence(
        anchorWallet,
        crimeScenePDA,
        evidenceId,
        description,    // Pass the new argument
        locationFound,  // Pass the new argument
            // Pass the anchorWallet for signing and potentially deriving PDAs
      );

      return evidencePDA;
    } catch (err) {
      console.error('Error adding evidence:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
       // Try to parse AnchorError for more specific messages if possible
      // Example: if (err.toString().includes("Unauthorized")) setError("Access denied.");
      setError(`Failed to add evidence: ${errorMessage}`);
      // Decide whether to return null or re-throw based on how you want calling components to handle errors
      // return null;
       throw err; // Re-throwing might be better for UI feedback
    } finally {
      setIsLoading(false);
    }
  };

  return { addNewEvidence, isLoading, error };
}
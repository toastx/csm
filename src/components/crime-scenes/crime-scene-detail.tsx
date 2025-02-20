import { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useWallet, useAnchorWallet } from '@solana/wallet-adapter-react';
import { initializeCrimeScene, addEvidence } from './crime-scene-functions';

export function useCrimeScene() {
    const { wallet } = useWallet();
    const anchorWallet = useAnchorWallet()
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCrimeScene = async (location: string) => {
    if (!wallet?.adapter?.publicKey) {
      throw new Error('Wallet not connected');
    }
    if (!anchorWallet) {
      throw new Error("Anchor wallet not connected");
    }

    setIsLoading(true);
    setError(null);

      try {
      const caseId = Math.random().toString(36).substr(2, 9); // Generate a random case ID
      const crimeScenePDA = await initializeCrimeScene(wallet.adapter.publicKey, caseId, location,anchorWallet);
      return crimeScenePDA;
    } catch (error) {
      console.error('Error creating crime scene:', error);
      setError('An error occurred while creating the crime scene.');
      throw error;
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
export function useEvidence() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const anchorWallet = useAnchorWallet();

  const addNewEvidence = async (
    crimeScenePDA: PublicKey,
    ipfsHash: string,
    metadata: string
  ): Promise<PublicKey | null> => {
    setIsLoading(true);
    setError(null);

    try {
      if (!anchorWallet) {
        throw new Error('Wallet not connected');
      }

      const authority = anchorWallet.publicKey;
      const evidenceId = Math.random().toString(36).substr(2, 9); // Generate a random evidence ID

      const evidencePDA = await addEvidence(
        authority,
        crimeScenePDA,
        evidenceId,
        metadata,
        "Location Found", // Replace with actual location found
        anchorWallet
      );

      return evidencePDA;
    } catch (error) {
      console.error('Error adding evidence:', error);
      setError('An error occurred while adding evidence.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { addNewEvidence, isLoading, error };
}

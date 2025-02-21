'use client';

import React, { useEffect, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useCrimeScene,useEvidence } from './crime-scene-detail';
import { getCrimeScenes, getEvidencePDA } from './crime-scene-functions';
import { useWallet } from '@solana/wallet-adapter-react';

interface CrimeScene {
  id: string;
  location: string;
  createdAt: string;
  lastUpdated: string;
}

interface Evidence {
  id: string;
  ipfsHash: string;
  metadata: string;
  createdAt: string;
}

interface FullEvidence extends Evidence {
  additionalData: string; // Additional data retrieved from the smart contract
}

export function CrimeScenesFeature() {
  const [selectedScene, setSelectedScene] = useState<CrimeScene | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<FullEvidence | null>(null);
  const [scenes, setScenes] = useState<CrimeScene[]>([]);
  const [isCreateSceneModalOpen, setIsCreateSceneModalOpen] = useState(false);
  const { createCrimeScene, isLoading: isSceneLoading, error: sceneError } = useCrimeScene();
  const { addNewEvidence, isLoading: isEvidenceLoading, error: evidenceError } = useEvidence();
  const [loading, setLoading] = useState<boolean>(true);
  const wallet = useWallet();
  
    useEffect(() => {
      if (wallet.publicKey) {
        setLoading(true);
        getCrimeScenes(wallet)
          .then(setScenes)
          .finally(() => setLoading(false));
      }
    }, [wallet.publicKey]);
  
  const handleCreateCrimeScene = async (location: string) => {
    try {
      const crimeScenePDA = await createCrimeScene(location);
      console.log("Crime scene created:", crimeScenePDA);

      if (crimeScenePDA) {
        const newScene: CrimeScene = {
          id: crimeScenePDA.toString(),
          location,
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        };
        setScenes([...scenes, newScene]);
        setIsCreateSceneModalOpen(false);
      }
    } catch (error) {
      console.error('Error creating crime scene:', error);
    }
  };

  if (selectedEvidence) {
    return <EvidenceDetail evidence={selectedEvidence} onBack={() => setSelectedEvidence(null)} />;
  }

  if (selectedScene) {
    return (
      <CrimeSceneDetail 
        scene={selectedScene} 
        onBack={() => setSelectedScene(null)} 
        onSelectEvidence={setSelectedEvidence} 
        onCreateEvidence={async (ipfsHash, metadata) => {
          try {
            const crimeScenePDA = new PublicKey(selectedScene.id);
            const evidencePDA = await addNewEvidence(crimeScenePDA, ipfsHash, metadata);

            if (evidencePDA) {
              const newEvidence: Evidence = {
                id: evidencePDA.toString(),
                ipfsHash,
                metadata,
                createdAt: new Date().toISOString()
              };
              console.log('New Evidence:', newEvidence);
            }
          } catch (error) {
            console.error('Error adding evidence:', error);
          }
        }}
      />
    );
  }

  return (
    <section id="crime-scenes" className="container mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-4 text-gray-900">Crime Scenes</h2>
      {sceneError && <p className="text-red-500 mb-4">{sceneError}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {scenes.map((scene) => (
          <div key={scene.id} className="bg-white border border-gray-300 rounded-lg shadow-md p-6 transition-transform transform hover:-translate-y-1 hover:shadow-lg">
            <h3 className="text-xl font-medium text-gray-800 mb-2">Scene ID: {scene.id}</h3>
            <p className="text-gray-600"><strong>Location:</strong> {scene.location}</p>
            <p className="text-gray-600"><strong>Created At:</strong> {scene.createdAt}</p>
            <p className="text-gray-600"><strong>Last Updated:</strong> {scene.lastUpdated}</p>
            <button 
              onClick={() => setSelectedScene(scene)} 
              className="mt-4 bg-gray-900 text-white px-4 py-2 rounded-md transition hover:bg-gray-700">
              More Details
            </button>
          </div>
        ))}
      </div>

      <button 
        onClick={() => setIsCreateSceneModalOpen(true)} 
        className="mt-6 bg-green-600 text-white px-4 py-2 rounded-md transition hover:bg-green-500">
        Create New Crime Scene
      </button>

      {/* Modal for creating a new crime scene */}
      {isCreateSceneModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Create New Crime Scene</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const location = (e.target as HTMLFormElement).location.value;
                if (location) {
                  await handleCreateCrimeScene(location);
                }
              }}
            >
              <div className="mb-4">
                <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location</label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateSceneModalOpen(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded-md transition hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSceneLoading}
                  className="bg-green-600 text-white px-4 py-2 rounded-md transition hover:bg-green-500 disabled:bg-gray-400"
                >
                  {isSceneLoading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

function CrimeSceneDetail({ scene, onBack, onSelectEvidence, onCreateEvidence }: { 
  scene: CrimeScene; 
  onBack: () => void; 
  onSelectEvidence: (evidence: FullEvidence) => void;
  onCreateEvidence: (ipfsHash: string, metadata: string) => void;
}) {
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [isCreateEvidenceModalOpen, setIsCreateEvidenceModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addNewEvidence, isLoading: isEvidenceLoading, error: evidenceError } = useEvidence();

  const handleEvidenceClick = async (item: Evidence) => {
    const fullEvidence = await fetchEvidenceData(item);
    onSelectEvidence(fullEvidence);
  };

  const handleCreateEvidence = async (ipfsHash: string, metadata: string) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log(scene.id)
      const evidencePDA = await addNewEvidence(new PublicKey(scene.id), ipfsHash, metadata);

        const newEvidence: Evidence = {
          id: Math.random().toString(36).substr(2, 9), // Generate a random ID
          ipfsHash,
          metadata,
          createdAt: new Date().toISOString(),
        };
        setEvidence([...evidence, newEvidence]);
        setIsCreateEvidenceModalOpen(false);
      
    } catch (error) {
      console.error('Error creating evidence:', error);
      setError('An error occurred while creating evidence.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <button 
        onClick={onBack} 
        className="bg-gray-500 text-white px-4 py-2 rounded mb-4 transition hover:bg-gray-700">
        Back
      </button>
      <div className="bg-white border border-gray-300 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Crime Scene ID: {scene.id}</h2>
        <p className="text-gray-700"><strong>Location:</strong> {scene.location}</p>
        <p className="text-gray-700"><strong>Created At:</strong> {scene.createdAt}</p>
        <p className="text-gray-700"><strong>Last Updated:</strong> {scene.lastUpdated}</p>
      </div>
      
      <h3 className="text-xl font-semibold text-gray-900 mt-6">Evidence</h3>
      <button 
        onClick={() => setIsCreateEvidenceModalOpen(true)} 
        className="mt-4 bg-green-600 text-white px-4 py-2 rounded-md transition hover:bg-green-500">
        Add New Evidence
      </button>
      {error && <p className="text-red-500 mt-4">{error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        {evidence.map(item => (
          <div key={item.id} className="bg-white border border-gray-300 rounded-lg shadow-md p-6 transition-transform transform hover:-translate-y-1 hover:shadow-lg">
            <h4 className="text-lg font-medium text-gray-800 mb-2">Evidence ID: {item.id}</h4>
            <p className="text-gray-600"><strong>IPFS Hash:</strong> {item.ipfsHash}</p>
            <p className="text-gray-600"><strong>Metadata:</strong> {item.metadata}</p>
            <p className="text-gray-600"><strong>Created At:</strong> {item.createdAt}</p>
            <button 
              onClick={() => handleEvidenceClick(item)} 
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md transition hover:bg-blue-500">
              View Details
            </button>
          </div>
        ))}
      </div>

      {/* Modal for creating new evidence */}
      {isCreateEvidenceModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Add New Evidence</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const ipfsHash = (e.target as HTMLFormElement).ipfsHash.value;
                const metadata = (e.target as HTMLFormElement).metadata.value;
                if (ipfsHash && metadata) {
                  await handleCreateEvidence(ipfsHash, metadata);
                }
              }}
            >
              <div className="mb-4">
                <label htmlFor="ipfsHash" className="block text-sm font-medium text-gray-700">IPFS Hash</label>
                <input
                  type="text"
                  id="ipfsHash"
                  name="ipfsHash"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="metadata" className="block text-sm font-medium text-gray-700">Metadata</label>
                <input
                  type="text"
                  id="metadata"
                  name="metadata"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateEvidenceModalOpen(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded-md transition hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-green-600 text-white px-4 py-2 rounded-md transition hover:bg-green-500 disabled:bg-gray-400"
                >
                  {isLoading ? 'Adding...' : 'Add Evidence'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function EvidenceDetail({ evidence, onBack }: { evidence: FullEvidence; onBack: () => void }) {
  return (
    <div className="container mx-auto p-6">
      <button 
        onClick={onBack} 
        className="bg-gray-500 text-white px-4 py-2 rounded mb-4 transition hover:bg-gray-700">
        Back
      </button>
      <div className="bg-white border border-gray-300 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Evidence ID: {evidence.id}</h2>
        <p className="text-gray-600"><strong>IPFS Hash:</strong> {evidence.ipfsHash}</p>
        <p className="text-gray-600"><strong>Metadata:</strong> {evidence.metadata}</p>
        <p className="text-gray-600"><strong>Created At:</strong> {evidence.createdAt}</p>
        <p className="text-gray-600"><strong>Additional Data:</strong> {evidence.additionalData}</p>
      </div>
    </div>
  );
}

async function fetchEvidenceData(evidence: Evidence): Promise<FullEvidence> {
  // Simulate fetching additional data from the smart contract
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({ ...evidence, additionalData: 'Blockchain verified authenticity' });
    }, 1000);
  });
}
'use client';

import React, { useState } from 'react';

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
  const [scenes, setScenes] = useState<CrimeScene[]>([
    { id: '12345', location: 'Downtown', createdAt: '2025-01-01', lastUpdated: '2025-01-10' },
    { id: '67890', location: 'Midtown', createdAt: '2025-01-05', lastUpdated: '2025-01-08' }
  ]);

  const handleCreateCrimeScene = (location: string) => {
    const newScene: CrimeScene = {
      id: Math.random().toString(36).substr(2, 9), // Generate a random ID
      location,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
    setScenes([...scenes, newScene]);
  };

  if (selectedEvidence) {
    return <EvidenceDetail evidence={selectedEvidence} onBack={() => setSelectedEvidence(null)} />;
  }

  if (selectedScene) {
    return <CrimeSceneDetail 
      scene={selectedScene} 
      onBack={() => setSelectedScene(null)} 
      onSelectEvidence={setSelectedEvidence} 
      onCreateEvidence={(ipfsHash, metadata) => {
        const newEvidence: Evidence = {
          id: Math.random().toString(36).substr(2, 9), // Generate a random ID
          ipfsHash,
          metadata,
          createdAt: new Date().toISOString()
        };
        // Update the selected scene with the new evidence
        setSelectedScene({
          ...selectedScene,
          lastUpdated: new Date().toISOString()
        });
        // Simulate adding evidence to the scene (in a real app, this would be saved to a database or smart contract)
        console.log('New Evidence:', newEvidence);
      }}
    />;
  }

  return (
    <section id="crime-scenes" className="container mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-4 text-gray-900">Crime Scenes</h2>
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
        onClick={() => {
          const location = prompt('Enter the location of the new crime scene:');
          if (location) {
            handleCreateCrimeScene(location);
          }
        }} 
        className="mt-6 bg-green-600 text-white px-4 py-2 rounded-md transition hover:bg-green-500">
        Create New Crime Scene
      </button>
    </section>
  );
}

function CrimeSceneDetail({ scene, onBack, onSelectEvidence, onCreateEvidence }: { 
  scene: CrimeScene; 
  onBack: () => void; 
  onSelectEvidence: (evidence: FullEvidence) => void;
  onCreateEvidence: (ipfsHash: string, metadata: string) => void;
}) {
  const [evidence, setEvidence] = useState<Evidence[]>([
    { id: 'E123', ipfsHash: 'Qm1234567890abcdefgh', metadata: 'Drug evidence', createdAt: '2025-01-02' },
    { id: 'E124', ipfsHash: 'Qm9876543210hgfedcba', metadata: 'Photos', createdAt: '2025-01-03' }
  ]);

  const handleEvidenceClick = async (item: Evidence) => {
    const fullEvidence = await fetchEvidenceData(item);
    onSelectEvidence(fullEvidence);
  };

  const handleCreateEvidence = () => {
    const ipfsHash = prompt('Enter the IPFS hash of the evidence:');
    const metadata = prompt('Enter the metadata for the evidence:');
    if (ipfsHash && metadata) {
      onCreateEvidence(ipfsHash, metadata);
      const newEvidence: Evidence = {
        id: Math.random().toString(36).substr(2, 9), // Generate a random ID
        ipfsHash,
        metadata,
        createdAt: new Date().toISOString()
      };
      setEvidence([...evidence, newEvidence]);
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
        onClick={handleCreateEvidence} 
        className="mt-4 bg-green-600 text-white px-4 py-2 rounded-md transition hover:bg-green-500">
        Add New Evidence
      </button>
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
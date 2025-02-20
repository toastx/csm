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

export function CrimeScenesFeature() {
  const [selectedScene, setSelectedScene] = useState<CrimeScene | null>(null);

  const scenes: CrimeScene[] = [
    { id: "12345", location: "Downtown", createdAt: "2025-01-01", lastUpdated: "2025-01-10" },
    { id: "67890", location: "Midtown", createdAt: "2025-01-05", lastUpdated: "2025-01-08" }
  ];

  if (selectedScene) {
    return <CrimeSceneDetail scene={selectedScene} onBack={() => setSelectedScene(null)} />;
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
    </section>
  );
}

function CrimeSceneDetail({ scene, onBack }: { scene: CrimeScene; onBack: () => void }) {
  const evidence: Evidence[] = [
    { id: 'E123', ipfsHash: 'Qm1234567890abcdefgh', metadata: 'Drug evidence', createdAt: '2025-01-02' },
    { id: 'E124', ipfsHash: 'Qm9876543210hgfedcba', metadata: 'Photos', createdAt: '2025-01-03' }
  ];

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        {evidence.map(item => (
          <div key={item.id} className="bg-white border border-gray-300 rounded-lg shadow-md p-6 transition-transform transform hover:-translate-y-1 hover:shadow-lg">
            <h4 className="text-lg font-medium text-gray-800 mb-2">Evidence ID: {item.id}</h4>
            <p className="text-gray-600"><strong>IPFS Hash:</strong> {item.ipfsHash}</p>
            <p className="text-gray-600"><strong>Metadata:</strong> {item.metadata}</p>
            <p className="text-gray-600"><strong>Created At:</strong> {item.createdAt}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

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
    <section id="crime-scenes">
      <h2>Crime Scenes</h2>
      {scenes.map((scene) => (
        <div key={scene.id} className="crime-scene border p-4 mb-4">
          <h3>Scene ID: {scene.id}</h3>
          <p><strong>Location:</strong> {scene.location}</p>
          <p><strong>Created At:</strong> {scene.createdAt}</p>
          <p><strong>Last Updated:</strong> {scene.lastUpdated}</p>
          <button onClick={() => setSelectedScene(scene)} className="button bg-blue-500 text-white px-4 py-2 rounded">
            More Details
          </button>
        </div>
      ))}
    </section>
  );
}

function CrimeSceneDetail({ scene, onBack }: { scene: CrimeScene; onBack: () => void }) {
  const evidence: Evidence[] = [
    { id: 'E123', ipfsHash: 'Qm1234567890abcdefgh', metadata: 'Drug evidence', createdAt: '2025-01-02' },
    { id: 'E124', ipfsHash: 'Qm9876543210hgfedcba', metadata: 'Photos', createdAt: '2025-01-03' }
  ];

  return (
    <div>
      <button onClick={onBack} className="bg-gray-500 text-white px-4 py-2 rounded mb-4">Back</button>
      <h2>Crime Scene ID: {scene.id}</h2>
      <p><strong>Location:</strong> {scene.location}</p>
      <p><strong>Created At:</strong> {scene.createdAt}</p>
      <p><strong>Last Updated:</strong> {scene.lastUpdated}</p>
      <h3>Evidence</h3>
      {evidence.map(item => (
        <div key={item.id} className="evidence-item border p-4 mb-4">
          <h4>Evidence ID: {item.id}</h4>
          <p><strong>IPFS Hash:</strong> {item.ipfsHash}</p>
          <p><strong>Metadata:</strong> {item.metadata}</p>
          <p><strong>Created At:</strong> {item.createdAt}</p>
        </div>
      ))}
    </div>
  );
}

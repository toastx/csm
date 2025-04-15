'use client';

import React, { useEffect, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useCrimeScene,useEvidence } from './crime-scene-detail';
import { addEvidence, getCrimeScenePDA, getCrimeScenes, getEvidencePDA } from './crime-scene-functions';
import { useAnchorWallet, useWallet } from '@solana/wallet-adapter-react';
import { uploadFile } from '../ipfs/ipfs';
import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes';



interface CrimeScene {
  name: string;
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
  // Existing states to keep
  const [file, setFile] = useState<File>(new File([], ''));
const [image, setImage] = useState<string>('https://via.placeholder.com/300x300');
const [name, setName] = useState<string>('');
const [id, setId] = useState<string>('');

// Updated states for CrimeScene interface
const [location, setLocation] = useState<string>('');
const [createdAt, setCreatedAt] = useState<string>(new Date().toISOString().slice(0, 16));
const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString().slice(0, 16));

// Additional states
const [description, setDescription] = useState<string>('');

  const [ipfsHash, setIpfsHash] = useState<string>('');
const [isUploading, setIsUploading] = useState<boolean>(false);
  
    useEffect(() => {
      if (wallet.publicKey) {
        setLoading(true);
        getCrimeScenes(wallet)
          .then(setScenes)
          .finally(() => setLoading(false));
      }
    }, [wallet.publicKey]);
  
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setFile(file);
        console.log(typeof file)
        const reader = new FileReader();
        reader.onloadend = () => {
          setImage(reader.result as string);
        };
        reader.readAsDataURL(file); // Convert image file to base64 string
      }
    };
  
  const handleCreateCrimeScene = async (location: string) => {
    try {
      const crimeScenePDA = await createCrimeScene(location);
      console.log("Crime scene created:", crimeScenePDA);

      if (crimeScenePDA) {
        const newScene: CrimeScene = {
          name,
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
<div className="mint-page bg-gray-50 p-6 rounded-lg shadow-sm mb-4 max-h-[500px] overflow-y-auto">
  <div className="mint-container flex flex-col space-y-4">
    
    {/* Scene ID Input */}
    <input 
      type="text" 
      name="id"
      placeholder="Scene ID" 
      value={id}
      onChange={(e) => setId(e.target.value)}
      className="w-full p-3 text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    />

    {/* Name Input */}
    <input 
      type="text" 
      name="name"
      placeholder="Name" 
      value={name}
      onChange={(e) => setName(e.target.value)}
      className="w-full p-3 text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    />

    {/* Location Input */}
    <input 
      type="text" 
      name="location"
      placeholder="Location" 
      value={location}
      onChange={(e) => setLocation(e.target.value)}
      className="w-full p-3 text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    />
    
    {/* Created At Date Input */}
    <div className="flex flex-col">
      <label htmlFor="createdAt" className="mb-1 text-sm text-gray-600">Created At</label>
      <input 
        type="datetime-local"
        id="createdAt"
        name="createdAt"
        value={createdAt}
        onChange={(e) => setCreatedAt(e.target.value)}
        className="w-full p-3 text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>

    {/* Last Updated Date Input - Optional, can be auto-generated */}
    <div className="flex flex-col">
      <label htmlFor="lastUpdated" className="mb-1 text-sm text-gray-600">Last Updated</label>
      <input 
        type="datetime-local"
        id="lastUpdated"
        name="lastUpdated"
        disabled
        value={lastUpdated}
        className="w-full p-3 text-gray-700 bg-gray-100 border border-gray-300 rounded-md cursor-not-allowed"
      />
      <p className="text-xs text-gray-500 mt-1">This field will be auto-updated</p>
    </div>
    
    {/* Description - Shortened textarea with scroll */}
    <div className="flex flex-col">
      <label htmlFor="description" className="mb-1 text-sm text-gray-600">Description</label>
      <textarea
        id="description"
        name="description"
        placeholder="Additional Notes" 
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full p-3 text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none overflow-auto h-16"
      ></textarea>
    </div>

    {/* Image Upload */}
    <div className="space-y-2">
      <label className="block text-sm text-gray-600">Scene Photo</label>
      <div className="image-placeholder w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-100">
        <img src={image} alt="Scene Photo" className="max-w-full max-h-full object-contain" />
      </div>
      <input 
        type="file" 
        accept="image/*" 
        onChange={(e) => {
          const file = e.target.files?.[0];
            if (file) {
              setFile(file);
              console.log(typeof file)
              const reader = new FileReader();
              reader.onloadend = () => {
                setImage(reader.result as string);
              };
              reader.readAsDataURL(file); 
            }
        }}
        className="w-full p-2 text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
                  </div>
                  <div className="flex flex-col space-y-2">
          <button
                      onClick={
                        async () => {
                          let hash = await uploadFile(file)
                          setIpfsHash(hash)
                        }
                      }
            disabled={!file || isUploading}
            className="bg-blue-600 text-white py-1 px-4 rounded-md text-sm font-medium transition hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Uploading...' : 'Upload to IPFS'}
          </button>
          
          {ipfsHash && (
            <div className="flex items-center text-xs">
              <span className="text-gray-600 mr-1">IPFS Hash:</span>
              <span className="text-blue-600 font-mono overflow-hidden overflow-ellipsis">{ipfsHash}</span>
              <button 
                onClick={() => navigator.clipboard.writeText(ipfsHash)}
                className="ml-2 text-gray-500 hover:text-gray-700"
                title="Copy to clipboard"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          )}
        </div>
  </div>
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
  const wallet = useAnchorWallet()
  if (!wallet) {
    return null;
  }

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
          const formData = new FormData(e.target as HTMLFormElement);
          const metadata = formData.get('metadata') as string;
          const title = formData.get('title') as string;
          const description = formData.get('description') as string;
          const image = formData.get('image') as File;
          
          if (metadata && image.size > 0) {
            
            if (metadata && image.size > 0) {
              const reader = new FileReader();
          
              reader.onloadend = async () => {
                const imageUrl = reader.result as string;
          
                const fullMetadata = JSON.stringify({
                  title,
                  description,
                  metadata,
                  timestamp: new Date().toISOString(),
                  imageUrl, // base64 image string
                });
                
                let tx = addNewEvidence(new PublicKey("81bv3muG6ZAaxXvzJCDMCdWWatupP39tjztqwHSrEGmF"), description,title)
                await tx;
                console.log(tx)
                await handleCreateEvidence(imageUrl, fullMetadata);
                
              };
          
              reader.readAsDataURL(image);
              
            }
                }
          
        }}
      >
        <div className="mb-4">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
          <input
            type="text"
            id="title"
            name="title"
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Evidence title"
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="image" className="block text-sm font-medium text-gray-700">Image</label>
          <div className="mt-1 flex items-center">
            <input
              type="file"
              id="image"
              name="image"
              accept="image/*"
              required
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">Supported formats: JPG, PNG, GIF (max 5MB)</p>
        </div>
        
        <div className="mb-4">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            id="description"
            name="description"
            rows={3}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Describe this evidence"
          ></textarea>
        </div>
        
        <div className="mb-4">
          <label htmlFor="metadata" className="block text-sm font-medium text-gray-700">Additional Metadata</label>
          <input
            type="text"
            id="metadata"
            name="metadata"
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Location, date, tags, etc."
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
            {isLoading ? 'Uploading...' : 'Add Evidence'}
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
        
        <p className="text-gray-600"><strong>Metadata:</strong> {evidence.metadata}</p>
        <p className="text-gray-600"><strong>Created At:</strong> {evidence.createdAt}</p>
        <p className="text-gray-600"><strong>Additional Data:</strong> {evidence.additionalData}</p>
        <img src={evidence.ipfsHash} alt="Evidence" className="mt-4 rounded-lg shadow-md"></img>
      </div>
    </div>
  );
}

async function fetchEvidenceData(evidence: Evidence): Promise<FullEvidence> {
  // Simulate fetching additional data from the smart contract
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({ ...evidence, additionalData: '' });
    }, 1000);
  });
}
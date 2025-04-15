'use client'

import { useAnchorWallet } from "@solana/wallet-adapter-react"
import { useState } from "react"
import { grantAccess, initializeAccessControl } from "../crime-scenes/crime-scene-functions"
export function AccessControl() {
    const [walletAddress, setWalletAddress] = useState("")
    const [isAdminLoading, setIsAdminLoading] = useState(false)
    const [isGrantLoading, setIsGrantLoading] = useState(false)
    const [accessGranted, setAccessGranted] = useState(false)
    const [accessError, setAccessError] = useState<string | null>(null)
    const wallet = useAnchorWallet(); // Move the hook to the top level
  
    const handleAdminAccess = async () => {
      if (!wallet) {
        setAccessError("Wallet not connected");
        return;
      }
      
      setIsAdminLoading(true);
      setAccessError(null);
      
      try {
        let str = await initializeAccessControl(wallet);
        setAccessGranted(true);
      } catch (error) {
        setAccessError((error as Error).message || "Failed to access admin panel");
      } finally {
        setIsAdminLoading(false);
      }
    }
  
    const handleGrantAccess = async () => {
      if (!wallet) {
        setAccessError("Wallet not connected");
        return;
        }
        console.log(wallet.publicKey.toBase58());
      try {
        let str = await grantAccess(wallet, wallet.publicKey);

        setAccessGranted(true);
      } catch (error) {
        setAccessError((error as Error).message || "Failed to access admin panel");
      } finally {
        setIsAdminLoading(false);
      }
      
      try {
        // Call your grant access function here
        await new Promise(resolve => setTimeout(resolve, 1000));
        setAccessGranted(true);
        setWalletAddress("");
      } catch (error) {
        setAccessError((error as Error).message || "Failed to grant access");
      } finally {
        setIsGrantLoading(false);
      }
    }
  
    return (
      <div className="space-y-8">
        {/* Admin Access Section */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <h2 className="text-2xl font-bold">Admin Access</h2>
          </div>
          <div className="border-4 rounded-lg border-base-300 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg">Access the admin panel to manage system settings</p>
              </div>
              <div>
                <button 
                  className="btn btn-primary" 
                  onClick={handleAdminAccess}
                  disabled={isAdminLoading || !wallet}
                >
                  {isAdminLoading ? (
                    <span className="loading loading-spinner"></span>
                  ) : (
                    "Access Admin Panel"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
  
        {/* Grant Access Section */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <h2 className="text-2xl font-bold">Grant Access</h2>
          </div>
          <div className="border-4 rounded-lg border-base-300 p-6">
            <div className="space-y-4">
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Wallet Address</span>
                </label>
                <input 
                  type="text" 
                  placeholder="Enter wallet address" 
                  className="input input-bordered w-full" 
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                />
              </div>
              
              <div className="flex justify-end">
                <button 
                  className="btn btn-primary" 
                  onClick={handleGrantAccess}
                  disabled={isGrantLoading || !walletAddress.trim() || !wallet}
                >
                  {isGrantLoading ? (
                    <span className="loading loading-spinner"></span>
                  ) : (
                    "Grant Access"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
  
        {/* Status Message */}
        {accessGranted && (
          <div className="alert alert-success">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Access granted successfully!</span>
          </div>
        )}
        
        {accessError && (
          <div className="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Error: {accessError}</span>
          </div>
        )}
  
        {!wallet && (
          <div className="alert alert-warning">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Please connect your wallet to use access control features</span>
          </div>
        )}
      </div>
    )
  }
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

function getSolanaExplorerUrl(
    signature: Uint8Array,
    cluster: string = "devnet"
    ): string {
    const base58Signature = bs58.encode(signature);
    return `https://explorer.solana.com/tx/${base58Signature}?cluster=${cluster}`;
  }
  

function base64ToFile(base64String: any, filename: string) {
  // Split the base64 string into parts
  const [header, base64Data] = base64String.split(',');
  // Determine the mime type from the header
  const mimeType = header.match(/:(.*?);/)[1];
  
  // Decode the base64 string
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });
  const file = new File([blob], filename, { type: mimeType });
  
  return file;
}
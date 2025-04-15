'server only'
import { FileListItem, PinataSDK } from "pinata";

const pinata = new PinataSDK({
      pinataJwt: process.env.jwt,
      pinataGateway: process.env.gateway,
});

async function uploadFile(file: File): Promise<string>{ 
    const file_to_upload = new File([file], file.name, { type: file.type });
    console.log(file_to_upload)
  const upload = await pinata.upload.private.file(file_to_upload);
  return upload.id;
}

async function fetchFile(cid: string): Promise<FileListItem> { 
    const file = await pinata.files.private.get(cid);
    return file;
}

export { uploadFile, fetchFile };
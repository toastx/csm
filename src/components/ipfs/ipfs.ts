'server only'

import { FileListItem, PinataSDK } from "pinata";

const pinata = new PinataSDK({
      pinataJwt: process.env.jwt,
      pinataGateway: process.env.gateway,
});

async function uploadFile(file: File): Promise<string>{ 
    console.log(pinata)
    const file_to_upload = new File([file], file.name, { type: file.type });

  const upload = await pinata.upload.public.file(file_to_upload);
  return upload.id;
}

async function fetchFile(cid: string): Promise<FileListItem> { 
    const file = await pinata.files.public.get(cid);
    return file;
}

export { uploadFile, fetchFile };
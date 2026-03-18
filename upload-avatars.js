import { put } from '@vercel/blob';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup paths for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure this path matches where your local images are currently stored!
// Usually it's 'resources/images' or 'img' depending on your folder structure.
const imagesDir = path.join(__dirname, 'resources', 'images'); 

async function uploadAll() {
  console.log("Starting batch upload to Vercel Blob...");
  
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("❌ Error: Missing BLOB_READ_WRITE_TOKEN environment variable.");
    console.error("Make sure you are running this with the --env-file flag.");
    return;
  }

  try {
    const files = fs.readdirSync(imagesDir);

    for (const file of files) {
      // Skip hidden files like .DS_Store
      if (file.startsWith('.')) continue;

      const filePath = path.join(imagesDir, file);
      const fileBuffer = fs.readFileSync(filePath);

      console.log(`Uploading ${file}...`);
      
      try {
          const blob = await put(`avatars/${file}`, fileBuffer, {
              access: 'public',
              token: process.env.BLOB_READ_WRITE_TOKEN,
              addRandomSuffix: false // Keeps the original filename so your SQL script matches perfectly
          });
          console.log(`✅ Success: ${blob.url}`);
      } catch (err) {
          console.error(`❌ Failed to upload ${file}:`, err.message);
      }
    }
    console.log("🎉 Batch upload complete!");
  } catch (error) {
    console.error(`❌ Could not read directory ${imagesDir}. Please check the folder path.`, error.message);
  }
}

uploadAll();
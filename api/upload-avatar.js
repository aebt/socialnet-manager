import { put } from '@vercel/blob';
import busboy from 'busboy';
import sharp from 'sharp';

// REQUIRED: Disable Vercel's default body parser so busboy can read the raw stream
export const config = {
  api: {
    bodyParser: false,
    sizeLimit: "10mb",
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return new Promise((resolve, reject) => {
    const bb = busboy({ headers: req.headers });
    let fileBuffer = [];
    let fileName = '';

    bb.on('file', (name, file, info) => {
      fileName = info.filename;
      file.on('data', (data) => {
        fileBuffer.push(data);
      });
    });

    bb.on('close', async () => {
      try {
        const buffer = Buffer.concat(fileBuffer);

        // Process image: fix orientation, resize to 256x256, convert to WebP
        const processedBuffer = await sharp(buffer)
          .rotate()
          .resize(256, 256, {
            fit: "inside",
            withoutEnlargement: true,
          })
          .webp({ quality: 80, effort: 6, alphaQuality: 80 })
          .toBuffer();

        // Sanitize filename to prevent path traversal
        const safeName = fileName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');
        const blobName = `avatars/${Date.now()}_${safeName}.webp`;

        // Upload to Vercel Blob
        const blob = await put(blobName, processedBuffer, {
          access: 'public',
          token: process.env.BLOB_READ_WRITE_TOKEN
        });

        res.status(200).json({ url: blob.url });
        resolve();
      } catch (error) {
        res.status(500).json({ error: 'Image processing failed' });
        resolve();
      }
    });

    req.pipe(bb);
  });
}
// src/utils/imageCompression.ts

export interface CompressImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxDataUrlBytes?: number;
}

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Could not read image file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });

const canvasToBlob = (
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob | null> =>
  new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });

/**
 * Compresses an uploaded image file (JPG, PNG, WEBP) client-side so it uploads fast
 * to Firebase Storage and remains compact enough for Firestore settings if Storage falls back.
 */
export async function compressBackgroundImageFile(
  file: File,
  options: CompressImageOptions = {}
): Promise<File> {
  const {
    maxWidth = 1440,
    maxHeight = 960,
    quality = 0.8,
    maxDataUrlBytes = 320 * 1024,
  } = options;

  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!file.type.startsWith('image/') && !allowedTypes.includes(file.type.toLowerCase())) {
    throw new Error('Please upload a valid JPG, PNG, or WEBP image file.');
  }

  const rawDataUrl = await readFileAsDataUrl(file);

  return await new Promise<File>((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error('Could not decode the selected image.'));
    img.onload = async () => {
      try {
        const scale = Math.min(
          1,
          maxWidth / Math.max(1, img.width),
          maxHeight / Math.max(1, img.height)
        );
        const targetW = Math.max(1, Math.round(img.width * scale));
        const targetH = Math.max(1, Math.round(img.height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetW, targetH);

        // Try WebP first (great compression & preserves crispness), fallback to JPEG
        const outputMime = 'image/webp';
        let currentQuality = quality;
        let blob = await canvasToBlob(canvas, outputMime, currentQuality);

        if (!blob || blob.type !== outputMime) {
          blob = await canvasToBlob(canvas, 'image/jpeg', currentQuality);
        }

        // Iteratively step down quality if needed so Firestore doc size stays well under 1MB
        const activeMime = blob?.type || 'image/jpeg';
        while (blob && blob.size > maxDataUrlBytes * 0.72 && currentQuality > 0.42) {
          currentQuality = Math.max(0.4, currentQuality - 0.12);
          blob = await canvasToBlob(canvas, activeMime, currentQuality);
        }

        if (!blob) {
          resolve(file);
          return;
        }

        const ext = activeMime.includes('webp') ? 'webp' : 'jpg';
        const cleanBase = file.name.replace(/\.[^.]+$/, '') || 'background';
        resolve(new File([blob], `${cleanBase}.${ext}`, { type: activeMime }));
      } catch {
        resolve(file);
      }
    };
    img.src = rawDataUrl;
  });
}

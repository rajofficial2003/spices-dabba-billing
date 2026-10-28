import { storage, ref, uploadBytesResumable, getDownloadURL } from "../firebase/config";

/**
 * Compresses an image file client-side using HTML5 Canvas before uploading
 * @param {File} file - Original image file
 * @param {Object} options - Compression options
 * @param {number} options.maxWidth - Max width in pixels (default: 900)
 * @param {number} options.maxHeight - Max height in pixels (default: 900)
 * @param {number} options.quality - Image quality 0.1 to 1.0 (default: 0.8)
 * @param {string} options.outputFormat - 'image/webp' or 'image/jpeg' (default: 'image/webp')
 * @returns {Promise<{ blob: Blob, file: File, originalSize: number, compressedSize: number, compressionRatio: string }>}
 */
export async function compressImage(file, options = {}) {
  const {
    maxWidth = 900,
    maxHeight = 900,
    quality = 0.8,
    outputFormat = "image/webp"
  } = options;

  return new Promise((resolve, reject) => {
    // If not an image, reject
    if (!file.type.startsWith("image/")) {
      return reject(new Error("Selected file is not an image"));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to decode image"));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio preserving dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        // Enable high quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // Fill background white in case of transparent png to avoid black background if converted to jpeg
        if (outputFormat === "image/jpeg") {
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Test webp support, fallback to jpeg if unsupported
        let mimeType = outputFormat;
        try {
          if (outputFormat === "image/webp" && canvas.toDataURL("image/webp").indexOf("data:image/webp") !== 0) {
            mimeType = "image/jpeg";
          }
        } catch {
          mimeType = "image/jpeg";
        }

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return reject(new Error("Canvas compression failed"));
            }

            const ext = mimeType === "image/webp" ? ".webp" : ".jpg";
            const newFileName = file.name.replace(/\.[^/.]+$/, "") + "_compressed" + ext;
            const compressedFile = new File([blob], newFileName, { type: mimeType });

            const originalSize = file.size;
            const compressedSize = blob.size;
            const savedPercentage = Math.round(((originalSize - compressedSize) / originalSize) * 100);

            resolve({
              blob,
              file: compressedFile,
              originalSize,
              compressedSize,
              compressionRatio: `${Math.max(0, savedPercentage)}%`,
              previewUrl: URL.createObjectURL(blob),
              width,
              height
            });
          },
          mimeType,
          quality
        );
      };

      img.src = event.target.result;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Uploads a compressed image to Firebase Storage and returns the public download URL
 * @param {File|Blob} file - The compressed file/blob
 * @param {string} folder - Destination folder (default: 'products')
 * @param {function} onProgress - Progress callback (percentage: number)
 * @returns {Promise<{ url: string, path: string }>}
 */
export async function uploadProductImage(file, folder = "products", onProgress = null) {
  const timestamp = Date.now();
  const safeName = (file.name || "image.webp").replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${folder}/${timestamp}_${safeName}`;
  const storageRef = ref(storage, storagePath);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type || "image/webp"
    });

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        if (onProgress) onProgress(progress);
      },
      (error) => {
        console.error("Storage upload error:", error);
        reject(error);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            url: downloadUrl,
            path: storagePath
          });
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}

/**
 * Formats bytes to human-readable size
 */
export function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

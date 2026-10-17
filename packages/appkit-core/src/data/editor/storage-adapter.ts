export type EditorFileUploadHandler = (file: File) => Promise<string>;

export interface StorageUploadConfig {
  /**
   * Function or endpoint to get a presigned URL for file upload
   */
  getPresignedUrl?: (file: File) => Promise<{ uploadUrl: string; publicUrl: string }>;
  /**
   * Direct custom file uploader returning the accessible URL
   */
  uploadFn?: (file: File) => Promise<string>;
}

/**
 * Creates a BlockNote compatible uploadFile handler from storage options.
 */
export function createEditorUploadHandler(config: StorageUploadConfig): EditorFileUploadHandler {
  return async (file: File): Promise<string> => {
    if (config.uploadFn) {
      return await config.uploadFn(file);
    }

    if (config.getPresignedUrl) {
      const { uploadUrl, publicUrl } = await config.getPresignedUrl(file);
      const res = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to upload file to storage: ${res.statusText}`);
      }

      return publicUrl;
    }

    // Fallback to local Data URL (e.g. for offline or prototyping)
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file as Data URL'));
      reader.readAsDataURL(file);
    });
  };
}

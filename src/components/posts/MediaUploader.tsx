import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Upload, X, Image as ImageIcon, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MediaItem } from '@/types/post';

interface MediaUploaderProps {
  media: MediaItem[];
  onMediaChange: (media: MediaItem[]) => void;
  maxFiles?: number;
  disabled?: boolean;
}

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  error?: string;
}

export const MediaUploader = ({
  media,
  onMediaChange,
  maxFiles = 10,
  disabled = false,
}: MediaUploaderProps) => {
  const { currentUser } = useAuth();
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);

  const uploadFile = useCallback(
    async (file: File): Promise<MediaItem> => {
      if (!currentUser) throw new Error('User not authenticated');

      const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const fileType = file.type.startsWith('image/') ? 'image' : 'video';
      const storagePath = `users/${currentUser.uid}/media/${fileId}-${file.name}`;
      const storageRef = ref(storage, storagePath);

      // Update uploading state
      setUploadingFiles((prev) => [
        ...prev,
        { id: fileId, file, progress: 0 },
      ]);

      return new Promise((resolve, reject) => {
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress =
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadingFiles((prev) =>
              prev.map((f) =>
                f.id === fileId ? { ...f, progress } : f
              )
            );
          },
          (error) => {
            console.error('Upload error:', error);
            setUploadingFiles((prev) =>
              prev.map((f) =>
                f.id === fileId
                  ? { ...f, error: error.message }
                  : f
              )
            );
            reject(error);
          },
          async () => {
            try {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);

              const mediaItem: MediaItem = {
                id: fileId,
                type: fileType,
                url: downloadUrl,
                thumbnailUrl: fileType === 'image' ? downloadUrl : undefined,
                fileName: file.name,
                size: file.size,
                uploadedAt: new Date(),
              };

              // Remove from uploading list
              setUploadingFiles((prev) => prev.filter((f) => f.id !== fileId));

              resolve(mediaItem);
            } catch (error) {
              reject(error);
            }
          }
        );
      });
    },
    [currentUser]
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const remainingSlots = maxFiles - media.length - uploadingFiles.length;
      const filesToUpload = acceptedFiles.slice(0, remainingSlots);

      if (filesToUpload.length === 0) return;

      try {
        const uploadPromises = filesToUpload.map(uploadFile);
        const uploadedMedia = await Promise.all(uploadPromises);
        onMediaChange([...media, ...uploadedMedia]);
      } catch (error) {
        console.error('Error uploading files:', error);
      }
    },
    [media, uploadingFiles.length, maxFiles, uploadFile, onMediaChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif'],
      'video/*': ['.mp4', '.mov', '.avi'],
    },
    maxFiles: maxFiles - media.length,
    disabled: disabled || media.length >= maxFiles,
  });

  const removeMedia = (id: string) => {
    onMediaChange(media.filter((m) => m.id !== id));
  };

  const totalItems = media.length + uploadingFiles.length;
  const canUploadMore = totalItems < maxFiles && !disabled;

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      {canUploadMore && (
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <input {...getInputProps()} />
          <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
          {isDragActive ? (
            <p className="text-sm text-muted-foreground">
              Drop files here...
            </p>
          ) : (
            <div>
              <p className="text-sm font-medium mb-1">
                Drag & drop files here, or click to select
              </p>
              <p className="text-xs text-muted-foreground">
                Support for images (PNG, JPG, WebP) and videos (MP4, MOV)
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {totalItems}/{maxFiles} files uploaded
              </p>
            </div>
          )}
        </div>
      )}

      {/* Uploading Files */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((file) => (
            <Card key={file.id} className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {file.file.type.startsWith('image/') ? (
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  ) : (
                    <Video className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {file.file.name}
                  </p>
                  <Progress value={file.progress} className="h-2 mt-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.round(file.progress)}%
                  </p>
                  {file.error && (
                    <p className="text-xs text-destructive mt-1">
                      {file.error}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Uploaded Media */}
      {media.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {media.map((item) => (
            <Card key={item.id} className="relative group overflow-hidden">
              <div className="aspect-square bg-muted flex items-center justify-center">
                {item.type === 'image' ? (
                  <img
                    src={item.url}
                    alt={item.fileName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    <Video className="h-12 w-12 text-muted-foreground mb-2" />
                    <p className="text-xs text-muted-foreground px-2 text-center truncate w-full">
                      {item.fileName}
                    </p>
                  </div>
                )}
              </div>
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                onClick={() => removeMedia(item.id)}
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            </Card>
          ))}
        </div>
      )}

      {/* Info Text */}
      {media.length === 0 && uploadingFiles.length === 0 && !canUploadMore && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No media uploaded
        </p>
      )}
    </div>
  );
};

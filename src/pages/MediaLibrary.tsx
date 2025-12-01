import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMedia } from '@/hooks/useMedia';
import { useMediaStore } from '@/store/mediaStore';
import { uploadMedia, deleteMedia } from '@/services/mediaService';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  Upload,
  Image as ImageIcon,
  Video,
  Trash2,
  Search,
  Loader2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export const MediaLibrary = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  useMedia(); // Load media

  const { media, loading, selectedMedia, setSelectedMedia } = useMediaStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter media based on search
  const filteredMedia = media.filter((m) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      m.originalFileName.toLowerCase().includes(searchLower) ||
      m.tags.some((tag) => tag.toLowerCase().includes(searchLower))
    );
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !currentUser) return;

    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        // Validate file type
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
          toast({
            title: 'Invalid file type',
            description: `${file.name} is not an image or video file`,
            variant: 'destructive',
          });
          continue;
        }

        // Validate file size (50MB limit)
        const maxSize = 50 * 1024 * 1024;
        if (file.size > maxSize) {
          toast({
            title: 'File too large',
            description: `${file.name} exceeds the 50MB size limit`,
            variant: 'destructive',
          });
          continue;
        }

        // Upload without spoofing (spoofing happens at post-time)
        await uploadMedia(currentUser.uid, file);
      }

      toast({
        title: 'Upload successful',
        description: `${files.length} file(s) uploaded successfully`,
      });

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload media files. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (mediaId: string, fileName: string) => {
    if (!currentUser) return;

    if (!confirm('Are you sure you want to delete this media file? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteMedia(currentUser.uid, mediaId, fileName);
      toast({
        title: 'Media deleted',
        description: 'Media file has been deleted successfully',
      });

      if (selectedMedia?.id === mediaId) {
        setSelectedMedia(null);
        setPreviewOpen(false);
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Delete failed',
        description: 'Failed to delete media file',
        variant: 'destructive',
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Media Library</h1>
          <p className="text-muted-foreground">
            Upload and manage media with automatic metadata spoofing
          </p>
        </div>
        <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload Media
            </>
          )}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search media by filename or tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{media.length}</div>
            <p className="text-xs text-muted-foreground">Total Files</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {formatFileSize(media.reduce((sum, m) => sum + m.fileSize, 0))}
            </div>
            <p className="text-xs text-muted-foreground">Total Storage</p>
          </CardContent>
        </Card>
      </div>

      {/* Media Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredMedia.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No media files</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery ? 'No files match your search' : 'Upload your first media file to get started'}
            </p>
            {!searchQuery && (
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Media
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredMedia.map((item) => (
            <Card
              key={item.id}
              className={cn(
                'cursor-pointer transition-all hover:shadow-lg group',
                selectedMedia?.id === item.id && 'ring-2 ring-primary'
              )}
              onClick={() => {
                setSelectedMedia(item);
                setPreviewOpen(true);
              }}
            >
              <div className="relative aspect-square overflow-hidden rounded-t-lg bg-muted">
                {item.fileType === 'image' ? (
                  <img
                    src={item.storageUrl}
                    alt={item.originalFileName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full">
                    <Video className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}


                {/* Delete button (shown on hover) */}
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(item.id, item.fileName);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <CardContent className="p-3">
                <p className="text-sm font-medium truncate">{item.originalFileName}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-muted-foreground">{formatFileSize(item.fileSize)}</p>
                  <p className="text-xs text-muted-foreground">Used {item.usageCount}x</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedMedia?.originalFileName}</DialogTitle>
            <DialogDescription>
              {selectedMedia?.fileType === 'image' ? 'Image' : 'Video'} •{' '}
              {selectedMedia && formatFileSize(selectedMedia.fileSize)} •{' '}
              {selectedMedia?.width && selectedMedia?.height
                ? `${selectedMedia.width}x${selectedMedia.height}`
                : 'Unknown dimensions'}
            </DialogDescription>
          </DialogHeader>

          {selectedMedia && (
            <div className="space-y-4">
              {/* Preview */}
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                {selectedMedia.fileType === 'image' ? (
                  <img
                    src={selectedMedia.storageUrl}
                    alt={selectedMedia.originalFileName}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <video src={selectedMedia.storageUrl} controls className="w-full h-full" />
                )}
              </div>

              {/* Metadata Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Usage Count</p>
                  <p className="font-medium">{selectedMedia.usageCount} times</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Upload Date</p>
                  <p className="font-medium">{selectedMedia.createdAt.toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last Used</p>
                  <p className="font-medium">
                    {selectedMedia.lastUsedAt
                      ? selectedMedia.lastUsedAt.toLocaleDateString()
                      : 'Never'}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <DialogFooter>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setPreviewOpen(false);
                    handleDelete(selectedMedia.id, selectedMedia.fileName);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserMedia, incrementMediaUsage } from '@/services/mediaService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Image as ImageIcon, Video, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MediaFile } from '@/types';
import type { MediaItem } from '@/types/post';

interface MediaLibraryPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectMedia: (media: MediaItem[]) => void;
  selectedMedia: MediaItem[];
}

export const MediaLibraryPicker = ({
  open,
  onOpenChange,
  onSelectMedia,
  selectedMedia,
}: MediaLibraryPickerProps) => {
  const { currentUser } = useAuth();
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (open && currentUser) {
      loadMedia();
    }
  }, [open, currentUser]);

  useEffect(() => {
    // Initialize selected from already selected media
    setSelected(selectedMedia.map((m) => m.id));
  }, [selectedMedia, open]);

  const loadMedia = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const userMedia = await getUserMedia(currentUser.uid);
      setMedia(userMedia);
    } catch (error) {
      console.error('Error loading media:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMedia = media.filter((m) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      m.originalFileName.toLowerCase().includes(searchLower) ||
      m.tags.some((tag) => tag.toLowerCase().includes(searchLower))
    );
  });

  const toggleSelection = (mediaFile: MediaFile) => {
    if (selected.includes(mediaFile.id)) {
      setSelected(selected.filter((id) => id !== mediaFile.id));
    } else {
      setSelected([...selected, mediaFile.id]);
    }
  };

  const handleConfirm = async () => {
    if (!currentUser) return;

    const selectedFiles = media.filter((m) => selected.includes(m.id));

    // Convert to MediaItem format
    const mediaItems: MediaItem[] = selectedFiles.map((file) => ({
      id: file.id,
      type: file.fileType,
      url: file.storageUrl,
      thumbnailUrl: file.thumbnailUrl,
      fileName: file.originalFileName,
      size: file.fileSize,
      uploadedAt: file.createdAt,
    }));

    // Increment usage count for each selected media
    for (const file of selectedFiles) {
      try {
        await incrementMediaUsage(currentUser.uid, file.id);
      } catch (error) {
        console.error('Error incrementing usage:', error);
      }
    }

    onSelectMedia(mediaItems);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select from Media Library</DialogTitle>
          <DialogDescription>
            Choose media files to add to your post
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative flex-shrink-0">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search media..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Media Grid */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredMedia.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'No media found' : 'No media in library'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {filteredMedia.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'relative cursor-pointer rounded-lg border-2 transition-all hover:shadow-lg',
                    selected.includes(item.id)
                      ? 'border-primary ring-2 ring-primary'
                      : 'border-transparent'
                  )}
                  onClick={() => toggleSelection(item)}
                >
                  <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
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

                    {/* Selection overlay */}
                    {selected.includes(item.id) && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <CheckCircle2 className="h-8 w-8 text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-medium truncate">{item.originalFileName}</p>
                    <p className="text-xs text-muted-foreground">
                      Used {item.usageCount}x
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t pt-4 flex-shrink-0">
          <p className="text-sm text-muted-foreground">
            {selected.length} {selected.length === 1 ? 'file' : 'files'} selected
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={selected.length === 0}>
              Add Selected
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

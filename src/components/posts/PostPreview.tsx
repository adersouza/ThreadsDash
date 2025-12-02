import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Heart, MessageCircle, Repeat2, Send } from 'lucide-react';
import type { ThreadsAccount } from '@/types';
import type { MediaItem } from '@/types/post';
import { cn } from '@/lib/utils';

interface PostPreviewProps {
  account: ThreadsAccount | null;
  content: string;
  media: MediaItem[];
  topics: string[];
  className?: string;
}

export const PostPreview = ({
  account,
  content,
  media,
  topics,
  className,
}: PostPreviewProps) => {
  return (
    <Card className={cn('p-4', className)}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage
              src={account?.profilePictureUrl}
              alt={account?.username || 'User'}
            />
            <AvatarFallback>
              {account?.username?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">
                {account?.displayName || 'Select an account'}
              </span>
              {account?.isVerified && (
                <svg
                  className="h-4 w-4 text-blue-500"
                  viewBox="0 0 22 22"
                  fill="currentColor"
                >
                  <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                </svg>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              @{account?.username || 'username'}
            </p>
          </div>
          <span className="text-xs text-muted-foreground">now</span>
        </div>

        {/* Content */}
        <div className="space-y-3">
          {content ? (
            <p className="text-sm whitespace-pre-wrap break-words">
              {content}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Your post content will appear here...
            </p>
          )}

          {/* Media */}
          {media.length > 0 && (
            <div
              className={cn(
                'grid gap-2',
                media.length === 1 && 'grid-cols-1',
                media.length === 2 && 'grid-cols-2',
                media.length >= 3 && 'grid-cols-2'
              )}
            >
              {media.slice(0, 4).map((item, index) => (
                <div
                  key={item.id}
                  className={cn(
                    'relative bg-muted rounded-lg overflow-hidden',
                    media.length === 1 && 'aspect-[4/3]',
                    media.length >= 2 && 'aspect-square',
                    media.length === 3 && index === 0 && 'col-span-2'
                  )}
                >
                  {item.type === 'image' ? (
                    <img
                      src={item.url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-black">
                      <div className="text-white text-center">
                        <div className="text-4xl mb-2">▶</div>
                        <p className="text-xs">Video</p>
                      </div>
                    </div>
                  )}
                  {index === 3 && media.length > 4 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white text-2xl font-semibold">
                        +{media.length - 4}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Engagement Controls */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
              <Heart className="h-5 w-5" />
              <span className="text-xs">0</span>
            </button>
            <button className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
              <MessageCircle className="h-5 w-5" />
              <span className="text-xs">0</span>
            </button>
            <button className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
              <Repeat2 className="h-5 w-5" />
              <span className="text-xs">0</span>
            </button>
            <button className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
};

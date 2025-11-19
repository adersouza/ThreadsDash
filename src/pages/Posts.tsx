import { useState } from 'react';
import { PostList } from '@/components/posts/PostList';
import { PostComposer } from '@/components/posts/PostComposer';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export const Posts = () => {
  const [composerOpen, setComposerOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Posts</h1>
          <p className="text-muted-foreground">
            Manage all your posts in one place
          </p>
        </div>
        <Button onClick={() => setComposerOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Post
        </Button>
      </div>

      {/* Post List */}
      <PostList />

      {/* Post Composer Modal */}
      <PostComposer open={composerOpen} onOpenChange={setComposerOpen} />
    </div>
  );
};

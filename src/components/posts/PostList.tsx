import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { usePostStore } from '@/store/postStore';
import { useAccountStore } from '@/store/accountStore';
import { usePosts } from '@/hooks/usePosts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PostComposer } from './PostComposer';
import {
  MoreHorizontal,
  Edit,
  Copy,
  Trash2,
  Search,

  Loader2,
  Calendar,
  Image as ImageIcon,
} from 'lucide-react';
import type { Post, PostStatus } from '@/types/post';

const statusConfig: Record<
  PostStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  draft: { label: 'Draft', variant: 'secondary' },
  scheduled: { label: 'Scheduled', variant: 'default' },
  published: { label: 'Published', variant: 'outline' },
  failed: { label: 'Failed', variant: 'destructive' },
};

export const PostList = () => {
  const { currentUser } = useAuth();
  const { posts, loading, deletePost: removePost, selectPost } = usePostStore();
  const { accounts } = useAccountStore();
  const { toast } = useToast();
  const { isInitialized } = usePosts();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PostStatus | 'all'>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  // Filter and search posts
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      // Status filter
      if (statusFilter !== 'all' && post.status !== statusFilter) {
        return false;
      }

      // Account filter
      if (accountFilter !== 'all' && post.accountId !== accountFilter) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          post.content.toLowerCase().includes(query) ||
          post.topics.some((topic) => topic.toLowerCase().includes(query))
        );
      }

      return true;
    });
  }, [posts, statusFilter, accountFilter, searchQuery]);

  const getAccount = (accountId: string) => {
    return accounts.find((acc) => acc.id === accountId);
  };

  const handleDeletePost = async (postId: string) => {
    if (!currentUser) return;
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      await deleteDoc(doc(db, 'users', currentUser.uid, 'posts', postId));
      removePost(postId);
      toast({
        title: 'Post deleted',
        description: 'The post has been deleted successfully.',
      });
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete post. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleEditPost = (post: Post) => {
    setEditingPost(post);
    selectPost(post);
    setComposerOpen(true);
  };

  const handleDuplicatePost = () => {
    setEditingPost(null);
    selectPost(null);
    setComposerOpen(true);
    // The composer will handle creating a new post with the same content
  };

  const handleBulkDelete = async () => {
    if (!currentUser) return;
    if (selectedPosts.size === 0) return;
    if (!confirm(`Delete ${selectedPosts.size} selected posts?`)) return;

    try {
      const deletePromises = Array.from(selectedPosts).map((postId) =>
        deleteDoc(doc(db, 'users', currentUser.uid, 'posts', postId))
      );
      await Promise.all(deletePromises);

      selectedPosts.forEach((postId) => removePost(postId));
      setSelectedPosts(new Set());

      toast({
        title: 'Posts deleted',
        description: `${selectedPosts.size} posts deleted successfully.`,
      });
    } catch (error) {
      console.error('Error deleting posts:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete posts. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const togglePostSelection = (postId: string) => {
    const newSelection = new Set(selectedPosts);
    if (newSelection.has(postId)) {
      newSelection.delete(postId);
    } else {
      newSelection.add(postId);
    }
    setSelectedPosts(newSelection);
  };

  const toggleAllPosts = () => {
    if (selectedPosts.size === filteredPosts.length) {
      setSelectedPosts(new Set());
    } else {
      setSelectedPosts(new Set(filteredPosts.map((p) => p.id)));
    }
  };

  if (loading || !isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading posts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v: string) => setStatusFilter(v as PostStatus | 'all')}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={accountFilter} onValueChange={setAccountFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by account" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  @{account.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Bulk Actions */}
      {selectedPosts.size > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {selectedPosts.size} post{selectedPosts.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPosts(new Set())}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Posts Table */}
      <Card>
        {filteredPosts.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={
                      filteredPosts.length > 0 &&
                      selectedPosts.size === filteredPosts.length
                    }
                    onCheckedChange={toggleAllPosts}
                  />
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Content</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Scheduled For</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPosts.map((post) => {
                const account = getAccount(post.accountId);
                return (
                  <TableRow key={post.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedPosts.has(post.id)}
                        onCheckedChange={() => togglePostSelection(post.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[post.status].variant}>
                        {statusConfig[post.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <div className="space-y-2">
                        <p className="text-sm line-clamp-2">
                          {post.content || (
                            <span className="text-muted-foreground italic">
                              No content
                            </span>
                          )}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {post.media.length > 0 && (
                            <span className="flex items-center gap-1">
                              <ImageIcon className="h-3 w-3" />
                              {post.media.length}
                            </span>
                          )}
                          {post.topics.length > 0 && (
                            <span>{post.topics.length} topic{post.topics.length !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {account ? (
                        <div className="text-sm">
                          <div className="font-medium">
                            {account.displayName}
                          </div>
                          <div className="text-muted-foreground">
                            @{account.username}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Unknown
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {post.scheduledFor ? (
                        <div className="text-sm">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(post.scheduledFor, 'MMM d, yyyy')}
                          </div>
                          <div className="text-muted-foreground">
                            {format(post.scheduledFor, 'h:mm a')}
                          </div>
                        </div>
                      ) : post.publishedAt ? (
                        <div className="text-sm text-muted-foreground">
                          {format(post.publishedAt, 'MMM d, yyyy')}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditPost(post)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDuplicatePost()}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeletePost(post.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">
              {posts.length === 0
                ? 'No posts yet. Create your first post!'
                : 'No posts match your filters.'}
            </p>
          </div>
        )}
      </Card>

      {/* Post Composer Modal */}
      <PostComposer
        open={composerOpen}
        onOpenChange={(open) => {
          setComposerOpen(open);
          if (!open) {
            setEditingPost(null);
            selectPost(null);
          }
        }}
        editPost={editingPost}
      />
    </div>
  );
};

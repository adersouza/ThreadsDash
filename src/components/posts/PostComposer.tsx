import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountStore } from '@/store/accountStore';
import { usePostStore } from '@/store/postStore';
import { useModelStore } from '@/store/modelStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { MediaUploader } from './MediaUploader';
import { MediaLibraryPicker } from './MediaLibraryPicker';
import { PostPreview } from './PostPreview';
import { useToast } from '@/hooks/use-toast';
import {
  Send,
  Save,
  X,
  Tag,
  FolderOpen,
  Clock,
  Loader2,
} from 'lucide-react';
import type { MediaItem, Post, PostStatus } from '@/types/post';
import { schedulePostToQueue } from '@/services/queueService';

const postSchema = z.object({
  accountId: z.string().min(1, 'Please select an account'),
  content: z.string().max(500, 'Content must be 500 characters or less'),
  topics: z.array(z.string()),
  scheduledFor: z.date().optional(),
  whoCanReply: z.enum(['everyone', 'followers', 'mentioned']),
  allowReplies: z.boolean(),
});

type PostFormData = z.infer<typeof postSchema>;

interface PostComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editPost?: Post | null;
  prefilledScheduledDate?: Date | null;
}

export const PostComposer = ({
  open,
  onOpenChange,
  editPost,
  prefilledScheduledDate,
}: PostComposerProps) => {
  const { currentUser } = useAuth();
  const { accounts } = useAccountStore();
  const { models } = useModelStore();
  const { addPost, updatePost } = usePostStore();
  const { toast } = useToast();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [topicInput, setTopicInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [libraryPickerOpen, setLibraryPickerOpen] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string>('');

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      accountId: '',
      content: '',
      topics: [],
      whoCanReply: 'everyone',
      allowReplies: true,
    },
  });

  const watchedFields = watch();
  const selectedAccount = accounts.find(
    (acc) => acc.id === watchedFields.accountId
  );

  // Filter accounts based on selected model
  const filteredAccounts = selectedModelId
    ? accounts.filter(
        (account) =>
          account.modelIds && account.modelIds.includes(selectedModelId)
      )
    : accounts;

  // Load edit post data or prefilled scheduled date
  useEffect(() => {
    if (editPost && open) {
      setValue('accountId', editPost.accountId);
      setValue('content', editPost.content);
      setValue('topics', editPost.topics);
      setValue('whoCanReply', editPost.settings.whoCanReply);
      setValue('allowReplies', editPost.settings.allowReplies);
      setValue('scheduledFor', editPost.scheduledFor);
      setMedia(editPost.media);
    } else if (!editPost && prefilledScheduledDate && open) {
      // Pre-fill scheduled date for new posts created from calendar
      setValue('scheduledFor', prefilledScheduledDate);
    } else if (!open) {
      reset();
      setMedia([]);
      setTopicInput('');
      setSelectedModelId('');
    }
  }, [editPost, prefilledScheduledDate, open, setValue, reset]);


  const addTopic = () => {
    const topic = topicInput.trim().replace(/^#/, '');
    if (topic && topic.length > 0 && !watchedFields.topics.includes(topic)) {
      // Check if topic text already exists in content (to avoid duplicates)
      const contentLower = (watchedFields.content || '').toLowerCase();
      const topicLower = topic.toLowerCase();
      const topicNoSpaces = topicLower.replace(/\s+/g, '');
      
      // Don't add topic if it's already in the content
      if (contentLower.includes(topicLower) || contentLower.includes(topicNoSpaces)) {
        toast({
          title: 'Topic already in content',
          description: `"${topic}" is already in your post content. Topics should be separate from content.`,
          variant: 'destructive',
        });
        setTopicInput('');
        return;
      }

      const currentTopics = watchedFields.topics || [];
      setValue('topics', [...currentTopics, topic]);
      setTopicInput('');
      // IMPORTANT: Never modify content when adding topics
      // Content and topics are completely separate
    } else {
      if (watchedFields.topics?.includes(topic)) {
        toast({
          title: 'Duplicate topic',
          description: 'This topic has already been added.',
          variant: 'destructive',
        });
      }
      setTopicInput('');
    }
  };

  const removeTopic = (topic: string) => {
    setValue(
      'topics',
      watchedFields.topics.filter((t) => t !== topic)
    );
  };

  const handleMediaFromLibrary = (selectedMedia: MediaItem[]) => {
    // Merge with existing media, avoiding duplicates
    const existingIds = new Set(media.map((m) => m.id));
    const newMedia = selectedMedia.filter((m) => !existingIds.has(m.id));
    setMedia([...media, ...newMedia]);
  };

  const savePost = async (data: PostFormData, status: PostStatus) => {
    if (!currentUser) return;

    try {
      setIsSubmitting(true);

      const postData = {
        userId: currentUser.uid,
        accountId: data.accountId,
        content: data.content,
        media: media.map((m) => ({
          id: m.id,
          type: m.type,
          url: m.url,
          thumbnailUrl: m.thumbnailUrl,
          fileName: m.fileName,
          size: m.size,
          uploadedAt: m.uploadedAt,
        })),
        status,
        scheduledFor: data.scheduledFor || null,
        publishedAt: status === 'published' ? new Date() : null,
        topics: data.topics,
        settings: {
          allowReplies: data.allowReplies,
          whoCanReply: data.whoCanReply,
          topics: data.topics,
        },
        updatedAt: serverTimestamp(),
      };

      if (editPost) {
        // Update existing post
        const postRef = doc(db, 'users', currentUser.uid, 'posts', editPost.id);
        await updateDoc(postRef, postData);

        updatePost(editPost.id, {
          ...postData,
          id: editPost.id,
          createdAt: editPost.createdAt,
          updatedAt: new Date(),
        } as Post);

        toast({
          title: 'Post updated',
          description: 'Your post has been updated successfully.',
        });
      } else {
        // Create new post
        const postsRef = collection(db, 'users', currentUser.uid, 'posts');
        const docRef = await addDoc(postsRef, {
          ...postData,
          createdAt: serverTimestamp(),
        });

        const newPost: Post = {
          ...postData,
          id: docRef.id,
          createdAt: new Date(),
          updatedAt: new Date(),
          scheduledFor: data.scheduledFor,
          publishedAt: status === 'published' ? new Date() : undefined,
        } as Post;

        addPost(newPost);

        const statusMessages = {
          draft: 'Post saved as draft',
          scheduled: 'Post scheduled successfully',
          published: 'Post published successfully',
          failed: 'Post failed',
          deleted: 'Post deleted',
        };

        toast({
          title: statusMessages[status],
          description:
            status === 'scheduled' && data.scheduledFor
              ? `Scheduled for ${format(data.scheduledFor, 'PPp')}`
              : undefined,
        });
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Error saving post:', error);
      toast({
        title: 'Error',
        description: 'Failed to save post. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = (data: PostFormData) => {
    if (data.scheduledFor) {
      savePost(data, 'scheduled');
    } else {
      // If no scheduled time, save as scheduled for immediate publishing
      savePostAndPublish(data);
    }
  };

  const saveDraft = () => {
    handleSubmit((data) => savePost(data, 'draft'))();
  };

  const addToQueue = async () => {
    if (!currentUser) return;

    try {
      setIsSubmitting(true);

      // First validate the form
      const data = watchedFields;
      if (!data.accountId) {
        toast({
          title: 'Account required',
          description: 'Please select an account',
          variant: 'destructive',
        });
        return;
      }

      // Create the post data
      const postData = {
        userId: currentUser.uid,
        accountId: data.accountId,
        content: data.content,
        media: media.map((m) => ({
          id: m.id,
          type: m.type,
          url: m.url,
          thumbnailUrl: m.thumbnailUrl,
          fileName: m.fileName,
          size: m.size,
          uploadedAt: m.uploadedAt,
        })),
        status: 'scheduled' as PostStatus,
        scheduledFor: null, // Will be set by queue service
        publishedAt: null,
        topics: data.topics || [],
        settings: {
          allowReplies: data.allowReplies,
          whoCanReply: data.whoCanReply,
          topics: data.topics || [],
        },
        updatedAt: serverTimestamp(),
      };

      // Create the post in Firestore
      const postsRef = collection(db, 'users', currentUser.uid, 'posts');
      const docRef = await addDoc(postsRef, {
        ...postData,
        createdAt: serverTimestamp(),
      });

      // Schedule it to the next queue slot
      const scheduledFor = await schedulePostToQueue(
        currentUser.uid,
        docRef.id,
        data.accountId
      );

      toast({
        title: 'Added to queue',
        description: scheduledFor
          ? `Scheduled for ${format(scheduledFor, 'PPp')}`
          : 'Post added to queue',
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Error adding to queue:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add post to queue',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save post and publish immediately via Cloud Function
  const savePostAndPublish = async (data: PostFormData) => {
    // Prevent double submission
    if (isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);

      // Ensure content doesn't include topics - topics should be separate
      const cleanContent = data.content.trim();

      // Prepare post data with proper structure
      const postData = {
        userId: currentUser!.uid,
        accountId: data.accountId,
        content: cleanContent, // Only the content, topics are separate
        media: media.map((m) => ({
          id: m.id,
          type: m.type,
          url: m.url,
          thumbnailUrl: m.thumbnailUrl,
          fileName: m.fileName,
          size: m.size,
          uploadedAt: m.uploadedAt,
        })),
        status: 'scheduled' as PostStatus,
        scheduledFor: new Date(), // Schedule for immediate publishing
        publishedAt: null,
        topics: data.topics || [], // Topics stored separately
        settings: {
          allowReplies: data.allowReplies,
          whoCanReply: data.whoCanReply,
          topics: data.topics || [],
        },
        updatedAt: serverTimestamp(),
      };

      // Save to Firestore
      let postId: string;
      if (editPost) {
        const postRef = doc(db, 'users', currentUser!.uid, 'posts', editPost.id);
        await updateDoc(postRef, postData);
        postId = editPost.id;
      } else {
        const postsRef = collection(db, 'users', currentUser!.uid, 'posts');
        const docRef = await addDoc(postsRef, {
          ...postData,
          createdAt: serverTimestamp(),
        });
        postId = docRef.id;
      }

      // Publish post via Cloud Function (to avoid CORS)
      if (!selectedAccount) {
        throw new Error('No account selected');
      }

      try {
        // Call the Cloud Function to publish the post
        const publishPostFn = httpsCallable(functions, 'publishPost');
        await publishPostFn({
          postId
        });

        toast({
          title: 'Post published!',
          description: 'Your post has been published to Threads.',
        });

        // Close dialog after successful publish
        onOpenChange(false);
      } catch (error: any) {
        console.error('Error publishing post:', error);

        // Update post status to failed
        await updateDoc(doc(db, 'users', currentUser!.uid, 'posts', postId), {
          status: 'failed',
          error: error.message,
        });

        toast({
          title: 'Publishing failed',
          description: error.message || 'Failed to publish post.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error publishing post:', error);
      toast({
        title: 'Error',
        description: 'Failed to publish post. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const characterCount = watchedFields.content?.length || 0;
  const characterLimit = 500;
  const isOverLimit = characterCount > characterLimit;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl md:max-w-7xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle>
            {editPost ? 'Edit Post' : 'Create New Post'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          {/* Form Section */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Model Selection */}
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Select
                  value={selectedModelId || "all"}
                  onValueChange={(value) => {
                    setSelectedModelId(value === "all" ? "" : value);
                    // Reset account selection when model changes
                    setValue('accountId', '');
                  }}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="model">
                    <SelectValue placeholder="All Accounts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Accounts</SelectItem>
                    {models.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Account Selection */}
              <div className="space-y-2">
                <Label htmlFor="account">Account *</Label>
                <Controller
                  name="accountId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(accountId) => {
                        field.onChange(accountId);
                        // Auto-select model when account is selected
                        const selectedAccount = accounts.find(
                          (acc) => acc.id === accountId
                        );
                        if (selectedAccount?.modelIds && selectedAccount.modelIds.length > 0) {
                          // If account belongs to exactly one model, auto-select it
                          if (selectedAccount.modelIds.length === 1) {
                            setSelectedModelId(selectedAccount.modelIds[0]);
                          } else if (selectedAccount.modelIds.length > 1 && !selectedModelId) {
                            // If account belongs to multiple models and no model is selected, select the first one
                            setSelectedModelId(selectedAccount.modelIds[0]);
                          }
                        }
                      }}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger id="account">
                        <SelectValue placeholder="Select account to post from" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            <div className="flex items-center gap-2">
                              <span>@{account.username}</span>
                              {account.isVerified && (
                                <span className="text-blue-500">✓</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.accountId && (
                  <p className="text-sm text-destructive">
                    {errors.accountId.message}
                  </p>
                )}
              </div>

              {/* Content */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="content">Content</Label>
                  <span
                    className={`text-sm ${
                      isOverLimit ? 'text-destructive' : 'text-muted-foreground'
                    }`}
                  >
                    {characterCount}/{characterLimit}
                  </span>
                </div>
                <Controller
                  name="content"
                  control={control}
                  render={({ field }) => (
                    <Textarea
                      id="content"
                      placeholder="What's on your mind?"
                      className="min-h-[150px] resize-none"
                      disabled={isSubmitting}
                      {...field}
                    />
                  )}
                />
                {errors.content && (
                  <p className="text-sm text-destructive">
                    {errors.content.message}
                  </p>
                )}
              </div>

              {/* Media Upload */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Media</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setLibraryPickerOpen(true)}
                    disabled={isSubmitting}
                  >
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Select from Library
                  </Button>
                </div>
                <MediaUploader
                  media={media}
                  onMediaChange={setMedia}
                  disabled={isSubmitting}
                />
              </div>

              {/* Topics/Hashtags */}
              <div className="space-y-2">
                <Label htmlFor="topics">Topics</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="topics"
                      placeholder="Add topic (press Enter)"
                      value={topicInput}
                      onChange={(e) => setTopicInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTopic();
                        }
                      }}
                      className="pl-9"
                      disabled={isSubmitting}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addTopic}
                    disabled={!topicInput.trim() || isSubmitting}
                  >
                    Add
                  </Button>
                </div>
                {watchedFields.topics && watchedFields.topics.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {watchedFields.topics.map((topic) => (
                      <Badge key={topic} variant="secondary">
                        #{topic}
                        <button
                          type="button"
                          onClick={() => removeTopic(topic)}
                          className="ml-2 hover:text-destructive"
                          disabled={isSubmitting}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Reply Settings */}
              <div className="space-y-4">
                <Label>Reply Settings</Label>
                <div className="flex items-center space-x-2">
                  <Controller
                    name="allowReplies"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        id="allowReplies"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSubmitting}
                      />
                    )}
                  />
                  <label
                    htmlFor="allowReplies"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Allow replies
                  </label>
                </div>
                {watchedFields.allowReplies && (
                  <div className="space-y-2">
                    <Label htmlFor="whoCanReply">Who can reply</Label>
                    <Controller
                      name="whoCanReply"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={isSubmitting}
                        >
                          <SelectTrigger id="whoCanReply">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="everyone">Everyone</SelectItem>
                            <SelectItem value="followers">
                              Followers only
                            </SelectItem>
                            <SelectItem value="mentioned">
                              Mentioned only
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                )}
              </div>

              <Separator />

              {/* Schedule */}
              <div className="space-y-2">
                <Label htmlFor="scheduledFor">Schedule (Optional)</Label>
                <Controller
                  name="scheduledFor"
                  control={control}
                  render={({ field }) => (
                    <div className="flex gap-2">
                      <Input
                        type="datetime-local"
                        value={
                          field.value
                            ? format(field.value, "yyyy-MM-dd'T'HH:mm")
                            : ''
                        }
                        onChange={(e) => {
                          const date = e.target.value
                            ? new Date(e.target.value)
                            : undefined;
                          field.onChange(date);
                        }}
                        min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                        disabled={isSubmitting}
                      />
                      {field.value && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => field.onChange(undefined)}
                          disabled={isSubmitting}
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                  )}
                />
              </div>
            </form>
          </div>

          {/* Preview Section */}
          {showPreview && (
            <div className="lg:w-[400px] border-l bg-muted/10">
              <div className="sticky top-0 p-4 border-b bg-background">
                <h3 className="font-semibold">Preview</h3>
              </div>
              <div className="p-4">
                <PostPreview
                  account={selectedAccount || null}
                  content={watchedFields.content || ''}
                  media={media}
                  topics={watchedFields.topics || []}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-6 py-4 border-t bg-muted/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0 flex-shrink-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowPreview(!showPreview)}
            className="hidden lg:flex"
          >
            {showPreview ? 'Hide' : 'Show'} Preview
          </Button>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={saveDraft}
              disabled={isSubmitting || isOverLimit}
              size="lg"
              className="w-full sm:w-auto h-11 sm:h-10"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              <span className="hidden sm:inline">Save Draft</span>
              <span className="sm:hidden">Draft</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={addToQueue}
              disabled={isSubmitting || isOverLimit || !watchedFields.accountId}
              size="lg"
              className="w-full sm:w-auto h-11 sm:h-10"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Clock className="h-4 w-4 mr-2" />
              )}
              <span className="hidden sm:inline">Add to Queue</span>
              <span className="sm:hidden">Queue</span>
            </Button>
            <Button
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting || isOverLimit}
              size="lg"
              className="w-full sm:w-auto h-11 sm:h-10"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {watchedFields.scheduledFor ? 'Schedule Post' : 'Post Now'}
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Media Library Picker */}
      <MediaLibraryPicker
        open={libraryPickerOpen}
        onOpenChange={setLibraryPickerOpen}
        onSelectMedia={handleMediaFromLibrary}
        selectedMedia={media}
      />
    </Dialog>
  );
};

import { useState, useMemo, useCallback } from 'react';
import { Calendar, momentLocalizer, Views, View } from 'react-big-calendar';
import moment from 'moment';
import { usePostStore } from '@/store/postStore';
import { useAccountStore } from '@/store/accountStore';
import { useModelStore } from '@/store/modelStore';
import { usePosts } from '@/hooks/usePosts';
import { Button } from '@/components/ui/button';

import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PostComposer } from '@/components/posts/PostComposer';
import { QueueManagement } from '@/components/settings/QueueManagement';
import { Plus, Loader2 } from 'lucide-react';
import type { Post } from '@/types/post';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../styles/calendar.css';

const localizer = momentLocalizer(moment);

// Color mapping for accounts
const accountColors = [
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#F59E0B', // amber
  '#10B981', // emerald
  '#3B82F6', // blue
  '#EF4444', // red
  '#06B6D4', // cyan
  '#8B5CF6', // violet
];

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Post;
  color: string;
}

export const PostCalendar = () => {
  const { posts, loading, selectPost } = usePostStore();
  const { accounts } = useAccountStore();
  const { models } = useModelStore();
  const { isInitialized } = usePosts();

  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [modelFilter, setModelFilter] = useState<string>('all');
  const [composerOpen, setComposerOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [prefilledDate, setPrefilledDate] = useState<Date | null>(null);
  

  // Get account color
  const getAccountColor = useCallback(
    (accountId: string) => {
      const index = accounts.findIndex((acc) => acc.id === accountId);
      return accountColors[index % accountColors.length];
    },
    [accounts]
  );

  // Convert posts to calendar events
  const events = useMemo<CalendarEvent[]>(() => {
    return posts
      .filter((post) => {
        // Only show scheduled posts
        if (!post.scheduledFor) return false;

        // Apply account filter
        if (accountFilter !== 'all' && post.accountId !== accountFilter) {
          return false;
        }

        // Apply model filter
        if (modelFilter !== 'all') {
          if (modelFilter === 'none' && post.modelId) {
            return false; // Filter out posts with models
          } else if (modelFilter !== 'none' && post.modelId !== modelFilter) {
            return false; // Filter to specific model
          }
        }

        return true;
      })
      .map((post) => {

        const startDate = new Date(post.scheduledFor!);
        const endDate = new Date(startDate.getTime() + 30 * 60000); // 30 minutes duration

        return {
          id: post.id,
          title: post.content.slice(0, 50) + (post.content.length > 50 ? '...' : ''),
          start: startDate,
          end: endDate,
          resource: post,
          color: getAccountColor(post.accountId),
        };
      });
  }, [posts, accountFilter, modelFilter, getAccountColor]);

  // Handle event click
  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedPost(event.resource);
    selectPost(event.resource);
    setComposerOpen(true);
  }, [selectPost]);

  // Handle slot selection (create new post)
  const handleSelectSlot = useCallback(
    (slotInfo: { start: Date; end: Date }) => {
      setPrefilledDate(slotInfo.start);
      setSelectedPost(null);
      selectPost(null);
      setComposerOpen(true);
    },
    [selectPost]
  );

  // Custom event style getter
  const eventStyleGetter = useCallback(
    (event: CalendarEvent) => {
      return {
        style: {
          backgroundColor: event.color,
          borderRadius: '4px',
          opacity: 0.9,
          color: 'white',
          border: '0px',
          display: 'block',
          fontSize: '0.85rem',
        },
      };
    },
    []
  );

  if (loading || !isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Post Calendar</h1>
          <p className="text-muted-foreground">
            View and manage your scheduled posts
          </p>
        </div>
        <Button onClick={() => {
          setSelectedPost(null);
          setComposerOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Post
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Account:</span>
              <Select value={accountFilter} onValueChange={setAccountFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
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

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Model:</span>
              <Select value={modelFilter} onValueChange={setModelFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Models</SelectItem>
                  <SelectItem value="none">No Model</SelectItem>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3">
            {accounts.slice(0, 5).map((account) => (
              <div key={account.id} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: getAccountColor(account.id) }}
                />
                <span className="text-sm">@{account.username}</span>
              </div>
            ))}
            {accounts.length > 5 && (
              <span className="text-sm text-muted-foreground">
                +{accounts.length - 5} more
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Calendar */}
      <Card className="p-4">
        <div style={{ height: '700px' }}>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            view={view}
            onView={setView}
            date={date}
            onNavigate={setDate}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            eventPropGetter={eventStyleGetter}
            selectable
            views={[Views.MONTH, Views.WEEK, Views.DAY]}
            popup
            style={{ height: '100%' }}
            messages={{
              next: 'Next',
              previous: 'Previous',
              today: 'Today',
              month: 'Month',
              week: 'Week',
              day: 'Day',
              agenda: 'Agenda',
              date: 'Date',
              time: 'Time',
              event: 'Post',
              noEventsInRange: 'No scheduled posts in this range.',
              showMore: (total: number) => `+${total} more`,
            }}
          />
        </div>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="text-2xl font-bold">
            {posts.filter((p) => p.status === 'scheduled').length}
          </div>
          <p className="text-sm text-muted-foreground">Scheduled Posts</p>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">
            {posts.filter((p) => p.status === 'draft').length}
          </div>
          <p className="text-sm text-muted-foreground">Draft Posts</p>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">
            {posts.filter((p) => p.status === 'published').length}
          </div>
          <p className="text-sm text-muted-foreground">Published Posts</p>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">
            {posts.filter((p) => p.scheduledFor && new Date(p.scheduledFor) > new Date()).length}
          </div>
          <p className="text-sm text-muted-foreground">Upcoming Posts</p>
        </Card>
      </div>

      {/* Queue Management */}
      <QueueManagement />

      {/* Post Composer Modal */}
      <PostComposer
        open={composerOpen}
        onOpenChange={(open) => {
          setComposerOpen(open);
          if (!open) {
            setSelectedPost(null);
            setPrefilledDate(null);
            selectPost(null);
          }
        }}
        editPost={selectedPost}
        prefilledScheduledDate={prefilledDate}
      />
    </div>
  );
};

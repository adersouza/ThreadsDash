import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { TopPost } from '@/types/analytics';

interface TopPostsTableProps {
  posts: TopPost[];
  title?: string;
}

export const TopPostsTable = ({ posts, title = 'Top Performing Posts' }: TopPostsTableProps) => {
  if (posts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>No posts available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Your best performing content</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Content</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Views</TableHead>
              <TableHead className="text-right">Likes</TableHead>
              <TableHead className="text-right">Replies</TableHead>
              <TableHead className="text-right">Engagement</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.map((post) => (
              <TableRow key={post.postId}>
                <TableCell className="max-w-[300px]">
                  <div className="space-y-1">
                    <p className="text-sm line-clamp-2">{post.content}</p>
                    {post.topics.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {post.topics.slice(0, 3).map((topic) => (
                          <Badge key={topic} variant="secondary" className="text-xs">
                            #{topic}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(post.publishedAt, 'MMM d')}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {post.views.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">{post.likes.toLocaleString()}</TableCell>
                <TableCell className="text-right">{post.replies.toLocaleString()}</TableCell>
                <TableCell className="text-right font-semibold text-primary">
                  {(post.engagementRate * 100).toFixed(1)}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

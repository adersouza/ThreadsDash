import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, TrendingUp } from 'lucide-react';
import type { OptimalTimeSlot } from '@/types/analytics';

interface OptimalTimesProps {
  timeSlots: OptimalTimeSlot[];
  title?: string;
}

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const OptimalTimes = ({ timeSlots, title = 'Best Times to Post' }: OptimalTimesProps) => {
  if (timeSlots.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Not enough data yet</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:00 ${period}`;
  };

  const maxScore = Math.max(...timeSlots.map((s) => s.score));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>Optimal posting times based on historical engagement</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {timeSlots.slice(0, 5).map((slot, index) => {
            const percentage = (slot.score / maxScore) * 100;

            return (
              <div key={`${slot.dayOfWeek}-${slot.hour}`} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">
                        {dayNames[slot.dayOfWeek]} at {formatHour(slot.hour)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {(slot.avgEngagement * 100).toFixed(1)}% avg engagement • {slot.postCount} posts
                      </p>
                    </div>
                  </div>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-primary rounded-full h-2 transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Lightbulb, Calendar } from 'lucide-react';
import type { AnalyticsInsight } from '@/types/analytics';

interface InsightsPanelProps {
  insights: AnalyticsInsight[];
  title?: string;
}

export const InsightsPanel = ({ insights, title = 'Insights & Recommendations' }: InsightsPanelProps) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'growth':
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'engagement':
        return <TrendingDown className="h-5 w-5 text-blue-500" />;
      case 'bestTime':
        return <Calendar className="h-5 w-5 text-purple-500" />;
      default:
        return <Lightbulb className="h-5 w-5 text-yellow-500" />;
    }
  };

  if (insights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Not enough data to generate insights yet. Keep posting!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {insights.map((insight, index) => (
            <div key={index} className="flex gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex-shrink-0 mt-0.5">{getIcon(insight.type)}</div>
              <div className="flex-1">
                <h4 className="font-medium text-sm mb-1">{insight.title}</h4>
                <p className="text-sm text-muted-foreground">{insight.description}</p>
              </div>
              {insight.trend && (
                <div className="flex-shrink-0">
                  {insight.trend === 'up' ? (
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-500" />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

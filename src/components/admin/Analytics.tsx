import { useState, useEffect } from 'react';
import { adminClient } from '@/lib/admin-client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface AnalyticsData {
  totalUsers: number;
  totalThreads: number;
  totalMessages: number;
  activeUsers24h: number;
}

export function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      const [
        { count: totalUsers },
        { count: totalThreads },
        { count: totalMessages },
        { count: activeUsers24h },
      ] = await Promise.all([
        adminClient.from('auth.users').select('*', { count: 'exact', head: true }),
        adminClient.from('threads').select('*', { count: 'exact', head: true }),
        adminClient.from('messages').select('*', { count: 'exact', head: true }),
        adminClient.from('auth.users').select('*', {
          count: 'exact',
          head: true,
          filter: 'last_sign_in_at.gt.now()-interval.24h',
        }),
      ]);

      setData({
        totalUsers: totalUsers || 0,
        totalThreads: totalThreads || 0,
        totalMessages: totalMessages || 0,
        activeUsers24h: activeUsers24h || 0,
      });
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!data) {
    return <div>Failed to load analytics</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader>
          <CardTitle>Total Users</CardTitle>
          <CardDescription>Registered users</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{data.totalUsers}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Users</CardTitle>
          <CardDescription>Last 24 hours</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{data.activeUsers24h}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Total Threads</CardTitle>
          <CardDescription>Chat threads created</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{data.totalThreads}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Total Messages</CardTitle>
          <CardDescription>Messages exchanged</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{data.totalMessages}</p>
        </CardContent>
      </Card>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface AnalyticsData {
  totalUsers: number;
  totalThreads: number;
  totalMessages: number;
  activeUsers24h: number;
}

export function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      setLoading(true);
      setError(null);

      // Get total users count using RPC function
      const { data: totalUsers, error: usersError } = await supabase
        .rpc('get_total_users');

      if (usersError) throw usersError;

      // Get active users in last 24h using RPC function
      const { data: activeUsers24h, error: activeUsersError } = await supabase
        .rpc('get_active_users_24h');

      if (activeUsersError) throw activeUsersError;

      // Get total threads count
      const { count: totalThreads, error: threadsError } = await supabase
        .from('threads')
        .select('*', { count: 'exact', head: true });

      if (threadsError) throw threadsError;

      // Get total messages count
      const { count: totalMessages, error: messagesError } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true });

      if (messagesError) throw messagesError;

      setData({
        totalUsers: totalUsers || 0,
        totalThreads: totalThreads || 0,
        totalMessages: totalMessages || 0,
        activeUsers24h: activeUsers24h || 0,
      });
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-destructive">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            No analytics data available
          </div>
        </CardContent>
      </Card>
    );
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
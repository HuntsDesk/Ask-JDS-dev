import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserManager } from './UserManager';
import { ErrorLogs } from './ErrorLogs';
import { Analytics } from './Analytics';
import { SystemPrompt } from './SystemPrompt';
import { ModelSettings } from './ModelSettings';
import { useSettings } from '@/hooks/use-settings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('users');
  const { settings, loading } = useSettings();

  return (
    <div className="container py-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      <Tabs defaultValue="users" onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="errors">Error Logs</TabsTrigger>
          <TabsTrigger value="settings">AI Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users" className="space-y-4">
          <UserManager />
        </TabsContent>
        
        <TabsContent value="errors" className="space-y-4">
          <ErrorLogs />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Settings</CardTitle>
              <CardDescription>
                Current AI provider and model settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div>Loading settings...</div>
              ) : (
                <div className="space-y-2">
                  <div>
                    <span className="font-semibold">Provider:</span> {settings.provider}
                  </div>
                  <div>
                    <span className="font-semibold">Model:</span> {settings.model}
                  </div>
                  <div>
                    <span className="font-semibold">ID:</span> {settings.id}
                  </div>
                  <div>
                    <span className="font-semibold">Active:</span> {settings.is_active ? 'Yes' : 'No'}
                  </div>
                  <div>
                    <span className="font-semibold">Created At:</span> {new Date(settings.created_at).toLocaleString()}
                  </div>
                  <div>
                    <span className="font-semibold">Created By:</span> {settings.created_by || 'System Default'}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
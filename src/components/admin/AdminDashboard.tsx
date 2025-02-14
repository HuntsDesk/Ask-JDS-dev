import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserManager } from './UserManager';
import { ErrorLogs } from './ErrorLogs';
import { Analytics } from './Analytics';
import { SystemPrompt } from './SystemPrompt';

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('analytics');

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="prompt">System Prompt</TabsTrigger>
          <TabsTrigger value="errors">Error Logs</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics">
          <Analytics />
        </TabsContent>

        <TabsContent value="prompt">
          <SystemPrompt />
        </TabsContent>

        <TabsContent value="errors">
          <ErrorLogs />
        </TabsContent>

        <TabsContent value="users">
          <UserManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
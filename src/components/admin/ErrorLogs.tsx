import { useState, useEffect } from 'react';
import { getErrorLogs, markErrorAsInvestigated } from '@/lib/admin-client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ErrorLog } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function ErrorLogs() {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    try {
      const logs = await getErrorLogs();
      setLogs(logs);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load error logs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleInvestigated(errorId: string, currentStatus: boolean) {
    try {
      await markErrorAsInvestigated(errorId);
      await loadLogs();
      toast({
        title: 'Success',
        description: `Error marked as ${currentStatus ? 'active' : 'investigated'}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update error status',
        variant: 'destructive',
      });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const activeErrors = logs.filter(log => !log.investigated);
  const investigatedErrors = logs.filter(log => log.investigated);

  return (
    <div className="space-y-8">
      {/* Active Errors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Active Errors
          </CardTitle>
          <CardDescription>
            Errors that need investigation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ErrorTable
            errors={activeErrors}
            onToggleStatus={handleToggleInvestigated}
            emptyMessage="No active errors"
          />
        </CardContent>
      </Card>

      {/* Investigated Errors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-muted-foreground" />
            Investigated Errors
          </CardTitle>
          <CardDescription>
            Previously investigated errors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ErrorTable
            errors={investigatedErrors}
            onToggleStatus={handleToggleInvestigated}
            emptyMessage="No investigated errors"
          />
        </CardContent>
      </Card>
    </div>
  );
}

function ErrorTable({ 
  errors, 
  onToggleStatus,
  emptyMessage 
}: { 
  errors: ErrorLog[],
  onToggleStatus: (id: string, status: boolean) => Promise<void>,
  emptyMessage: string
}) {
  if (errors.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead>Message</TableHead>
            <TableHead>Stack Trace</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {errors.map((log) => (
            <TableRow key={log.id}>
              <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
              <TableCell>{log.message}</TableCell>
              <TableCell className="font-mono text-xs">
                {log.stack_trace ? (
                  <pre className="max-h-40 overflow-auto whitespace-pre-wrap">
                    {log.stack_trace}
                  </pre>
                ) : (
                  'No stack trace'
                )}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleStatus(log.id, log.investigated)}
                >
                  {log.investigated ? (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
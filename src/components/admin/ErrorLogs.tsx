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
import { CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ErrorLog } from '@/types';

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

  async function handleMarkInvestigated(errorId: string) {
    try {
      await markErrorAsInvestigated(errorId);
      await loadLogs();
      toast({
        title: 'Success',
        description: 'Error marked as investigated',
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
    return <div>Loading...</div>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead>Message</TableHead>
            <TableHead>Stack Trace</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
              <TableCell>{log.message}</TableCell>
              <TableCell className="font-mono text-xs">
                {log.stack_trace ? (
                  <pre className="max-h-40 overflow-auto">{log.stack_trace}</pre>
                ) : (
                  'No stack trace'
                )}
              </TableCell>
              <TableCell>
                {log.investigated ? 'Investigated' : 'Pending'}
              </TableCell>
              <TableCell>
                {!log.investigated && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMarkInvestigated(log.id)}
                  >
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
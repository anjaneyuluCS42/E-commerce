import { useState, useEffect, useRef, useCallback } from 'react';
import taskService from '../services/taskService';

export interface TaskState {
  status: string;
  progress: number;
  result: any | null;
  error: string | null;
  isPolling: boolean;
}

export function useTaskStatus() {
  const [taskState, setTaskState] = useState<TaskState>({
    status: 'IDLE',
    progress: 0,
    result: null,
    error: null,
    isPolling: false,
  });

  const [taskId, setTaskId] = useState<string | null>(null);
  const intervalRef = useRef<any>(null);

  const cleanInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const cancel = useCallback(async () => {
    if (!taskId) return;
    try {
      await taskService.cancelTask(taskId);
      setTaskState((prev) => ({
        ...prev,
        status: 'REVOKED',
        isPolling: false,
      }));
      cleanInterval();
    } catch (err: any) {
      console.error('Failed to cancel task:', err);
    }
  }, [taskId]);

  const startPolling = useCallback((id: string) => {
    setTaskId(id);
    setTaskState({
      status: 'PENDING',
      progress: 0,
      result: null,
      error: null,
      isPolling: true,
    });
  }, []);

  useEffect(() => {
    if (!taskId) return;

    cleanInterval();

    const check = async () => {
      try {
        const data = await taskService.checkStatus(taskId);
        
        const isFinished = ['SUCCESS', 'FAILURE', 'REVOKED', 'TIMEOUT'].includes(data.status);
        
        let progress = 0;
        if (data.status === 'SUCCESS') {
          progress = 100;
        } else if (data.status === 'PROGRESS' || data.status === 'PROCESSING') {
          progress = data.progress || 50;
        }

        setTaskState({
          status: data.status,
          progress,
          result: data.result,
          error: data.error,
          isPolling: !isFinished,
        });

        if (isFinished) {
          cleanInterval();
        }
      } catch (err: any) {
        setTaskState((prev) => ({
          ...prev,
          status: 'FAILURE',
          error: err?.message || 'Failed to poll task status.',
          isPolling: false,
        }));
        cleanInterval();
      }
    };

    // Run immediately then every 2 seconds
    check();
    intervalRef.current = setInterval(check, 2000);

    return () => cleanInterval();
  }, [taskId]);

  return {
    ...taskState,
    taskId,
    startPolling,
    cancel,
  };
}

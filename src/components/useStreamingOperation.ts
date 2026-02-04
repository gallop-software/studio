import React, { useCallback, useRef } from "react";
import type { ProgressState } from "./StudioContext";

/**
 * Event types sent by streaming handlers
 */
interface StreamEvent {
  type: "start" | "progress" | "cleanup" | "complete" | "error";
  // Common fields
  current?: number;
  total?: number;
  percent?: number;
  message?: string;
  currentFile?: string;
  // Complete event fields
  processed?: number;
  moved?: number;
  renamed?: number;
  pushed?: number;
  downloaded?: number;
  imported?: number;
  deleted?: number;
  errors?: number;
  errorMessages?: string[];
  cancelled?: boolean;
  // Scan-specific fields
  added?: number;
  existingCount?: number;
  renamedFiles?: Array<{ from: string; to: string }>;
  orphanedFiles?: string[];
  pendingUpdates?: number;
  orphanedEntries?: number;
  emptyFoldersDeleted?: number;
}

/**
 * Configuration for a streaming operation
 */
export interface StreamingOperationConfig {
  /** API endpoint to call */
  endpoint: string;
  /** Request body (operationId will be added automatically) */
  body: Record<string, unknown>;
  /** Title to show in progress modal */
  title: string;
  /** Called when operation completes successfully (including cancelled) */
  onComplete?: (event: StreamEvent) => void;
  /** Called when operation errors */
  onError?: (message: string) => void;
}

/**
 * Dependencies required by the hook
 */
interface StreamingOperationDeps {
  setShowProgress: (show: boolean) => void;
  setProgressTitle: (title: string) => void;
  setProgressState: React.Dispatch<React.SetStateAction<ProgressState>>;
  triggerRefresh: () => void;
}

/**
 * Result returned by the hook
 */
export interface StreamingOperationResult {
  /** Execute a streaming operation */
  execute: (config: StreamingOperationConfig) => Promise<void>;
  /** Stop the current operation (waits for current item to finish) */
  stop: () => void;
  /** Whether an operation is currently running */
  isRunning: boolean;
}

/**
 * Unified hook for streaming operations with progress, cancellation, and cleanup.
 *
 * Features:
 * - Automatic operationId generation
 * - Server-side cancellation via /api/studio/cancel-stream
 * - SSE stream parsing with consistent \n\n delimiter
 * - Handles all event types: start, progress, cleanup, complete, error
 * - Manages stopping -> stopped state transitions
 * - Calls triggerRefresh on complete/stopped
 * - Cleans up event listeners
 */
export function useStreamingOperation(
  deps: StreamingOperationDeps
): StreamingOperationResult {
  const {
    setShowProgress,
    setProgressTitle,
    setProgressState,
    triggerRefresh,
  } = deps;

  const abortControllerRef = useRef<AbortController | null>(null);
  const isRunningRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const operationIdRef = useRef<string | null>(null);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const execute = useCallback(
    async (config: StreamingOperationConfig) => {
      const { endpoint, body, title, onComplete, onError } = config;

      // Prevent concurrent operations
      if (isRunningRef.current) {
        console.warn("Streaming operation already in progress");
        return;
      }

      isRunningRef.current = true;
      stopRequestedRef.current = false;

      // Generate unique operation ID
      const operationType =
        endpoint.split("/").pop()?.replace("-stream", "") || "op";
      const operationId = `${operationType}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;
      operationIdRef.current = operationId;

      // Create abort controller
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Set up abort listener to send cancel request
      const onAbort = async () => {
        stopRequestedRef.current = true;
        // Show "stopping" status immediately (merge with existing state to keep numbers)
        setProgressState((prev) => ({ ...prev, status: "stopping" }));
        // Send cancel request to server
        try {
          await fetch("/api/studio/cancel-stream", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ operationId }),
          });
        } catch {
          // Ignore cancel request errors
        }
      };
      abortController.signal.addEventListener("abort", onAbort);

      // Show progress modal
      setProgressTitle(title);
      setShowProgress(true);
      setProgressState({
        current: 0,
        total: 0,
        percent: 0,
        status: "processing",
        message: `Starting ${title.toLowerCase()}...`,
      });

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, operationId }),
          // Don't pass signal - we want to receive the server's complete message
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Request failed: ${response.status}`
          );
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            // Use \n\n as delimiter (SSE format)
            const lines = buffer.split("\n\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;

              try {
                const data = JSON.parse(line.slice(6)) as StreamEvent;

                if (data.type === "start") {
                  setProgressState((prev) => ({
                    ...prev,
                    total: data.total || prev.total,
                  }));
                } else if (data.type === "progress") {
                  setProgressState({
                    current: data.current || 0,
                    total: data.total || 0,
                    percent:
                      data.percent ||
                      Math.round(
                        ((data.current || 0) / (data.total || 1)) * 100
                      ),
                    status: "processing",
                    currentFile: data.currentFile,
                    message: data.message,
                  });
                } else if (data.type === "cleanup") {
                  setProgressState((prev) => ({
                    ...prev,
                    status: "cleanup",
                    message: data.message,
                  }));
                } else if (data.type === "complete") {
                  const wasCancelled = data.cancelled === true;
                  const processed =
                    data.processed ??
                    data.moved ??
                    data.renamed ??
                    data.pushed ??
                    data.downloaded ??
                    data.added ??
                    data.imported ??
                    data.deleted ??
                    data.current ??
                    0;

                  setProgressState({
                    current: processed,
                    total: processed,
                    percent: 100,
                    status: wasCancelled
                      ? "stopped"
                      : data.errors && data.errors > 0
                      ? "error"
                      : "complete",
                    message: data.message,
                    processed,
                    errors: data.errors,
                    orphanedFiles: data.orphanedFiles,
                  });

                  triggerRefresh();
                  onComplete?.(data);
                } else if (data.type === "error") {
                  setProgressState((prev) => ({
                    ...prev,
                    status: "error",
                    message: data.message,
                  }));
                  onError?.(data.message || "Unknown error");
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        } catch (error) {
          // Only throw if not a stop request
          if (!stopRequestedRef.current) {
            throw error;
          }
        } finally {
          abortController.signal.removeEventListener("abort", onAbort);
        }
      } catch (error) {
        // Only show error if not a stop request
        if (!stopRequestedRef.current) {
          const message =
            error instanceof Error ? error.message : "Operation failed";
          console.error(`${title} error:`, error);
          setProgressState({
            current: 0,
            total: 0,
            percent: 0,
            status: "error",
            message,
          });
          onError?.(message);
        }
      } finally {
        isRunningRef.current = false;
        abortControllerRef.current = null;
        operationIdRef.current = null;
      }
    },
    [setShowProgress, setProgressTitle, setProgressState, triggerRefresh]
  );

  return {
    execute,
    stop,
    get isRunning() {
      return isRunningRef.current;
    },
  };
}

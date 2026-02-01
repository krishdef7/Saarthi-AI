"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export interface StageData {
  stage: string;
  message: string;
  progress: number;
  timing_ms: number;
  data: Record<string, unknown>;
  timestamp: number;
}

export interface AgentPipelineState {
  stages: StageData[];
  currentStage: string | null;
  progress: number;
  isActive: boolean;
  isConnected: boolean;
  error: string | null;
  totalLatency: number;
}

interface UseAgentPipelineReturn extends AgentPipelineState {
  connect: (query: string, profile: Record<string, unknown>) => void;
  disconnect: () => void;
  reset: () => void;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
const CONNECTION_TIMEOUT = 30000; // 30 seconds

export function useAgentPipeline(): UseAgentPipelineReturn {
  const [state, setState] = useState<AgentPipelineState>({
    stages: [],
    currentStage: null,
    progress: 0,
    isActive: false,
    isConnected: false,
    error: null,
    totalLatency: 0,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCompleteRef = useRef(false); // Track if search completed successfully

  const disconnect = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setState((prev) => ({
      ...prev,
      isActive: false,
      isConnected: false,
    }));
  }, []);

  const reset = useCallback(() => {
    disconnect();
    setState({
      stages: [],
      currentStage: null,
      progress: 0,
      isActive: false,
      isConnected: false,
      error: null,
      totalLatency: 0,
    });
    isCompleteRef.current = false;
  }, [disconnect]);

  const connect = useCallback(
    (query: string, profile: Record<string, unknown>) => {
      // Reset state for new search
      isCompleteRef.current = false;
      setState({
        stages: [],
        currentStage: null,
        progress: 0,
        isActive: true,
        isConnected: false,
        error: null,
        totalLatency: 0,
      });

      // Close existing connection
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      const ws = new WebSocket(`${WS_URL}/ws/search`);
      wsRef.current = ws;

      // Set timeout for connection
      timeoutRef.current = setTimeout(() => {
        if (ws.readyState !== WebSocket.CLOSED) {
          ws.close();
          setState((prev) => ({
            ...prev,
            isActive: false,
            error: "Connection timeout - search took too long",
          }));
        }
      }, CONNECTION_TIMEOUT);

      ws.onopen = () => {
        setState((prev) => ({ ...prev, isConnected: true }));

        // Send search request
        ws.send(JSON.stringify({ query, profile }));
      };

      ws.onmessage = (event) => {
        try {
          const data: StageData = JSON.parse(event.data);
          data.timestamp = Date.now();

          const isComplete = data.stage === "complete";
          const isError = data.stage === "error";

          // Mark as complete to prevent reconnection
          if (isComplete || isError) {
            isCompleteRef.current = true;
          }

          setState((prev) => {
            // Check if this stage already exists (update it) or is new
            const existingIndex = prev.stages.findIndex(
              (s) => s.stage === data.stage
            );
            let newStages: StageData[];

            if (existingIndex >= 0) {
              // Update existing stage
              newStages = [...prev.stages];
              newStages[existingIndex] = data;
            } else {
              // Add new stage
              newStages = [...prev.stages, data];
            }

            const totalLatency =
              data.data?.total_latency_ms !== undefined
                ? Number(data.data.total_latency_ms)
                : prev.totalLatency;

            return {
              ...prev,
              stages: newStages,
              currentStage: data.stage,
              progress: data.progress,
              isActive: !isComplete && !isError,
              totalLatency,
              error: isError ? data.message : null,
            };
          });

          // If complete or error, clear timeout
          if (isComplete || isError) {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
          }
        } catch (e) {
          console.error("WebSocket parse error:", e);
        }
      };

      ws.onerror = () => {
        setState((prev) => ({
          ...prev,
          error: "WebSocket connection failed",
        }));
      };

      ws.onclose = () => {
        // Only update state, NO auto-reconnect (was causing the blinking)
        setState((prev) => ({
          ...prev,
          isConnected: false,
          // Keep isActive false only if complete, otherwise it was interrupted
          isActive: false,
        }));

        // Clear the ref so we know connection is closed
        if (wsRef.current === ws) {
          wsRef.current = null;
        }
      };
    },
    []
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    reset,
  };
}

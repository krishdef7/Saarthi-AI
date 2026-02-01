"use client";

import { useState, useMemo, memo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Database,
  Brain,
  CheckCircle,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Loader2,
  XCircle,
  Clock,
  Zap,
} from "lucide-react";
import { StageData } from "@/hooks/useAgentPipeline";

interface AgentPipelineProps {
  stages: StageData[];
  currentStage: string | null;
  progress: number;
  isActive: boolean;
  totalLatency: number;
  error: string | null;
  onClose?: () => void;
}

// Map backend stages to agent cards
const AGENT_CARDS = [
  {
    id: "query",
    name: "Query Agent",
    icon: Search,
    color: "cyan",
    stages: ["query_understanding"],
    description: "Analyzing search intent",
  },
  {
    id: "retrieval",
    name: "Retrieval Agent",
    icon: Database,
    color: "blue",
    stages: ["bm25_search", "vector_search", "rrf_fusion"],
    description: "Searching knowledge base",
  },
  {
    id: "memory",
    name: "Memory Agent",
    icon: Brain,
    color: "purple",
    stages: ["memory_boost"],
    description: "Personalizing results",
  },
  {
    id: "eligibility",
    name: "Eligibility Agent",
    icon: CheckCircle,
    color: "emerald",
    stages: ["eligibility_check"],
    description: "Verifying qualifications",
  },
  {
    id: "complete",
    name: "Complete",
    icon: Sparkles,
    color: "amber",
    stages: ["complete"],
    description: "Results ready",
  },
];

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  cyan: {
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
    text: "text-cyan-400",
    glow: "shadow-cyan-500/20",
  },
  blue: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    text: "text-blue-400",
    glow: "shadow-blue-500/20",
  },
  purple: {
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
    text: "text-purple-400",
    glow: "shadow-purple-500/20",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-400",
    glow: "shadow-emerald-500/20",
  },
  amber: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-400",
    glow: "shadow-amber-500/20",
  },
};

type AgentStatus = "pending" | "active" | "complete" | "error";

function getAgentStatus(
  agentStages: string[],
  completedStages: Set<string>,
  currentStage: string | null,
  hasError: boolean
): AgentStatus {
  if (hasError && agentStages.some((s) => s === currentStage)) {
    return "error";
  }
  if (agentStages.every((s) => completedStages.has(s))) {
    return "complete";
  }
  if (agentStages.some((s) => s === currentStage)) {
    return "active";
  }
  return "pending";
}

function StatusIcon({ status }: { status: AgentStatus }) {
  switch (status) {
    case "pending":
      return <Loader2 size={14} className="text-slate-500" />;
    case "active":
      return <Loader2 size={14} className="text-cyan-400 animate-spin" />;
    case "complete":
      return <CheckCircle size={14} className="text-emerald-400" />;
    case "error":
      return <XCircle size={14} className="text-rose-400" />;
  }
}

interface AgentCardProps {
  agent: (typeof AGENT_CARDS)[0];
  status: AgentStatus;
  stageData: StageData[];
  isExpanded: boolean;
  onToggle: () => void;
}

const AgentCard = memo(function AgentCard({ agent, status, stageData, isExpanded, onToggle }: AgentCardProps) {
  const colors = COLOR_MAP[agent.color];
  const Icon = agent.icon;
  const totalTiming = useMemo(() => stageData.reduce((sum, s) => sum + s.timing_ms, 0), [stageData]);
  const latestMessage = useMemo(() => stageData.length > 0 ? stageData[stageData.length - 1].message : agent.description, [stageData, agent.description]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border transition-all duration-300 ${
        status === "active"
          ? `${colors.border} ${colors.bg} shadow-lg ${colors.glow}`
          : status === "complete"
          ? "border-slate-700 bg-slate-800/50"
          : "border-slate-800 bg-slate-900/50"
      }`}
    >
      <div
        className="p-3 flex items-center gap-3 cursor-pointer"
        onClick={onToggle}
      >
        {/* Icon */}
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            status === "active" || status === "complete"
              ? colors.bg
              : "bg-slate-800"
          }`}
        >
          <Icon
            size={16}
            className={
              status === "active" || status === "complete"
                ? colors.text
                : "text-slate-500"
            }
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-medium ${
                status === "active" ? "text-white" : "text-slate-300"
              }`}
            >
              {agent.name}
            </span>
            <StatusIcon status={status} />
          </div>
          <p className="text-xs text-slate-500 truncate mt-0.5">
            {latestMessage}
          </p>
        </div>

        {/* Timing Badge */}
        {status === "complete" && totalTiming > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-800 text-xs text-slate-400">
            <Clock size={10} />
            <span className="font-mono">{totalTiming.toFixed(1)}ms</span>
          </div>
        )}

        {/* Expand Icon */}
        {stageData.length > 0 && (
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            className="text-slate-500"
          >
            <ChevronRight size={16} />
          </motion.div>
        )}
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && stageData.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2">
              {stageData.map((stage, idx) => (
                <div
                  key={`${stage.stage}-${idx}`}
                  className="pl-11 border-l border-slate-700 ml-4"
                >
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400 font-mono">
                      {stage.stage}
                    </span>
                    {stage.timing_ms > 0 && (
                      <span className="text-slate-500 font-mono">
                        {stage.timing_ms.toFixed(1)}ms
                      </span>
                    )}
                  </div>
                  {stage.data && Object.keys(stage.data).length > 0 && (
                    <div className="mt-1 p-2 rounded bg-slate-950 border border-slate-800 max-h-32 overflow-y-auto">
                      <pre className="text-[10px] text-slate-500 font-mono whitespace-pre-wrap">
                        {JSON.stringify(stage.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

const AgentPipeline = memo(function AgentPipeline({
  stages,
  currentStage,
  progress,
  isActive,
  totalLatency,
  error,
  onClose,
}: AgentPipelineProps) {
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate completed stages
  const completedStages = useMemo(() => {
    const completed = new Set<string>();
    stages.forEach((s) => {
      if (s.stage !== currentStage || !isActive) {
        completed.add(s.stage);
      }
    });
    // If we received a stage, all previous stages are complete
    const stageOrder = [
      "query_understanding",
      "bm25_search",
      "vector_search",
      "rrf_fusion",
      "memory_boost",
      "eligibility_check",
      "complete",
    ];
    const currentIdx = stageOrder.indexOf(currentStage || "");
    if (currentIdx > 0) {
      stageOrder.slice(0, currentIdx).forEach((s) => completed.add(s));
    }
    if (!isActive && currentStage === "complete") {
      completed.add("complete");
    }
    return completed;
  }, [stages, currentStage, isActive]);

  // Group stages by agent
  const stagesByAgent = useMemo(() => {
    const map = new Map<string, StageData[]>();
    AGENT_CARDS.forEach((agent) => {
      map.set(
        agent.id,
        stages.filter((s) => agent.stages.includes(s.stage))
      );
    });
    return map;
  }, [stages]);

  const toggleCard = (id: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (isCollapsed) {
    return (
      <motion.div
        initial={{ x: 300 }}
        animate={{ x: 0 }}
        className="fixed right-0 top-16 bottom-0 w-12 border-l border-slate-800 bg-slate-950 flex flex-col items-center py-4 cursor-pointer hover:bg-slate-900 transition z-30"
        onClick={() => setIsCollapsed(false)}
      >
        <Zap size={20} className={isActive ? "text-cyan-400 animate-pulse" : "text-slate-500"} />
        <div
          className="text-xs text-slate-500 font-mono tracking-widest uppercase mt-4"
          style={{ writingMode: "vertical-rl" }}
        >
          Pipeline
        </div>
        {isActive && (
          <div className="mt-auto mb-4">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.aside
      initial={isMobile ? { y: 300, opacity: 0 } : { x: 300, opacity: 0 }}
      animate={isMobile ? { y: 0, opacity: 1 } : { x: 0, opacity: 1 }}
      exit={isMobile ? { y: 300, opacity: 0 } : { x: 300, opacity: 0 }}
      className={`flex flex-col bg-slate-950/95 backdrop-blur-xl shadow-2xl z-40 ${
        isMobile
          ? "fixed bottom-0 left-0 right-0 max-h-[60vh] rounded-t-3xl border-t border-slate-800"
          : "hidden lg:flex w-80 border-l border-slate-800 fixed right-0 top-16 bottom-0"
      }`}
      role="region"
      aria-label="Agent pipeline status"
    >
      {/* Header - matches top bar height */}
      <div className="h-14 border-b border-slate-800 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <Zap
            size={16}
            className={isActive ? "text-cyan-400 animate-pulse" : "text-slate-500"}
          />
          <span className="text-sm font-semibold text-slate-200">
            Agent Pipeline
          </span>
          {isActive && (
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] font-medium">
              LIVE
            </span>
          )}
        </div>
        <button
          onClick={() => setIsCollapsed(true)}
          className="text-slate-500 hover:text-white transition p-1"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Progress Bar */}
      {(isActive || progress > 0) && (
        <div className="px-4 py-3 border-b border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Progress</span>
            <span className="font-mono">{progress}%</span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* Agent Cards */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {AGENT_CARDS.map((agent) => {
          const status = getAgentStatus(
            agent.stages,
            completedStages,
            currentStage,
            !!error && agent.stages.includes(currentStage || "")
          );
          const agentStages = stagesByAgent.get(agent.id) || [];

          return (
            <AgentCard
              key={agent.id}
              agent={agent}
              status={status}
              stageData={agentStages}
              isExpanded={expandedCards.has(agent.id)}
              onToggle={() => toggleCard(agent.id)}
            />
          );
        })}
      </div>

      {/* Footer Stats */}
      {!isActive && totalLatency > 0 && (
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Total Latency</span>
            <span className="text-sm font-mono text-emerald-400">
              {totalLatency.toFixed(1)}ms
            </span>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 border-t border-rose-500/30 bg-rose-500/10">
          <div className="flex items-center gap-2 text-rose-400 text-sm">
            <XCircle size={16} />
            <span>{error}</span>
          </div>
        </div>
      )}
    </motion.aside>
  );
});

export default AgentPipeline;

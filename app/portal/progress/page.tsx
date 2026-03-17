'use client';

const stages = ['Discovery', 'Strategy', 'Production', 'Review', 'Delivered'];

interface Project {
  name: string;
  lab: string;
  labColor: string;
  currentStage: number; // 0-4 index into stages
  progress: number;
  started: string;
  estimated: string;
  assignee: string;
  assigneeInitials: string;
}

const projects: Project[] = [
  {
    name: 'Sales Objection Crusher Video',
    lab: 'VideoSalesLab',
    labColor: 'purple',
    currentStage: 2,
    progress: 55,
    started: 'Feb 28, 2026',
    estimated: 'Mar 28, 2026',
    assignee: 'Stephen Scrivens',
    assigneeInitials: 'SS',
  },
  {
    name: 'Case Study Walkthrough',
    lab: 'VideoSalesLab',
    labColor: 'purple',
    currentStage: 1,
    progress: 30,
    started: 'Mar 5, 2026',
    estimated: 'Apr 4, 2026',
    assignee: 'Stephen Scrivens',
    assigneeInitials: 'SS',
  },
  {
    name: 'April Campaign — LinkedIn + Google',
    lab: 'ExpansionLab',
    labColor: 'green',
    currentStage: 1,
    progress: 25,
    started: 'Mar 10, 2026',
    estimated: 'Apr 1, 2026',
    assignee: 'Dakota Hanshew',
    assigneeInitials: 'DH',
  },
  {
    name: 'Blog Content Series — Authority Pillars',
    lab: 'ExpansionLab',
    labColor: 'green',
    currentStage: 2,
    progress: 60,
    started: 'Mar 1, 2026',
    estimated: 'Mar 25, 2026',
    assignee: 'TipTop',
    assigneeInitials: 'TT',
  },
];

const labBadge: Record<string, string> = {
  purple: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  green: 'bg-[#2ADD1B]/15 text-[#2ADD1B] border-[#2ADD1B]/20',
  blue: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
};

export default function ProgressPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-display text-white uppercase tracking-wide">
          Project Progress
        </h1>
        <p className="mt-2 text-white/50 text-sm">
          {projects.length} active projects in your pipeline
        </p>
      </div>

      {/* Pipeline legend */}
      <div className="bg-[#1A1A1A]/80 backdrop-blur-sm border border-white/10 rounded-2xl p-5">
        <h2 className="font-display text-xs text-white/40 uppercase tracking-widest mb-4">Pipeline Stages</h2>
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {stages.map((stage, i) => (
            <div key={stage} className="flex items-center gap-1 flex-shrink-0">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                <div className={`w-2 h-2 rounded-full ${i === stages.length - 1 ? 'bg-[#2ADD1B]' : 'bg-white/20'}`} />
                <span className="text-xs text-white/60 whitespace-nowrap">{stage}</span>
              </div>
              {i < stages.length - 1 && (
                <svg className="w-4 h-4 text-white/15 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Project cards */}
      <div className="space-y-4">
        {projects.map((project, idx) => (
          <div
            key={idx}
            className="bg-[#1A1A1A]/80 backdrop-blur-sm border border-white/10 rounded-2xl p-5 sm:p-6 hover:border-[#2ADD1B]/20 transition-all duration-300"
          >
            {/* Top row */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <span className={`inline-flex px-2.5 py-0.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider border ${labBadge[project.labColor]}`}>
                  {project.lab}
                </span>
                <h3 className="mt-2 text-lg font-display text-white uppercase tracking-wide leading-tight">
                  {project.name}
                </h3>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-white/60 font-bold">
                  {project.assigneeInitials}
                </div>
                <span className="text-xs text-white/40">{project.assignee}</span>
              </div>
            </div>

            {/* Stage pipeline */}
            <div className="mt-5 flex items-center gap-1">
              {stages.map((stage, i) => {
                const isPast = i < project.currentStage;
                const isCurrent = i === project.currentStage;
                return (
                  <div key={stage} className="flex-1 flex flex-col items-center gap-1.5">
                    <div
                      className={`w-full h-2 rounded-full transition-all ${
                        isPast
                          ? 'bg-[#2ADD1B]'
                          : isCurrent
                          ? 'bg-[#2ADD1B]/60'
                          : 'bg-white/5'
                      }`}
                    />
                    <span
                      className={`text-[9px] sm:text-[10px] font-medium ${
                        isCurrent ? 'text-[#2ADD1B]' : isPast ? 'text-white/50' : 'text-white/20'
                      }`}
                    >
                      {stage}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Bottom row */}
            <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Progress bar */}
              <div className="flex items-center gap-3 flex-1">
                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#2ADD1B] to-[#2ADD1B]/60 rounded-full transition-all duration-500"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
                <span className="text-sm font-display text-[#2ADD1B] w-12 text-right">
                  {project.progress}%
                </span>
              </div>

              {/* Dates */}
              <div className="flex items-center gap-4 text-xs text-white/30">
                <span>Started: {project.started}</span>
                <span>Est: {project.estimated}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

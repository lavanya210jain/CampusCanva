import { useDialog } from '../../hooks/useDialog';
import React from 'react';
import { Database, Key, GitFork, Code2, X, ShieldCheck } from 'lucide-react';
import { useDemo } from '../../context/DemoContext';

export const DBMSInspectorDrawer: React.FC = () => {
  const { inspectorData, closeInspector } = useDemo();

  const dialogRef = useDialog(!!inspectorData, closeInspector);
  if (!inspectorData) return null;

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="DBMS Schema Inspector" className="fixed inset-0 z-[60] flex justify-end bg-slate-900/30 backdrop-blur-xs transition-opacity animate-fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-slide-left">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-600 text-white rounded-xl shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-slate-100">DBMS Schema Inspector</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                  Lab Viva Mode
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Relational mapping & live query analysis</p>
            </div>
          </div>
          <button
            aria-label="Close SQL inspector"
            onClick={closeInspector}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Entity Name & Primary Key */}
          <div className="bg-teal-50/50 dark:bg-teal-950/50 border border-teal-100 dark:border-teal-800 rounded-xl p-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-300">Relational Table</span>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">{inspectorData.entity}</div>

            <div className="mt-3 flex items-start gap-2 pt-3 border-t border-teal-100/70 dark:border-teal-800/70">
              <Key className="w-4 h-4 text-amber-600 dark:text-amber-300 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Primary Key Constraint:</span>
                <div className="text-xs font-mono font-medium text-teal-950 dark:text-teal-200 mt-0.5 bg-white/80 dark:bg-slate-900/80 px-2 py-1 rounded-md border border-teal-100 dark:border-teal-800">
                  {inspectorData.primaryKey}
                </div>
              </div>
            </div>
          </div>

          {/* Foreign Keys & Referential Integrity */}
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              <GitFork className="w-4 h-4 text-teal-600 dark:text-teal-300" />
              <span>Foreign Key Dependencies</span>
            </div>
            <div className="space-y-1.5">
              {inspectorData.foreignKeys.map((fk, idx) => (
                <div
                  key={idx}
                  className="text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 px-3 py-2 rounded-lg"
                >
                  {fk}
                </div>
              ))}
            </div>
          </div>

          {/* Cardinality & Relationships */}
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />
              <span>ER Cardinality & Modeling</span>
            </div>
            <ul className="list-disc list-inside space-y-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-xs text-slate-700 dark:text-slate-200">
              {inspectorData.relationships.map((rel, idx) => (
                <li key={idx} className="leading-relaxed">
                  {rel}
                </li>
              ))}
            </ul>
          </div>

          {/* Executed SQL Query */}
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              <Code2 className="w-4 h-4 text-orange-600 dark:text-orange-300" />
              <span>Equivalent Relational SQL Query</span>
            </div>
            <pre className="bg-slate-900 text-slate-100 text-xs p-3.5 rounded-xl font-mono overflow-x-auto leading-relaxed border border-slate-800">
              <code>{inspectorData.sampleSQL}</code>
            </pre>
          </div>

          {/* Live Tuple Attributes */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
              Current Tuple Attributes (JSON Data)
            </span>
            <pre className="bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs p-3.5 rounded-xl font-mono overflow-x-auto max-h-48 border border-slate-200 dark:border-slate-800">
              <code>{JSON.stringify(inspectorData.attributes, null, 2)}</code>
            </pre>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Netaji Subhas University of Technology</span>
          <span className="font-semibold text-teal-600 dark:text-teal-300">DBMS Lab Project</span>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Database,
  Home,
  Compass,
  FolderHeart,
  MapPin,
  Clock,
  Bell,
  User,
  RotateCcw,
  Sparkles,
  Info,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { isMockMode } from '../../services/api';
import { useDemo } from '../../context/DemoContext';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface SidebarProps {
  unreadCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ unreadCount = 0 }) => {
  const { currentUser } = useAuth();
  const { resetDemoData, isDemoMode } = useDemo();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Home },
    { name: 'Explore Memories', path: '/explore', icon: Compass },
    { name: 'My Spaces', path: '/my-spaces', icon: FolderHeart },
    { name: 'Campus Spots', path: '/spots', icon: MapPin },
    { name: 'Time Capsules', path: '/time-capsules', icon: Clock },
    { name: 'Notifications', path: '/notifications', icon: Bell, badge: unreadCount },
    { name: 'Database Lab', path: '/database-lab', icon: Database },
    { name: 'My Profile', path: '/profile', icon: User },
  ];

  return (
    <>
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 hidden md:flex flex-col shrink-0 min-h-[calc(100vh-4rem)] p-4 justify-between">
        <div className="space-y-6">
          {/* Main Navigation Links */}
          <nav className="space-y-1">
            <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Menu
            </div>
            {navItems.filter(item => item.path !== '/database-lab' || isDemoMode).map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-semibold shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-950'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="px-2 py-0.5 text-xs font-bold bg-rose-500 text-white rounded-full">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Quick Demo Info Pill */}
          {isDemoMode && (
            <div className="p-3 bg-gradient-to-br from-teal-50/70 dark:from-teal-950/70 to-orange-50/70 dark:to-orange-950/70 border border-teal-100 dark:border-teal-800 rounded-2xl text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-teal-900 dark:text-teal-200">
                <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-300" />
                <span>DBMS Lab Project</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                Netaji Subhas Univ of Tech
                <br />
                Guided by: <span className="font-semibold text-slate-900 dark:text-slate-100">Prof. Vivek Mehta</span>
              </p>
            </div>
          )}
        </div>

        {/* Bottom Section: Active Persona & Reset Button */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          {currentUser && (
            <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
                {currentUser.full_name[0]}
              </div>
              <div className="overflow-hidden flex-1">
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{currentUser.full_name}</div>
                <div className="text-[10px] text-teal-600 dark:text-teal-300 font-bold uppercase tracking-wider truncate">
                  {currentUser.user_type}
                  {currentUser.student && ` • ${currentUser.student.roll_number}`}
                </div>
              </div>
            </div>
          )}

          {/* MySQL reset is an explicit CLI operation, never a UI action. */}
          {isMockMode && <button
            onClick={() => setShowResetConfirm(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950 border border-slate-200 dark:border-slate-800 hover:border-rose-200 dark:hover:border-rose-800 rounded-xl transition"
            title="Reset database to initial seeded state"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Practice Data</span>
          </button>}
        </div>
      </aside>

      {/* Confirmation Dialog for Reset */}
      <ConfirmDialog
        isOpen={showResetConfirm}
        title="Reset Demo Database?"
        message="This will restore all tables (users, spaces, media, comments, reactions, and time capsules) back to the clean NSUT demo seed state."
        confirmLabel="Reset Everything"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={() => {
          setShowResetConfirm(false);
          resetDemoData();
        }}
        onCancel={() => setShowResetConfirm(false)}
      />
    </>
  );
};

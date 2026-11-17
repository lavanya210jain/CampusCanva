import { ThemeToggle } from '../common/ThemeToggle';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  PlusCircle,
  Bell,
  Database,
  User as UserIcon,
  LogOut,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDemo } from '../../context/DemoContext';
import { ImageWithFallback } from '../common/ImageWithFallback';

interface NavbarProps {
  onOpenCreateModal: () => void;
  unreadCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenCreateModal, unreadCount = 0 }) => {
  const { currentUser, logout } = useAuth();
  const { isDemoMode, toggleDemoMode } = useDemo();
  const [searchQuery, setSearchQuery] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/explore?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Brand Logo */}
        <Link to="/dashboard" className="flex items-center gap-2 sm:gap-3 shrink-0 group">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-teal-600 via-teal-700 to-orange-600 flex items-center justify-center text-white shadow-md shadow-teal-100 dark:shadow-black/10 group-hover:scale-105 transition-transform">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm sm:text-lg tracking-tight text-slate-900 dark:text-slate-100">CampusCanva</span>
              <span className="hidden sm:inline text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-sm bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-100 dark:border-teal-800">
                NSUT
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">A Living Digital Archive</p>
          </div>
        </Link>

        {/* Center: Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-lg hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search memories, campus spots, captions, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:bg-white dark:focus:bg-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 dark:focus:ring-teal-800 transition"
            />
          </div>
        </form>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 sm:gap-3">
          <ThemeToggle />
          {/* SQL Inspector Toggle */}
          <button
            aria-label="SQL Inspector"
            aria-pressed={isDemoMode}
            onClick={toggleDemoMode}
            className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
              isDemoMode
                ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
            title="Toggle SQL Inspector"
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">SQL Inspector</span>
          </button>

          {/* Create Space Button */}
          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-2 px-2 sm:px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-xs shadow-teal-100 dark:shadow-black/10"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">New Space</span>
          </button>

          {/* Notifications Bell */}
          <Link
            to="/notifications"
            className="relative p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900"></span>
            )}
          </Link>

          {/* User Avatar Menu */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-teal-100 dark:hover:ring-teal-800 transition"
            >
              <ImageWithFallback variant="avatar"
                    src={currentUser?.avatar_url}
                alt={currentUser?.full_name || 'User'}
                className="w-9 h-9 rounded-full ring-1 ring-slate-200 dark:ring-slate-800"
              />
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-fade-in">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">{currentUser?.full_name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{currentUser?.email}</div>
                  <span className="mt-1 inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
                    {currentUser?.user_type}
                  </span>
                </div>

                <div className="py-1">
                  <Link
                    to="/profile"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-950 transition"
                  >
                    <UserIcon className="w-4 h-4 text-slate-400" />
                    <span>View Profile</span>
                  </Link>
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

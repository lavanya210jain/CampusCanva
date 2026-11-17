import { ThemeToggle } from '../components/common/ThemeToggle';
import { DatabaseStatus } from '../components/common/DatabaseStatus';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layers, Eye, EyeOff, Lock, Mail, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim() || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="absolute right-4 top-4"><ThemeToggle /></div>
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-3 group">
          <div className="w-12 h-12 rounded-2xl bg-teal-600 flex items-center justify-center text-white shadow-lg shadow-teal-100 dark:shadow-black/10 group-hover:scale-105 transition-transform">
            <Layers className="w-6 h-6" />
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-slate-900 dark:text-slate-100">CampusCanva</span>
        </Link>
        <h2 className="mt-4 text-2xl font-bold text-slate-900 dark:text-slate-100">Sign in to your account</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Or{' '}
          <Link to="/register" className="font-semibold text-teal-600 dark:text-teal-300 hover:text-teal-500 dark:hover:text-teal-400">
            register with your NSUT student or faculty ID
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 sm:px-10 shadow-xl border border-slate-200/80 dark:border-slate-800/80 rounded-3xl space-y-6">
          <DatabaseStatus />
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 text-xs font-medium text-rose-700 dark:text-rose-300">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1">
                College Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name.roll@nsut.ac.in"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-hidden focus:bg-white dark:focus:bg-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 dark:focus:ring-teal-800 transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-hidden focus:bg-white dark:focus:bg-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 dark:focus:ring-teal-800 transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl shadow-md shadow-teal-100 dark:shadow-black/10 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-2 text-center text-[11px] text-slate-400">
            Sign in with your email and password. Authentication uses
            bcrypt and database-backed sessions on the Express/MySQL backend.
          </div>
        </div>
      </div>
    </div>
  );
};

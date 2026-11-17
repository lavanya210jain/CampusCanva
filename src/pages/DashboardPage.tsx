import { MediaThumbnail } from '../components/common/MediaThumbnail';
import { DataError } from '../components/common/DataError';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Layers,
  Image as ImageIcon,
  Users,
  Clock,
  ArrowRight,
  MapPin,
  TrendingUp,
  PlusCircle,
  Play,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDemo } from '../context/DemoContext';
import { api } from '../services/api';
import { MemorySpace, MediaItem, CampusSpot, FullUserProfile, User } from '../types';
import { SpaceCard } from '../components/cards/SpaceCard';
import { TimeCapsuleCard } from '../components/cards/TimeCapsuleCard';
import { ImageWithFallback } from '../components/common/ImageWithFallback';

interface DashboardPageProps {
  onOpenCreateModal: () => void;
  onOpenMediaLightbox: (media: MediaItem) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onOpenCreateModal,
  onOpenMediaLightbox,
}) => {
  const { currentUser, allUsers } = useAuth();
  const { openInspector } = useDemo();

  const [spaces, setSpaces] = useState<MemorySpace[]>([]);
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [spots, setSpots] = useState<CampusSpot[]>([]);
  const [stats, setStats] = useState({
    totalSpaces: 0,
    totalMedia: 0,
    totalUsers: 0,
    upcomingCapsules: 0,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [loadedSpaces, loadedMedia, loadedSpots, loadedStats] = await Promise.all([
          api.getMemorySpaces(),
          api.getAllMedia(),
          api.getCampusSpots(),
          api.getGlobalStats(),
        ]);
        setSpaces(loadedSpaces);
        setMediaList(loadedMedia);
        setSpots(loadedSpots);
        setStats(loadedStats);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Could not load data');
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  const featuredSpaces = spaces.slice(0, 3);
  const recentMedia = mediaList.slice(0, 8);
  const timeCapsuleSpaces = spaces.filter((s) => s.is_time_locked).slice(0, 2);

  return (
    <div className="space-y-10 pb-16">
      <DataError message={loadError} />
      {/* 1. Visually Attractive Hero Banner */}
      <section className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-teal-900 via-teal-800 to-orange-900 text-white p-6 sm:p-10 shadow-xl border border-teal-700/50">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 dark:bg-slate-900/10 backdrop-blur-md text-teal-200 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>NSUT Campus Memory Hub</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            Welcome back, {currentUser?.full_name.split(' ')[0] || 'Friend'}! 👋
          </h1>
          <p className="mt-2 text-sm sm:text-base text-teal-100/90 leading-relaxed">
            Preserve, relive, and tag campus fests, memories, and society triumphs in a relational
            archive built for students and faculty.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenCreateModal}
              className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-900 text-teal-900 dark:text-teal-200 hover:bg-teal-50 dark:hover:bg-teal-950 font-bold text-xs sm:text-sm rounded-xl shadow-md transition"
            >
              <PlusCircle className="w-4 h-4 text-teal-600 dark:text-teal-300" />
              <span>Create Memory Space</span>
            </button>
            <Link
              to="/explore"
              className="flex items-center gap-2 px-5 py-2.5 bg-white/10 dark:bg-slate-900/10 hover:bg-white/20 dark:hover:bg-slate-900/20 text-white font-semibold text-xs sm:text-sm rounded-xl backdrop-blur-md border border-white/20 dark:border-slate-900/20 transition"
            >
              <span>Explore Gallery</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Decorative background circles */}
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-96 h-96 rounded-full bg-orange-500/20 blur-3xl pointer-events-none"></div>
        <div className="absolute right-40 bottom-0 w-64 h-64 rounded-full bg-teal-500/20 blur-2xl pointer-events-none"></div>
      </section>

      {/* 2. Dynamic Statistics Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Spaces</div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 mt-1 font-mono">
              {stats.totalSpaces}
            </div>
            <div className="text-[11px] text-teal-600 dark:text-teal-300 font-semibold mt-1">Collab hubs</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-300 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Media Items</div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 mt-1 font-mono">
              {stats.totalMedia}
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-300 font-semibold mt-1">Photos & Videos</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0">
            <ImageIcon className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Community</div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 mt-1 font-mono">
              {stats.totalUsers}
            </div>
            <div className="text-[11px] text-orange-600 dark:text-orange-300 font-semibold mt-1">Students & Faculty</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-300 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Time Capsules</div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 mt-1 font-mono">
              {stats.upcomingCapsules}
            </div>
            <div className="text-[11px] text-amber-600 dark:text-amber-300 font-semibold mt-1">Time-locked</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </section>

      {/* 3. Featured Memory Spaces */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Featured Memory Spaces</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Popular campus experiences, fests, and batch hubs</p>
          </div>
          <Link
            to="/explore"
            className="text-xs font-bold text-teal-600 dark:text-teal-300 hover:text-teal-700 dark:hover:text-teal-300 flex items-center gap-1"
          >
            <span>View All ({spaces.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredSpaces.map((space) => {
            const spot = spots.find((s) => s.spot_id === space.spot_id);
            const count = mediaList.filter((m) => m.space_id === space.space_id).length;
            return (
              <SpaceCard
                key={space.space_id}
                space={space}
                spot={spot}
                mediaCount={count}
                memberCount={4}
              />
            );
          })}
        </div>
      </section>

      {/* 4. Recently Uploaded Memories (Masonry style feed) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Recently Uploaded Memories</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Latest photographs and video moments across NSUT</p>
          </div>
          <span className="text-xs text-slate-400">Click any memory to react & comment</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {recentMedia.map((m) => (
            <div
              key={m.media_id}
              onClick={() => onOpenMediaLightbox(m)}
              className="group relative aspect-4/3 rounded-2xl overflow-hidden bg-slate-900 cursor-pointer shadow-xs hover:shadow-xl transition-all duration-300"
            >
              <MediaThumbnail media={m} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />

              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                <p className="text-xs font-medium text-white line-clamp-1">{m.caption}</p>
                <div className="flex items-center justify-between mt-1 text-[10px] text-slate-300">
                  <span className="uppercase font-bold text-teal-300">{m.media_type}</span>
                  <span>{new Date(m.uploaded_at).toLocaleDateString()}</span>
                </div>
              </div>

              {m.media_type === 'VIDEO' && (
                <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-slate-900/70 text-white flex items-center justify-center backdrop-blur-xs">
                  <Play className="w-3.5 h-3.5 ml-0.5 fill-white" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 5. Popular Campus Spots & Upcoming Time Capsules Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Popular Campus Spots */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-teal-600 dark:text-teal-300" />
              <span>Campus Spots</span>
            </h3>
            <Link to="/spots" className="text-xs font-bold text-teal-600 dark:text-teal-300 hover:text-teal-700 dark:hover:text-teal-300">
              All Spots
            </Link>
          </div>

          <div className="space-y-2.5">
            {spots.map((spot) => {
              const spotSpaces = spaces.filter((s) => s.spot_id === spot.spot_id);
              return (
                <Link
                  key={spot.spot_id}
                  to={`/explore?spot=${spot.spot_id}`}
                  className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-950 transition border border-transparent hover:border-slate-200 dark:hover:border-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <ImageWithFallback
                      src={spot.cover_url}
                      alt={spot.spot_name}
                      className="w-10 h-10 rounded-xl object-cover shrink-0"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{spot.spot_name}</div>
                      <div className="text-[11px] text-slate-400">{spotSpaces.length} memory spaces</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300" />
                </Link>
              );
            })}
          </div>
        </div>

        {/* Upcoming Time Capsules */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <span>Time-Locked Memory Capsules</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Auto-reveal countdown vaults</p>
            </div>
            <Link to="/time-capsules" className="text-xs font-bold text-amber-600 dark:text-amber-300 hover:text-amber-700 dark:hover:text-amber-300">
              View All Capsules
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {timeCapsuleSpaces.map((tc) => {
              const spot = spots.find((s) => s.spot_id === tc.spot_id);
              return <TimeCapsuleCard key={tc.space_id} space={tc} spot={spot} />;
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

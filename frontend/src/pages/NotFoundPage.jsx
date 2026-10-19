import React from "react";
import { Link } from "react-router-dom";
import { Compass, Home, ArrowLeft } from "lucide-react";

export const NotFoundPage = () => {
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center p-8 sm:p-12 rounded-3xl bg-zinc-950/80 border border-zinc-900 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-pink-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-center text-purple-400 mb-6 shadow-xl shadow-purple-950/40">
            <Compass size={36} className="animate-pulse" />
          </div>

          <h1 className="text-6xl font-extrabold text-white tracking-tighter mb-2 bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            404
          </h1>
          <h2 className="text-xl font-bold text-white mb-3">Page Not Found</h2>
          <p className="text-zinc-500 text-xs sm:text-sm leading-relaxed mb-8">
            The page you're looking for doesn't exist, has been removed, or was moved to another loop.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-lg shadow-purple-950 text-decoration-none"
            >
              <Home size={15} />
              Return Home
            </Link>
            <button
              onClick={() => window.history.back()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white font-semibold text-xs border border-zinc-800 transition-all cursor-pointer"
            >
              <ArrowLeft size={15} />
              Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

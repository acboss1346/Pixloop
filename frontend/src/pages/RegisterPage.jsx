import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Camera, Loader2 } from "lucide-react";

export const RegisterPage = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const success = await register(username, email, password);
    if (success) {
      navigate("/");
    } else {
      setError("Registration failed. Email or username might be taken.");
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-[85vh] px-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-zinc-950 rounded-2xl border border-zinc-900 shadow-2xl relative overflow-hidden">
        {/* Glow decorative element */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-purple-600/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

        <div className="text-center space-y-3">
          <div className="mx-auto w-12 h-12 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-white shadow-xl">
            <Camera size={24} />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Create an account</h2>
          <p className="text-sm text-zinc-500">Join PixLoop community today</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className="p-3 text-xs font-semibold text-red-400 bg-red-950/20 border border-red-900/30 rounded-xl text-center">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Username</label>
              <input
                type="text"
                required
                className="w-full px-4 py-3 mt-2 bg-zinc-900 border border-zinc-800 focus:border-purple-500 rounded-xl text-white text-sm outline-none transition-all"
                placeholder="johndoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Email address</label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 mt-2 bg-zinc-900 border border-zinc-800 focus:border-purple-500 rounded-xl text-white text-sm outline-none transition-all"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Password</label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 mt-2 bg-zinc-900 border border-zinc-800 focus:border-purple-500 rounded-xl text-white text-sm outline-none transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 text-sm font-bold text-black bg-white hover:bg-zinc-200 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <p className="text-center text-sm text-zinc-500 mt-6">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-purple-400 hover:text-purple-300 transition-colors">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
};

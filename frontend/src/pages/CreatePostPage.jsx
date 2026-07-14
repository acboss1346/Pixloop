import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { ImagePlus, X, Loader2 } from "lucide-react";

export const CreatePostPage = () => {
  const [caption, setCaption] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [communities, setCommunities] = useState([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingCommunities, setFetchingCommunities] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchJoinedCommunities = async () => {
      try {
        setFetchingCommunities(true);
        const res = await api.get("/communities");
        if (res.data && res.data.data) {
          // Filter to communities where the user is a member
          const joined = res.data.data.filter(c => c.is_member);
          setCommunities(joined);
        }
      } catch (err) {
        console.error("Failed to load joined communities", err);
      } finally {
        setFetchingCommunities(false);
      }
    };
    fetchJoinedCommunities();
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size should be less than 5MB");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      setError("");
    }
  };

  const handleClearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!imageFile) {
      setError("Please select an image");
      return;
    }

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("caption", caption);
    if (selectedCommunityId) {
      formData.append("community_id", selectedCommunityId);
    }

    try {
      await api.post("/posts", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      // If posting to community, navigate to the community page, else to feed
      if (selectedCommunityId) {
        navigate(`/groups/${selectedCommunityId}`);
      } else {
        navigate("/");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create post");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8">
      <div className="bg-zinc-950 rounded-2xl border border-zinc-900 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-purple-600/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

        <h1 className="text-2xl font-bold text-white mb-6 tracking-tight border-b border-zinc-900 pb-4 relative z-10">Create New Post</h1>
        
        {error && (
          <div className="mb-6 p-4 text-sm font-semibold text-red-400 bg-red-950/20 border border-red-900/30 rounded-xl relative z-10">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          {/* Image Upload Area */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Photo</label>
            {!imagePreview ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-800 hover:border-zinc-700 rounded-2xl p-12 text-center cursor-pointer hover:bg-zinc-900/30 transition-all flex flex-col items-center justify-center min-h-[280px]"
              >
                <ImagePlus size={40} className="text-zinc-600 mb-3" />
                <p className="text-white text-sm font-medium mb-1">Click to select an image</p>
                <p className="text-xs text-zinc-500">PNG, JPG up to 5MB</p>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-square flex items-center justify-center border border-zinc-900 max-h-[360px]">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={handleClearImage}
                  className="absolute top-4 right-4 p-2 bg-black/70 hover:bg-black/90 text-white rounded-full backdrop-blur-sm transition-colors border-none cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* Destination Selector */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Post to</label>
            <select
              value={selectedCommunityId}
              onChange={(e) => setSelectedCommunityId(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl focus:border-purple-500 text-white text-sm outline-none transition-all cursor-pointer"
              disabled={fetchingCommunities}
            >
              <option value="">My Feed (Personal Profile)</option>
              {communities.map((c) => (
                <option key={c.id} value={c.id}>
                  Community: {c.name}
                </option>
              ))}
            </select>
            {fetchingCommunities && (
              <p className="text-xs text-zinc-500 mt-1">Loading joined communities...</p>
            )}
          </div>

          {/* Caption Input */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Caption</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption..."
              rows={4}
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 focus:border-purple-500 rounded-xl text-white text-sm outline-none resize-none transition-all"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-900">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="px-5 py-2.5 text-xs font-semibold text-zinc-400 hover:text-white bg-transparent border-none cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !imageFile}
              className="px-6 py-2.5 text-xs font-bold text-black bg-white hover:bg-zinc-200 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? "Sharing..." : "Share"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

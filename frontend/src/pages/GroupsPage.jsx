import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { Search, Users, Plus, X, Upload, Loader2 } from "lucide-react";

export const GroupsPage = () => {
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [newGroupLogo, setNewGroupLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [creating, setCreating] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchCommunities();
  }, []);

  const fetchCommunities = async () => {
    try {
      setLoading(true);
      const res = await api.get("/communities");
      setCommunities(res.data.data);
    } catch (err) {
      console.error("Failed to fetch communities", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewGroupLogo(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    
    setCreating(true);
    try {
      const formData = new FormData();
      formData.append('name', newGroupName);
      formData.append('description', newGroupDesc);
      formData.append('icon', '🌟'); // keep standard fallback string inside DB
      if (newGroupLogo) {
        formData.append('logo', newGroupLogo);
      }

      const res = await api.post("/communities", formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        setCommunities([res.data.data, ...communities]);
        setShowCreateGroup(false);
        setNewGroupName("");
        setNewGroupDesc("");
        setNewGroupLogo(null);
        setLogoPreview("");
      }
    } catch (err) {
      console.error("Failed to create group", err);
      alert(err.response?.data?.message || "Failed to create group");
    } finally {
      setCreating(false);
    }
  };

  const handleJoinGroup = async (communityId, e) => {
    e.preventDefault(); // prevent navigation
    try {
      const res = await api.post(`/communities/${communityId}/join`);
      if (res.data.success) {
        setCommunities(communities.map(c => 
          c.id === communityId ? { ...c, is_member: true, memberCount: parseInt(c.memberCount) + 1 } : c
        ));
      }
    } catch (err) {
      console.error("Failed to join group", err);
      alert(err.response?.data?.message || "Failed to join group");
    }
  };

  const filteredCommunities = communities.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Communities</h1>
          <p className="text-zinc-500 text-sm mt-1">Discover and join groups based on your interests.</p>
        </div>
        <button 
          onClick={() => setShowCreateGroup(true)}
          className="flex items-center gap-2 bg-white text-black hover:opacity-90 px-5 py-2.5 rounded-xl font-bold transition-all text-sm"
        >
          <Plus size={18} />
          Create Community
        </button>
      </div>

      {/* Search Input */}
      <div className="relative mb-8">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-zinc-500" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-4 py-3 border border-zinc-900 rounded-xl leading-5 bg-zinc-950 text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm transition-all"
          placeholder="Search communities by name or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Loading list */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div key={n} className="bg-zinc-950 border border-zinc-900 rounded-xl p-6 h-48 animate-pulse">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-zinc-900 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-zinc-900 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-zinc-900 rounded w-1/2"></div>
                </div>
              </div>
              <div className="h-3 bg-zinc-900 rounded w-full mb-2"></div>
              <div className="h-3 bg-zinc-900 rounded w-5/6"></div>
            </div>
          ))}
        </div>
      ) : filteredCommunities.length === 0 ? (
        <div className="text-center py-20 bg-zinc-950 rounded-xl border border-zinc-900">
          <div className="text-5xl mb-4 text-zinc-700">🔍</div>
          <h3 className="text-lg font-bold text-white mb-1">No communities found</h3>
          <p className="text-zinc-500 text-sm">Try adjusting your search query or create a new group!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCommunities.map((community) => (
            <Link 
              to={`/groups/${community.id}`} 
              key={community.id} 
              className="bg-zinc-950 border border-zinc-900 hover:border-zinc-800 rounded-xl p-6 transition-all flex flex-col h-full group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-900 flex items-center justify-center flex-shrink-0 border border-zinc-800">
                    {community.logo_url ? (
                      <img src={community.logo_url} alt={community.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-bold text-white">
                        {community.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white group-hover:text-purple-400 transition-colors line-clamp-1">{community.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-zinc-500 mt-1">
                      <Users size={12} />
                      <span>{community.memberCount} members</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <p className="text-zinc-400 text-xs mb-6 flex-grow line-clamp-3 leading-relaxed">
                {community.description || "No description provided for this group."}
              </p>
              
              <div className="mt-auto flex justify-end">
                {community.is_member ? (
                  <span className="text-xs font-semibold bg-zinc-900 text-zinc-400 px-3 py-1.5 rounded-lg border border-zinc-800">
                    Joined
                  </span>
                ) : (
                  <button 
                    onClick={(e) => handleJoinGroup(community.id, e)}
                    className="text-xs font-semibold bg-white text-black hover:opacity-90 px-4 py-1.5 rounded-lg transition-colors"
                  >
                    Join
                  </button>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-zinc-950 border border-zinc-800 p-6 sm:p-8 rounded-2xl w-full max-w-md shadow-2xl relative">
            <button 
              onClick={() => { setShowCreateGroup(false); setLogoPreview(""); setNewGroupLogo(null); }}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-full hover:bg-zinc-900 transition-colors"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-bold mb-6 text-white tracking-tight">Create New Community</h2>
            
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block mb-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Community Name</label>
                <input 
                  type="text" 
                  value={newGroupName} 
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="E.g., Design Enthusiasts"
                  className="w-full p-3 rounded-xl border border-zinc-800 bg-zinc-900 text-white focus:ring-1 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-sm"
                  required
                />
              </div>

              <div>
                <label className="block mb-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Description</label>
                <textarea 
                  value={newGroupDesc} 
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="What is this community about?"
                  className="w-full p-3 rounded-xl border border-zinc-800 bg-zinc-900 text-white min-h-[100px] focus:ring-1 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-sm resize-none"
                  rows={3}
                />
              </div>

              <div>
                <label className="block mb-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Community Logo</label>
                <div className="flex items-center gap-4">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo preview" className="w-16 h-16 rounded-full object-cover border border-zinc-800" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-850 flex items-center justify-center text-zinc-500">
                      <ImageIcon size={24} />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 rounded-xl text-xs font-semibold transition-colors"
                  >
                    <Upload size={14} />
                    Upload Image
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-900">
                <button 
                  type="button" 
                  onClick={() => { setShowCreateGroup(false); setLogoPreview(""); setNewGroupLogo(null); }}
                  className="px-4 py-2 bg-transparent border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-xl transition-all text-sm font-semibold"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-white text-black hover:opacity-90 rounded-xl transition-all text-sm font-semibold flex items-center gap-2"
                  disabled={creating || !newGroupName.trim()}
                >
                  {creating && <Loader2 size={16} className="animate-spin" />}
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

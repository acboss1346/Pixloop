import { Route, Routes, Navigate } from "react-router-dom";
import { Home } from "./pages/Home";
import { Navbar } from "./components/Navbar";
import { CreatePostPage } from "./pages/CreatePostPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ProfilePage } from "./pages/ProfilePage";
import { PostDetailPage } from "./pages/PostDetailPage";
import { GroupsPage } from "./pages/GroupsPage";
import { GroupDetailPage } from "./pages/GroupDetailPage";
import { MessagesPage } from "./pages/MessagesPage";
import { useAuth } from "./context/AuthContext";

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col md:flex-row">
      {user && <Navbar />}
      <main className={`flex-grow min-w-0 ${user ? 'pb-20 md:pb-8 md:pl-64' : ''}`}>
        <div className="max-w-5xl mx-auto px-4 py-6">
          <Routes>
            <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
            <Route path="/register" element={!user ? <RegisterPage /> : <Navigate to="/" />} />
            
            <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/create" element={<ProtectedRoute><CreatePostPage /></ProtectedRoute>} />
            <Route path="/profile/:username?" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/post/:id" element={<ProtectedRoute><PostDetailPage /></ProtectedRoute>} />
            <Route path="/groups" element={<ProtectedRoute><GroupsPage /></ProtectedRoute>} />
            <Route path="/groups/:id" element={<ProtectedRoute><GroupDetailPage /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default App;

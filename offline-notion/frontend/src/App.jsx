import React, { useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import Sidebar from './components/sidebar/Sidebar';
import PageEditor from './components/editor/PageEditor';
import SearchModal from './components/ui/SearchModal';
import { useAppStore } from './store/appStore';

function WorkspacePage() {
  const { pageId } = useParams();
  const { setCurrentPage } = useAppStore();

  useEffect(() => {
    if (pageId) setCurrentPage(pageId);
  }, [pageId, setCurrentPage]);

  return <PageEditor pageId={pageId} />;
}

function EmptyState() {
  const navigate = useNavigate();
  const { createPage } = useAppStore();

  const handleCreate = async () => {
    const page = await createPage(null, 'Untitled');
    if (page) navigate(`/page/${page.id}`);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
      <div className="text-6xl mb-6">📝</div>
      <h2 className="text-2xl font-semibold text-notion-text mb-2">No page selected</h2>
      <p className="text-notion-muted mb-6">Select a page from the sidebar or create a new one.</p>
      <button onClick={handleCreate} className="btn-primary">
        Create New Page
      </button>
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const { loadPages, pages, createPage, searchOpen, setSearchOpen } = useAppStore();

  useEffect(() => {
    loadPages().then((pages) => {
      if (pages.length > 0 && window.location.pathname === '/') {
        navigate(`/page/${pages[0].id}`);
      }
    });
  }, []);

  // Global keyboard shortcuts
  const handleKeyDown = useCallback((e) => {
    // Cmd/Ctrl + P → search
    if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
      e.preventDefault();
      setSearchOpen(true);
    }
    // Cmd/Ctrl + N → new page
    if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
      e.preventDefault();
      createPage(null, 'Untitled').then(page => {
        if (page) navigate(`/page/${page.id}`);
      });
    }
    // Escape → close search
    if (e.key === 'Escape') {
      setSearchOpen(false);
    }
  }, [createPage, navigate, setSearchOpen]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex h-screen overflow-hidden bg-notion-bg">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Routes>
          <Route path="/" element={<EmptyState />} />
          <Route path="/page/:pageId" element={<WorkspacePage />} />
        </Routes>
      </main>
      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}
    </div>
  );
}

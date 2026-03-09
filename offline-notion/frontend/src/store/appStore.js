import { create } from 'zustand';
import { pagesApi } from '../utils/api';

export const useAppStore = create((set, get) => ({
  // Pages
  pages: [],
  currentPageId: null,
  expandedPages: new Set(),
  
  // UI State
  sidebarOpen: true,
  searchOpen: false,
  aiPanelOpen: false,
  darkMode: true,
  
  // Loading
  loading: false,
  
  // Actions
  setPages: (pages) => set({ pages }),
  
  setCurrentPage: (id) => set({ currentPageId: id }),
  
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  
  setSearchOpen: (open) => set({ searchOpen: open }),
  
  setAiPanelOpen: (open) => set({ aiPanelOpen: open }),
  
  toggleExpanded: (id) => set((s) => {
    const expanded = new Set(s.expandedPages);
    if (expanded.has(id)) expanded.delete(id);
    else expanded.add(id);
    return { expandedPages: expanded };
  }),
  
  isExpanded: (id) => get().expandedPages.has(id),
  
  // Load all pages
  loadPages: async () => {
    try {
      const pages = await pagesApi.getAll();
      set({ pages });
      return pages;
    } catch (err) {
      console.error('Failed to load pages:', err);
      return [];
    }
  },

  // Create page
  createPage: async (parentId = null, title = 'Untitled') => {
    try {
      const page = await pagesApi.create({ parent_id: parentId, title });
      set((s) => ({ pages: [...s.pages, page] }));
      
      // Auto-expand parent
      if (parentId) {
        set((s) => {
          const expanded = new Set(s.expandedPages);
          expanded.add(parentId);
          return { expandedPages: expanded };
        });
      }
      
      return page;
    } catch (err) {
      console.error('Failed to create page:', err);
      return null;
    }
  },

  // Update page
  updatePage: async (id, data) => {
    try {
      const updated = await pagesApi.update(id, data);
      set((s) => ({
        pages: s.pages.map(p => p.id === id ? updated : p)
      }));
      return updated;
    } catch (err) {
      console.error('Failed to update page:', err);
      return null;
    }
  },

  // Delete page
  deletePage: async (id) => {
    try {
      await pagesApi.delete(id);
      set((s) => {
        const pages = s.pages.filter(p => p.id !== id && p.parent_id !== id);
        const currentPageId = s.currentPageId === id ? (pages[0]?.id || null) : s.currentPageId;
        return { pages, currentPageId };
      });
    } catch (err) {
      console.error('Failed to delete page:', err);
    }
  },

  // Get page tree
  getPageTree: () => {
    const pages = get().pages;
    const rootPages = pages.filter(p => !p.parent_id).sort((a, b) => a.position - b.position);
    
    const buildTree = (parentId) => {
      return pages
        .filter(p => p.parent_id === parentId)
        .sort((a, b) => a.position - b.position)
        .map(p => ({ ...p, children: buildTree(p.id) }));
    };
    
    return rootPages.map(p => ({ ...p, children: buildTree(p.id) }));
  },

  // Get page by id
  getPage: (id) => get().pages.find(p => p.id === id),
  
  // Get breadcrumb path
  getBreadcrumb: (id) => {
    const pages = get().pages;
    const path = [];
    let current = pages.find(p => p.id === id);
    
    while (current) {
      path.unshift(current);
      current = pages.find(p => p.id === current.parent_id);
    }
    
    return path;
  },
}));

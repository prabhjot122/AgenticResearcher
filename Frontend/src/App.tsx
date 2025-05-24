"use client"
 
import { ThemeProvider } from "@/components/theme-provider"
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { BubbleSelector } from './components/BubbleSelector';
import { BubbleSelector2 } from './components/BubbleSelector2';
import { NavMenu } from './components/NavMenu';
import HomePage from './pages/HomePage';
import LibraryPage from './pages/LibraryPage';
import EditorPage from './pages/EditorPage';
import InstructionsPage from './pages/InstructionsPage';
import { useState, useEffect } from 'react';
import { LibraryItem } from './types';
import './App.css';
import { AnimatePresence } from 'framer-motion';
import { getResearchResults, getAllDrafts, getDraftById, saveDraftToLibrary, startResearch } from '../services/api';
import { Toaster } from './components/ui/Toaster';
import {  toast } from "@/components/ui/use-toast";
// Function to map backend content style to frontend category
const mapContentStyleToCategory = (contentStyle: string): string => {
  switch (contentStyle?.toLowerCase()) {
    case 'blog post':
      return 'blog-style';
    case 'detailed report':
      return 'detailed-report';
    case 'executive summary':
      return 'executive-summary';
    default:
      return 'blog-style';
  }
};

// App wrapper component to handle router context
const AppRouter = () => {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Router>
        <ChatDemo />
        <Toaster />
      </Router>
    </ThemeProvider>
  );
};

const ChatDemo = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null);
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [activeResearchId, setActiveResearchId] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Load library items from backend on mount
  useEffect(() => {
    const fetchLibraryItems = async () => {
      try {
        const response = await getAllDrafts();
        
        // Convert backend drafts to LibraryItem format
        const items: LibraryItem[] = response.drafts.map(draft => ({
          id: draft.draft_id,
          title: draft.title,
          category: mapContentStyleToCategory(draft.content_style),
          content: draft.draft_content,
          timestamp: new Date(draft.created_at).getTime(),
          references: draft.references
        }));
        
        setLibraryItems(items);
      } catch (error) {
        console.error('Error fetching library items:', error);
      }
    };
    
    fetchLibraryItems();
  }, []);
  
  // Reset loading state on component mount
  useEffect(() => {
    // Reset loading state on component mount
    setIsLoading(false);
    
    // Check if we're on a research page
    const paths = location.pathname.split('/');
    if (paths[1] === 'editor' && paths[2] === 'research' && paths[3]) {
      const researchId = paths[3];
      
      // Check if we have the result in localStorage
      const storedResult = localStorage.getItem(`research_${researchId}`);
      if (storedResult) {
        try {
          const parsedResult = JSON.parse(storedResult);
          setSelectedItem(parsedResult);
          setIsLoading(false);
          setActiveResearchId(researchId);
        } catch (error) {
          console.error('Error parsing stored research result:', error);
          // Fall back to polling
          return pollResearchResults(researchId);
        }
      } else {
        // If not in localStorage, start polling
        setActiveResearchId(researchId);
        return pollResearchResults(researchId);
      }
    }
  }, []); // Empty dependency array to run only once on mount

  // Process URL params
  useEffect(() => {
    const paths = location.pathname.split('/');
    
    // Handle editor routes with research ID
    if (paths[1] === 'editor' && paths[2] === 'research' && paths[3]) {
      const researchId = paths[3];
      console.log('Detected research page with ID:', researchId);
      
      // Check if we already have this research loaded
      if (selectedItem?.researchId === researchId) {
        console.log('Research already loaded in state:', researchId);
        setIsLoading(false);
        return;
      }
      
      // Check if we have the result in localStorage
      const storedResult = localStorage.getItem(`research_${researchId}`);
      if (storedResult) {
        try {
          console.log('Found research in localStorage:', researchId);
          const parsedResult = JSON.parse(storedResult);
          setSelectedItem(parsedResult);
          setIsLoading(false);
          setActiveResearchId(researchId);
        } catch (error) {
          console.error('Error parsing stored research result:', error);
          // Fall back to polling
          setActiveResearchId(researchId);
          return pollResearchResults(researchId);
        }
      } else {
        console.log('Starting polling for research:', researchId);
        // If not in localStorage, start polling
        setActiveResearchId(researchId);
        return pollResearchResults(researchId);
      }
    } else {
      // Clear active research ID when not on a research page
      if (activeResearchId !== null) {
        setActiveResearchId(null);
      }
      
      // Make sure loading is false when viewing regular drafts
      if (isLoading) {
        setIsLoading(false);
      }
    }
    
    // Handle editor routes with draft ID
    if (paths[1] === 'editor' && paths[2] && paths[2] !== 'research') {
      const draftId = paths[2];
      
      // If we don't have the correct item loaded or it doesn't match URL
      if (!selectedItem || selectedItem.id !== draftId) {
        // First check if it's in our local state
        const localItem = libraryItems.find(item => item.id === draftId);
        
        if (localItem) {
          setSelectedItem(localItem);
          // Ensure loading is false for existing items
          setIsLoading(false);
        } else {
          // If not in local state, fetch from API
          fetchDraftById(draftId);
        }
      } else {
        // We already have the correct item loaded
        setIsLoading(false);
      }
    }
    
    // Handle category in library route
    const isLibraryRoute = paths[1] === 'library';
    const category = paths[2];
    
    if (isLibraryRoute && category) {
      if (categoryFilter !== category) {
        setCategoryFilter(category);
      }
    } else if (isLibraryRoute && !category) {
      if (categoryFilter !== null) {
        setCategoryFilter(null);
      }
    }
    
    // Clear selected item when navigating to home
    if (location.pathname === '/') {
      if (selectedItem !== null) {
        setSelectedItem(null);
      }
      if (activeResearchId !== null) {
        setActiveResearchId(null);
      }
      if (isLoading) {
        setIsLoading(false);
      }
    }
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]); // Only depend on location.pathname to prevent infinite loops
  
  // Function to fetch a draft by ID
  const fetchDraftById = async (draftId: string) => {
    try {
      setIsLoading(true);
      const draft = await getDraftById(draftId);
      
      // Convert to LibraryItem format
      const item: LibraryItem = {
        id: draft.draft_id,
        title: draft.title,
        category: mapContentStyleToCategory(draft.content_style),
        content: draft.draft_content,
        timestamp: new Date(draft.created_at).getTime(),
        references: draft.references
      };
      
      setSelectedItem(item);
    } catch (error) {
      console.error(`Error fetching draft ${draftId}:`, error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to poll for research results
  const pollResearchResults = (researchId: string) => {
    let pollInterval: NodeJS.Timeout;
    let pollTimeout: NodeJS.Timeout;
    
    const startPolling = async () => {
      try {
        setIsLoading(true);
        
        // Set a maximum polling time (e.g., 3 minutes)
        pollTimeout = setTimeout(() => {
          clearInterval(pollInterval);
          console.error('Research polling timed out after 3 minutes');
          setIsLoading(false);
          
          // Show a toast notification
          toast({
            title: "Research Timeout",
            description: "The research is taking longer than expected. Please refresh the page to see if results are available.",
            variant: "destructive"
          });
        }, 3 * 60 * 1000); // 3 minutes
        
        // First, check if the research is already completed
        try {
          const initialCheck = await getResearchResults(researchId);
          console.log(`Initial research status check: ${initialCheck.status}`, initialCheck);
          
          if (initialCheck.status === 'completed') {
            // Research is already completed, no need to poll
            console.log('Research already completed, loading results');
            
            // Create a library item from the research results
            const newItem: LibraryItem = {
              id: `temp-${researchId}`,
              title: initialCheck.query.original.split('\n')[0].substring(0, 50) + (initialCheck.query.original.length > 50 ? '...' : ''),
              category: mapContentStyleToCategory(initialCheck.content.style),
              content: initialCheck.content.draft,
              timestamp: Date.now(),
              references: initialCheck.references,
              researchId: researchId
            };
            
            // Store the result in localStorage
            localStorage.setItem(`research_${researchId}`, JSON.stringify(newItem));
            
            setSelectedItem(newItem);
            setIsLoading(false);
            
            // No need to set up polling
            return;
          }
        } catch (error) {
          console.error('Error checking initial research status:', error);
          // Continue with polling
        }
        
        // Poll until research is complete
        pollInterval = setInterval(async () => {
          try {
            console.log(`Polling research ${researchId}...`);
            const result = await getResearchResults(researchId);
            console.log(`Research status: ${result.status}`, result);
            
            if (result.status === 'completed') {
              console.log('Research completed, clearing intervals and updating state');
              
              // Clear intervals immediately
              clearInterval(pollInterval);
              clearTimeout(pollTimeout);
              
              // Create a library item from the research results
              const newItem: LibraryItem = {
                id: `temp-${researchId}`,
                title: result.query.original.split('\n')[0].substring(0, 50) + (result.query.original.length > 50 ? '...' : ''),
                category: mapContentStyleToCategory(result.content.style),
                content: result.content.draft,
                timestamp: Date.now(),
                references: result.references,
                researchId: researchId
              };
              
              // Store the result in localStorage
              localStorage.setItem(`research_${researchId}`, JSON.stringify(newItem));
              
              // Update state with a slight delay to ensure React has time to process
              setTimeout(() => {
                setSelectedItem(newItem);
                setIsLoading(false);
                
                // Show success toast
                toast({
                  title: "Research Complete",
                  description: "Your research has been completed successfully.",
                });
              }, 100);
            } else if (result.status === 'error') {
              console.error('Research failed:', result.message);
              
              // Clear intervals immediately
              clearInterval(pollInterval);
              clearTimeout(pollTimeout);
              
              // Update state with a slight delay
              setTimeout(() => {
                setIsLoading(false);
                
                // Show error toast
                toast({
                  title: "Research Error",
                  description: "There was an error processing your research. Please try again.",
                  variant: "destructive"
                });
              }, 100);
            } else {
              console.log(`Research still in progress: ${result.status}`);
            }
            
          } catch (error) {
            console.error('Error polling research results:', error);
            
            // Clear intervals immediately
            clearInterval(pollInterval);
            clearTimeout(pollTimeout);
            
            // Update state with a slight delay
            setTimeout(() => {
              setIsLoading(false);
              
              // Show error toast
              toast({
                title: "Connection Error",
                description: "There was an error connecting to the research service. Please try again.",
                variant: "destructive"
              });
            }, 100);
          }
        }, 3000); // Poll every 3 seconds
      } catch (error) {
        console.error('Error setting up polling:', error);
        setIsLoading(false);
      }
    };
    
    startPolling();
    
    // Return cleanup function
    return () => {
      console.log('Cleaning up polling for research:', researchId);
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      if (pollTimeout) {
        clearTimeout(pollTimeout);
      }
    };
  };
  
  // Function to save research results or create a copy with edited content
  const saveResearchAsDraft = async (title: string, tags: string[] = [], editedContent: string) => {
    try {
      setIsLoading(true);
      console.log("Saving draft with title:", title, "and content length:", editedContent?.length);
      
      if (selectedItem?.researchId) {
        // This is a research result
        console.log("Saving research result with ID:", selectedItem.researchId);
        
        const response = await saveDraftToLibrary(
          selectedItem.researchId,
          title,
          tags,
          editedContent // Pass the edited content
        );
        
        console.log("Save response:", response);
        
        // Create a new library item
        const newItem: LibraryItem = {
          id: response.draft_id,
          title: title,
          category: selectedItem.category,
          content: editedContent,
          timestamp: Date.now(),
          references: selectedItem.references
        };
        
        // Add to library items - use a callback to ensure we're working with the latest state
        setLibraryItems(prev => [newItem, ...prev]);
        
        // Update selected item
        setSelectedItem(newItem);
        
        // Navigate to the editor with the new draft ID
        navigate(`/editor/${response.draft_id}`);
        
        // Show success toast
        toast({
          title: "Saved to Library",
          description: "Your content has been saved as a new entry in the library.",
        });
      } else {
        // This is an existing library item - create a copy
        console.log("Creating copy of existing item:", selectedItem?.id);
        
        // We need to implement a new API endpoint for this
        // For now, let's create a mock implementation
        const draftId = `copy-${Date.now()}`;
        
        // Create a new library item
        const newItem: LibraryItem = {
          id: draftId,
          title: title,
          category: selectedItem?.category || 'blog-style',
          content: editedContent,
          timestamp: Date.now(),
          references: selectedItem?.references || []
        };
        
        // Add to library items - use a callback to ensure we're working with the latest state
        setLibraryItems(prev => [newItem, ...prev]);
        
        // Update selected item
        setSelectedItem(newItem);
        
        // Navigate to the editor with the new draft ID
        navigate(`/editor/${draftId}`);
        
        console.log("Created new item with ID:", draftId);
        
        // Show success toast
        toast({
          title: "Saved to Library",
          description: "Your content has been saved as a new entry in the library.",
        });
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: "Error",
        description: "Failed to save to library. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add this function to handle saving copies of existing library items
  const saveDraftCopy = async (title: string, tags: string[] = [], editedContent: string) => {
    if (!selectedItem) {
      console.error('No selected item to copy');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Save a copy of the draft to library
      const response = await saveDraftCopy(
        title,
        editedContent,
        selectedItem.category,
        tags,
        selectedItem.references || []
      );
      
      // Create a new library item from the response
      const newItem: LibraryItem = {
        id: response.draft_id,
        title: title,
        category: selectedItem.category,
        content: editedContent,
        timestamp: Date.now(),
        references: selectedItem.references
      };
      
      // Add to library items
      setLibraryItems(prev => [newItem, ...prev]);
      
      // Navigate to the editor with the new draft ID
      navigate(`/editor/${response.draft_id}`, { replace: true });
      
    } catch (error) {
      console.error('Error saving draft copy:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Combined function to handle both research results and library items
  const handleSaveDraft = (title: string, tags: string[] = []) => {
    if (!selectedItem) {
      console.error('No item to save');
      return;
    }
    
    // Get the current content from the editor
    const editedContent = selectedItem.content; // This should be updated with the actual edited content
    
    if (selectedItem?.researchId) {
      // This is a research result
      saveResearchAsDraft(title, tags, editedContent);
    } else {
      // This is an existing library item
      saveDraftCopy(title, tags, editedContent);
    }
  };

  const handleSearchSubmit = (researchId: string, query: string, styleNumber: number) => {
    setActiveResearchId(researchId);
    
    // The actual research is started in HomePage and we'll poll for results
    // based on the URL parameter in the useEffect hook
  };

  // Update the editor search function
  const handleEditorSearch = (query: string, category: string, additionalInfo: string) => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    
    // Map category to style number
    const styleNumber = 
      category === 'blog-style' ? 1 :
      category === 'detailed-report' ? 2 : 3;
    
    // Combine query with additional info
    const fullQuery = additionalInfo ? 
      `${query}\n\nAdditional context: ${additionalInfo}` : 
      query;
    
    // Start research via API
    startResearch(fullQuery, styleNumber)
      .then(response => {
        setActiveResearchId(response.research_id);
        navigate(`/editor/research/${response.research_id}`);
        
        // Don't set isLoading to false here, as we want to show loading until research is complete
        // The loading state will be managed by the polling mechanism
      })
      .catch(error => {
        console.error('Error starting research:', error);
        setIsLoading(false);
      });
  };

  // Navigation handlers
  const handleLibraryOpen = () => {
    setCategoryFilter(null);
    navigate('/library');
  };

  const handleCategorySelect = (category: string) => {
    setCategoryFilter(category);
    navigate(`/library/${category}`);
  };

  const handleItemSelect = (item: LibraryItem) => {
    setSelectedItem(item);
    navigate(`/editor/${item.id}`);
  };

  return (
    <div className="app-container">
      <div className="flex flex-col w-full h-screen bg-gray-950 text-gray-100">
        <div className="app-container relative min-h-screen flex flex-col">
          {/* Desktop Navigation Menu - Hidden on mobile */}
          <div className="desktop-menu">
            <NavMenu 
              onLibraryOpen={handleLibraryOpen} 
              recentItems={libraryItems.slice(0, 3)} 
            />
          </div>

          {/* Left Bubble Selector - Hidden on mobile */}
          <div className="fixed left-0 top-2 z-50 hidden md:block">
            <BubbleSelector 
              onLibraryOpen={handleLibraryOpen}
              recentItems={libraryItems.slice(0, 3)}
              onItemSelect={handleItemSelect}
            />
          </div>

          {/* Right Bubble Selector - Hidden on mobile */}
          <div className="fixed right-0 top-2 z-50 hidden md:block">
            <BubbleSelector2 onCategorySelect={handleCategorySelect} />
          </div>

          {/* Mobile Menu - Only visible on mobile */}
          <div className="mobile-menu-container">
            <div className="mobile-menu-content">
              <div className="mobile-menu-title">
                {location.pathname.includes('/library') ? 
                  'Library' : 
                  location.pathname.includes('/editor') ? 'Editor' : ''}
              </div>
              <div className="mobile-menu-actions">
                <button
                  onClick={handleLibraryOpen}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors"
                >
                  Library
                </button>
                {location.pathname !== '/' && (
                  <button
                    onClick={() => navigate('/')}
                    className="p-2 hover:bg-secondary rounded-lg transition-colors"
                  >
                    Home
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <AnimatePresence mode="wait">
            <div className="flex-1 flex justify-center">
              <div className="relative w-full md:w-[60%] min-h-screen">
                <Routes location={location} key={location.pathname}>
                  <Route 
                    path="/" 
                    element={<HomePage onSearch={handleSearchSubmit} />} 
                  />
                  <Route 
                    path="/library" 
                    element={
                      <LibraryPage 
                        libraryItems={libraryItems}
                        categoryFilter={categoryFilter}
                        setCategoryFilter={setCategoryFilter}
                        setSelectedItem={handleItemSelect}
                        key={`library-all-${libraryItems.length}`}
                      />
                    } 
                  />
                  <Route 
                    path="/library/:category" 
                    element={
                      <LibraryPage 
                        libraryItems={libraryItems}
                        categoryFilter={categoryFilter}
                        setCategoryFilter={setCategoryFilter}
                        setSelectedItem={handleItemSelect}
                        key={`library-${categoryFilter}-${libraryItems.length}`}
                      />
                    } 
                  />
                  <Route 
                    path="/editor/research/:researchId" 
                    element={
                      <EditorPage 
                        selectedItem={selectedItem}
                        isLoading={isLoading}
                        onSearch={handleEditorSearch}
                        onSaveDraft={handleSaveDraft}
                        isResearchResult={true}
                      />
                    } 
                  />
                  <Route 
                    path="/editor/:itemId" 
                    element={
                      <EditorPage 
                        selectedItem={selectedItem}
                        isLoading={isLoading}
                        onSearch={handleEditorSearch}
                        onSaveDraft={handleSaveDraft}
                        isResearchResult={false}
                      />
                    } 
                  />
                  <Route 
                    path="/instructions" 
                    element={<InstructionsPage />} 
                  />
                </Routes>
              </div>
            </div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default AppRouter;

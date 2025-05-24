import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { TextEditor } from '../components/TextEditor';
import { EditorSearchBar } from '../components/EditorSearchBar';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from '../components/ui/use-toast';
import ResearchLoadingScreen from '../components/ResearchLoadingScreen';

interface LibraryItem {
  id: string;
  title: string;
  category: string;
  content: string;
  timestamp: number;
  references?: string[];
  researchId?: string;
}

interface EditorPageProps {
  selectedItem: LibraryItem | null;
  isLoading: boolean;
  onSearch: (query: string, category: string, additionalInfo: string) => void;
  onSaveDraft?: (title: string, tags: string[], content: string) => void;
  isResearchResult?: boolean;
}

const EditorPage: React.FC<EditorPageProps> = ({
  selectedItem,
  isLoading,
  onSearch,
  onSaveDraft,
  isResearchResult = false
}) => {
  const { itemId, researchId } = useParams<{ itemId?: string; researchId?: string }>();
  const [pageLoading, setPageLoading] = useState(true);
  const [content, setContent] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftTags, setDraftTags] = useState('');
  
  // Reset loading state after mounting
  useEffect(() => {
    const timer = setTimeout(() => {
      setPageLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []); // Empty dependency array to run only once on mount
  
  // Update content when selectedItem changes
  useEffect(() => {
    if (selectedItem) {
      console.log("Editor showing item:", selectedItem.id, selectedItem.title);
      setContent(selectedItem.content);
      
      // Pre-populate the draft title with the item title for research results
      if (isResearchResult && selectedItem.title) {
        setDraftTitle(selectedItem.title);
      }
    } else {
      console.log("Editor has no selected item, URL params:", { itemId, researchId });
      setContent('');
    }
  }, [selectedItem, itemId, researchId, isResearchResult]);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    // We don't need to update the selectedItem here as it's managed by the parent component
  };

  const handleSaveClick = () => {
    if (isResearchResult && onSaveDraft) {
      setShowSaveDialog(true);
    } else {
      toast({
        title: "Changes Saved",
        description: "Your changes have been saved successfully.",
      });
    }
  };

  const handleSaveConfirm = () => {
    if (!draftTitle.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a title for your draft.",
        variant: "destructive",
      });
      return;
    }
  
    if (onSaveDraft) {
      const tags = draftTags.split(',').map(tag => tag.trim()).filter(Boolean);
      onSaveDraft(draftTitle, tags, content); // Pass the current content
      setShowSaveDialog(false);
    }
  };

  // Show simple loading spinner for page loading (not research loading)
  if (pageLoading || (!isLoading && !selectedItem)) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center">
        <div className="loading-spinner mx-auto mb-4" style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(255, 255, 255, 0.1)',
          borderTop: '3px solid rgba(255, 255, 255, 0.8)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p className="text-gray-400">Loading content...</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen">
      {/* Enhanced loading screen for research */}
      {isLoading ? (
        <ResearchLoadingScreen isLoading={isLoading} />
      ) : (
        <>
          <div className="flex justify-center mb-4 pt-4 mt-5">
            <EditorSearchBar onSearch={onSearch} />
          </div>
          
          <div className="editor-container p-4">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-bold">{selectedItem?.title || 'Untitled'}</h1>
              
              {isResearchResult && onSaveDraft && (
                <Button onClick={handleSaveClick} className="ml-auto">
                  Save to Library
                </Button>
              )}
            </div>
            
            {selectedItem && (
              <TextEditor
                key={selectedItem.id}
                initialContent={formatContentForDisplay(selectedItem.content)}
                onContentChange={handleContentChange}
              />
            )}
          </div>
        </>
      )}
      
      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Research to Library</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="Enter a title for your draft"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input
                id="tags"
                value={draftTags}
                onChange={(e) => setDraftTags(e.target.value)}
                placeholder="research, ai, technology"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveConfirm}>
              Save Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

// Format content for display
const formatContentForDisplay = (content: string): string => {
  // If content is already HTML (from editor), return as is
  if (content.startsWith('<') && content.includes('</')) {
    return content;
  }
  
  // Otherwise, preserve line breaks and formatting
  return content;
};

export default EditorPage;
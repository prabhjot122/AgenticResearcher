import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { GraduationCap, NotepadText, FileStack, Upload, X, FileText, Library } from 'lucide-react';
import './SearchHub.css';
import { TbBrandBlogger } from "react-icons/tb";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PDFLibrary } from './PDFLibrary';
import { uploadPDF } from '../../services/api';
import { toast } from './ui/use-toast';

interface SearchCategory {
  id: string;
  icon: React.ReactNode;
  label: string;
  orbitRadius: number;
  speed: number;
  styleNumber: number; // Added for backend mapping
}

interface SearchHubProps {
  onSubmit: (query: string, styleNumber: number, additionalInfo?: string, pdfIds?: string[]) => void;
  isLoading?: boolean;
}

const searchCategories: SearchCategory[] = [
  {
    id: 'executive-summary',
    icon: <NotepadText size={24} strokeWidth={1.5} />,
    label: 'Executive Summary',
    orbitRadius: 90,
    speed: 0.6,
    styleNumber: 3 // Maps to executive summary in backend
  },
  {
    id: 'blog-style',
    icon: <TbBrandBlogger size={24} />,
    label: 'Blog Style',
    orbitRadius: 150,
    speed: 0.4,
    styleNumber: 1 // Maps to blog post in backend
  },
  {
    id: 'detailed-report',
    icon: <FileStack size={24} strokeWidth={1.5} />,
    label: 'Detailed Report',
    orbitRadius: 210,
    speed: 0.2,
    styleNumber: 2 // Maps to detailed report in backend
  }
];

// Simple throttle function
function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
}

export const SearchHub = ({ onSubmit, isLoading = false }: SearchHubProps) => {
  const [isActive, setIsActive] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [rotations, setRotations] = useState<number[]>([0, 0, 0]);
  const [selectedCategory, setSelectedCategory] = useState<SearchCategory | null>(null);
  const [isOrbitsVisible, setIsOrbitsVisible] = useState(true);
  const [showAdditionalInfoDialog, setShowAdditionalInfoDialog] = useState(false);
  const [showAlertDialog, setShowAlertDialog] = useState(false);
  const [showPDFLibraryDialog, setShowPDFLibraryDialog] = useState(false);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [selectedPDFs, setSelectedPDFs] = useState<string[]>([]);
  const [uploadedPdf, setUploadedPdf] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const hubRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number>(0);

  // Memoize category elements to prevent unnecessary re-renders
  const categoryElements = useMemo(() => {
    return searchCategories.map((category, index) => (
      <div
        key={category.id}
        className={`orbital-ring ${!isOrbitsVisible ? 'hidden' : 'visible'} ${isLoading ? 'loading' : ''}`}
        style={{
          width: `${category.orbitRadius * 2}px`,
          height: `${category.orbitRadius * 2}px`,
        }}
      >
        {/* Orbit path with rings */}
        <div className="orbit-path">
          <div className="orbit-rings">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="ring"
                style={{
                  opacity: 0.1 - i * 0.02,
                  transform: `scale(${1 + i * 0.001})`
                }}
              />
            ))}
          </div>
        </div>

        {/* Category icon */}
        <div
          className={`category-icon ${selectedCategory?.id === category.id ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            handleCategoryClick(category.id);
          }}
          style={{
            transform: `rotate(${rotations[index]}deg) translateX(${category.orbitRadius}px)`,
          }}
        >
          <div
            className="icon-content"
            style={{
              '--rotation-transform': `rotate(-${rotations[index]}deg)`,
              transform: `rotate(-${rotations[index]}deg)`
            } as React.CSSProperties}
          >
            {category.icon}
          </div>
        </div>
      </div>
    ));
  }, [rotations, isOrbitsVisible, isLoading, selectedCategory]);

  // Optimize animation with requestAnimationFrame and throttling
  useEffect(() => {
    if (isOrbitsVisible) {
      const animate = (timestamp: number) => {
        if (timestamp - lastTimestampRef.current > 66) { // ~30fps instead of 60fps
          setRotations(prev => prev.map((rotation, index) => {
            const speed = searchCategories[index].speed;
            return rotation + speed;
          }));
          lastTimestampRef.current = timestamp;
        }
        animationRef.current = requestAnimationFrame(animate);
      };

      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isOrbitsVisible]);

  // Define throttled handlers with useCallback
  const handleHubClick = useCallback(throttle(() => {
    setIsActive(true);
    inputRef.current?.focus();
  }, 100), []);

  const handleBlur = useCallback(throttle(() => {
    if (!searchText) {
      setIsActive(false);
    }
  }, 100), [searchText]);

  const handleCategoryClick = useCallback((categoryId: string) => {
    const category = searchCategories.find(cat => cat.id === categoryId);
    if (category) {
      // Stop animation when category is selected
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      // Use a single state update with a callback
      setIsActive(true);
      setIsOrbitsVisible(false);
      setSelectedCategory(category);
      setSearchText('');

      // Focus after state updates are applied
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, []);

  const clearSelectedCategory = useCallback(() => {
    setSelectedCategory(null);
    setSearchText('');

    // After a short delay, show orbits again with animation
    setTimeout(() => {
      setIsOrbitsVisible(true);
    }, 50);
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) {
      setShowAlertDialog(true);
      return;
    }
    if (searchText.trim() && !isLoading) {
      setShowAdditionalInfoDialog(true);
    }
  }, [selectedCategory, searchText, isLoading]);

  const handleAdditionalInfoSubmit = useCallback(() => {
    if (selectedCategory) {
      // Include PDF IDs in the submission
      const finalAdditionalInfo = uploadedPdf
        ? `${additionalInfo.trim()}\n\n[PDF uploaded: ${uploadedPdf.name}]`
        : additionalInfo.trim();

      onSubmit(searchText, selectedCategory.styleNumber, finalAdditionalInfo, selectedPDFs);
    }
    setShowAdditionalInfoDialog(false);
    setAdditionalInfo('');
    setUploadedPdf(null);
    setSelectedPDFs([]);
  }, [onSubmit, searchText, additionalInfo, selectedCategory, uploadedPdf, selectedPDFs]);

  const handleSkip = useCallback(() => {
    if (selectedCategory) {
      onSubmit(searchText, selectedCategory.styleNumber, undefined, selectedPDFs);
    }
    setShowAdditionalInfoDialog(false);
    setAdditionalInfo('');
    setUploadedPdf(null);
    setSelectedPDFs([]);
  }, [onSubmit, searchText, selectedCategory, selectedPDFs]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      try {
        setUploading(true);
        const response = await uploadPDF(file, file.name.replace('.pdf', ''));
        setSelectedPDFs(prev => [...prev, response.pdf_id]);
        setUploadedPdf(file);
        toast({
          title: "Success",
          description: "PDF uploaded and ready for research",
        });
      } catch (error) {
        console.error('Error uploading PDF:', error);
        toast({
          title: "Upload Error",
          description: "Failed to upload PDF",
          variant: "destructive"
        });
      } finally {
        setUploading(false);
      }
    }
  }, []);

  const triggerFileUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const removePdf = useCallback(() => {
    setUploadedPdf(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const openPDFLibrary = useCallback(() => {
    setShowPDFLibraryDialog(true);
  }, []);

  const handlePDFSelection = useCallback((pdfIds: string[]) => {
    setSelectedPDFs(pdfIds);
  }, []);

  return (
    <div className="search-hub-container">
      <form onSubmit={handleSubmit}>
        <div
          ref={hubRef}
          className={`search-hub ${isActive ? 'active' : ''} ${isLoading ? 'loading' : ''}`}
          onClick={handleHubClick}
        >
          {/* Render memoized category elements */}
          {categoryElements}

          {/* Search input container - rendered last so it appears on top */}
          <div className="search-input-container">
            <div className="search-icon">
              {isLoading ? (
                <div className="loading-spinner" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              )}
            </div>
            <input
              ref={inputRef}
              type="text"
              className={`search-input ${isActive ? 'active' : ''}`}
              placeholder={isActive ? "Search..." : ""}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onBlur={handleBlur}
              disabled={isLoading}
            />
            {selectedCategory && (
              <div className="selected-category">
                <div className="category-indicator" onClick={clearSelectedCategory} title={`Clear ${selectedCategory.label} filter`}>
                {selectedCategory.icon}
                </div>
              </div>
            )}
          </div>
        </div>
      </form>

      {/* Hidden file input for PDF upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="application/pdf"
        style={{ display: 'none' }}
      />

      {/* Additional Info Dialog using shadcn Dialog */}
      <Dialog open={showAdditionalInfoDialog} onOpenChange={setShowAdditionalInfoDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Additional Info (Optional)</DialogTitle>
            <DialogDescription>
              Add any additional context or requirements for your search.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Textarea
              placeholder="Add any additional context or requirements..."
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              className="min-h-[100px]"
              autoFocus
            />

            {/* PDF Upload Section */}
            <div className="flex flex-col gap-2 mt-2">
              <div className="text-sm font-medium">PDFs for additional context</div>

              {/* Selected PDFs display */}
              {selectedPDFs.length > 0 && (
                <div className="text-sm text-gray-600 mb-2">
                  {selectedPDFs.length} PDF{selectedPDFs.length > 1 ? 's' : ''} selected
                </div>
              )}

              {uploadedPdf && (
                <div className="flex items-center justify-between p-2 border rounded-md bg-secondary/30 mb-2">
                  <div className="text-sm truncate max-w-[250px]">{uploadedPdf.name}</div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={removePdf}
                    className="h-8 px-2"
                  >
                    <X size={16} />
                  </Button>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={triggerFileUpload}
                  className="flex items-center gap-2"
                  disabled={uploading}
                >
                  <Upload size={16} />
                  {uploading ? 'Uploading...' : 'Upload PDF'}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={openPDFLibrary}
                  className="flex items-center gap-2"
                >
                  <Library size={16} />
                  Browse Library
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <div className="flex gap-2 justify-end">
              <Button onClick={handleSkip} variant="secondary" disabled={isLoading}>
                Skip
              </Button>
              <Button onClick={handleAdditionalInfoSubmit} disabled={isLoading}>
                Generate
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog for No Category */}
      <AlertDialog
        open={showAlertDialog}
        onOpenChange={setShowAlertDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>No Category Selected</AlertDialogTitle>
            <AlertDialogDescription>
              Please select a category first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PDF Library Dialog */}
      <Dialog open={showPDFLibraryDialog} onOpenChange={setShowPDFLibraryDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>PDF Library</DialogTitle>
            <DialogDescription>
              Select PDFs to include in your research context
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh]">
            <PDFLibrary
              onSelectPDFs={handlePDFSelection}
              selectedPDFs={selectedPDFs}
              selectionMode={true}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPDFLibraryDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => setShowPDFLibraryDialog(false)}
            >
              Done ({selectedPDFs.length} selected)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

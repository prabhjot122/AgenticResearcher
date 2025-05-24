import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import LibraryComponent from '../components/LibraryComponent';
import { PDFLibrary } from '../components/PDFLibrary';
import { Button } from '../components/ui/button';

// Define the LibraryItem interface
interface LibraryItem {
  id: string;
  title: string;
  category: string;
  content: string;
  timestamp: number;
}

interface LibraryPageProps {
  libraryItems: LibraryItem[];
  categoryFilter: string | null;
  setCategoryFilter: (category: string | null) => void;
  setSelectedItem: (item: LibraryItem) => void;
}

const LibraryPage: React.FC<LibraryPageProps> = ({
  libraryItems,
  categoryFilter,
  setCategoryFilter,
  setSelectedItem
}) => {
  const navigate = useNavigate();
  const { category } = useParams<{ category?: string }>();
  const location = useLocation();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'drafts' | 'pdfs'>('drafts');

  // Set mounted state to trigger re-render
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Use URL parameter if available
  useEffect(() => {
    if (category && category !== categoryFilter) {
      setCategoryFilter(category);
    } else if (!category && categoryFilter) {
      setCategoryFilter(null);
    }
  }, [category, categoryFilter, setCategoryFilter]);

  // Force a re-render when location changes
  useEffect(() => {
    // This will trigger a re-render when navigating to this page
    console.log("Library page location changed:", location.pathname);
  }, [location]);

  return (
    <div className="w-full min-h-screen">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex space-x-8 px-6 pt-6">
          <button
            onClick={() => setActiveTab('drafts')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'drafts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Research Drafts
          </button>
          <button
            onClick={() => setActiveTab('pdfs')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'pdfs'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            PDF Library
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'drafts' ? (
        <LibraryComponent
          libraryItems={libraryItems}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          setSelectedItem={setSelectedItem}
          key={`library-${mounted}-${libraryItems.length}-${categoryFilter || 'all'}`}
        />
      ) : (
        <PDFLibrary />
      )}
    </div>
  );
};

export default LibraryPage;

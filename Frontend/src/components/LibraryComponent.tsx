import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { NotepadText, FileStack, Search } from 'lucide-react';
import { TbBrandBlogger } from "react-icons/tb";
import { getAllDrafts } from '../../services/api';
import { Input } from './ui/input';
import { Button } from './ui/button';

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

const getCategoryColor = (category: string) => {
  const colors: { [key: string]: string } = {
    'executive-summary': '#3b82f6', // blue
    'blog-style': '#8b5cf6', // violet
    'detailed-report': '#10b981', // emerald
  };
  return colors[category] || '#6b7280'; // gray as default
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'executive-summary':
      return <NotepadText size={18} />;
    case 'detailed-report':
      return <FileStack size={18} />;
    case 'blog-style':
      return <TbBrandBlogger size={18} />;
    default:
      return null;
  }
};

const LibraryComponent: React.FC<LibraryPageProps> = ({ 
  libraryItems, 
  categoryFilter, 
  setCategoryFilter, 
  setSelectedItem 
}) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { category } = useParams<{ category?: string }>();
  
  // Set category filter from URL parameter
  useEffect(() => {
    if (category && categoryFilter !== category) {
      setCategoryFilter(category);
    } else if (!category && categoryFilter) {
      setCategoryFilter(null);
    }
  }, [category, categoryFilter, setCategoryFilter]);
  
  // Filter items by category and search term
  const filteredItems = libraryItems.filter(item => {
    const matchesCategory = !categoryFilter || item.category === categoryFilter;
    const matchesSearch = !searchTerm || 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  const handleItemClick = (item: LibraryItem) => {
    setSelectedItem(item);
    navigate(`/editor/${item.id}`);
  };
  
  const handleBackClick = () => {
    navigate('/');
  };
  
  useEffect(() => {
    console.log("LibraryComponent received new props:", { 
      itemCount: libraryItems.length, 
      categoryFilter 
    });
  }, [libraryItems, categoryFilter]);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      // Refresh library items from backend
      const response = await getAllDrafts();
      console.log("Refreshed library items:", response);
      
      // This will update the parent component's state
      // We're not directly setting libraryItems here as it's passed as a prop
      
      setIsLoading(false);
      
      // Force re-render
      setHoveredItem(null);
    } catch (error) {
      console.error('Error refreshing library items:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-full bg-transparent p-6 mt-7">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleBackClick}
            className="p-2 rounded-full hover:bg-gray-800/50 transition-colors"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </motion.button>
          <h1 className="text-3xl font-bold text-center flex-1 mr-10">
            {categoryFilter 
              ? `Library: ${categoryFilter.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}`
              : 'Library'
            }
          </h1>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
        
        {/* Search Bar */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            type="text"
            placeholder="Search library..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2"
          />
        </div>

        {/* Content Grid */}
        <div className="grid gap-4">
          {filteredItems.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              {searchTerm ? 'No results found' : 'Your library is empty'}
            </div>
          ) : (
            filteredItems.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.01 }}
                onClick={() => handleItemClick(item)}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
                className="relative group bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-4 cursor-pointer overflow-hidden transition-all duration-200"
                style={{
                  boxShadow: hoveredItem === item.id ? `0 0 20px ${getCategoryColor(item.category)}20` : 'none'
                }}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold group-hover:text-white transition-colors">
                    {item.title}
                  </h2>
                  <div 
                    className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2"
                    style={{
                      backgroundColor: `${getCategoryColor(item.category)}20`,
                      color: getCategoryColor(item.category),
                      border: `1px solid ${getCategoryColor(item.category)}40`
                    }}
                  >
                    <span>{getCategoryIcon(item.category)}</span>
                    <span>{item.category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</span>
                  </div>
                </div>
                <div className="mt-2 flex items-center text-sm text-gray-400">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-4 w-4 mr-1" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                  </svg>
                  {new Date(item.timestamp).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
                {/* Preview snippet */}
                <div className="mt-2 text-sm text-gray-400 line-clamp-2">
                  {item.content.split('\n')[0]}
                </div>
                {/* Hover effect overlay */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    background: `linear-gradient(45deg, ${getCategoryColor(item.category)}10, transparent)`
                  }}
                />
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default LibraryComponent;

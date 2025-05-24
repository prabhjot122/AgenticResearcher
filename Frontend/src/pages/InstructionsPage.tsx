import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Compass, Lightbulb, HandHelping, Search, Share, BookOpen, Edit, Layout, Filter, Save, Download } from 'lucide-react';

interface InstructionItem {
  id: string;
  title: string;
  category: string;
  content: string;
  icon: React.ReactNode;
}

const INSTRUCTION_ITEMS: InstructionItem[] = [
  {
    id: 'navigation',
    title: 'Navigating the Interface',
    category: 'basics',
    content: `
      # Navigating the Interface
      
      The application features an intuitive bubble-based navigation system:
      
      ## Left Bubble Selector
      - The main bubble with the library icon gives you access to all your saved content
      - The smaller orbiting bubbles provide quick access to your recent items
      - Click on any bubble to navigate to that content
      
      ## Right Bubble Selector
      - The main bubble with the info icon provides access to these instructions
      - The smaller orbiting bubbles contain helpful tips (hover to view)
      - Each tip covers a different aspect of using the application
      
      ## Search Hub
      - The central search hub on the home page is your starting point for research
      - Type your query and press enter to begin a new search
      - Use category prefixes like "academic:", "news:", or "images:" to specify content type
    `,
    icon: <Compass size={18} />
  },
  {
    id: 'search',
    title: 'Searching for Content',
    category: 'basics',
    content: `
      # Searching for Content
      
      The search functionality is powerful and flexible:
      
      ## Basic Search
      - Enter your search query in the central hub on the home page
      - Press enter or click the search button to submit
      - Results will be generated and displayed in the editor
      
      ## Advanced Search
      - Use category prefixes to narrow your search:
        - "academic:" for scholarly content
        - "news:" for current events and articles
        - "images:" for visual content
      - Combine specific terms for more precise results
      
      ## From the Editor
      - Use the search bar at the top of the editor to perform additional searches
      - Your current context will be preserved while you explore new content
      - New search results will be added to your library for future reference
    `,
    icon: <Search size={18} />
  },
  {
    id: 'library',
    title: 'Using the Library',
    category: 'basics',
    content: `
      # Using the Library
      
      The library is where all your content is stored:
      
      ## Accessing the Library
      - Click the main Library bubble (left side) to open your library
      - All your searches and saved content appear here
      - Items are organized chronologically with the newest at the top
      
      ## Filtering Content
      - Click on category bubbles to filter by content type
      - Use the search bar within the library to find specific items
      - Toggle between different views using the view options
      
      ## Managing Items
      - Click on any item to open it in the editor
      - Hover over items to see preview information
      - Save, share, or delete items as needed
    `,
    icon: <BookOpen size={18} />
  },
  {
    id: 'editor',
    title: 'Using the Editor',
    category: 'advanced',
    content: `
      # Using the Editor
      
      The editor is where you can view and modify content:
      
      ## Editing Tools
      - Use the toolbar at the top for formatting options
      - Available options include:
        - Text formatting (bold, italic, strikethrough)
        - Headings and structure
        - Links and images
        - Text alignment
      
      ## Working with Content
      - Click anywhere in the content to begin editing
      - Changes are saved automatically as you type
      - Use keyboard shortcuts for common operations
      
      ## Exporting
      - Use the export button to save content as a PDF
      - Share your work directly from the editor
      - Print your document using the print option
    `,
    icon: <Edit size={18} />
  },
  {
    id: 'layout',
    title: 'Understanding the Layout',
    category: 'basics',
    content: `
      # Understanding the Layout
      
      The application has a thoughtful layout designed for productivity:
      
      ## Home Screen
      - Central search hub for starting your research
      - Bubble selectors on both sides for navigation
      - Clean interface to minimize distractions
      
      ## Library View
      - List of all your content in a card-based layout
      - Filter options and search capabilities
      - Preview information for each item
      
      ## Editor View
      - Full-width editing area with formatting tools
      - Secondary search bar for continued research
      - Navigation options to return to other views
      
      ## Responsive Design
      - All views adapt to your screen size
      - Mobile-friendly interface with adapted controls
      - Consistent experience across devices
    `,
    icon: <Layout size={18} />
  },
  {
    id: 'categories',
    title: 'Content Categories',
    category: 'advanced',
    content: `
      # Content Categories
      
      Content is organized into these main categories:
      
      ## Academic
      - Scholarly articles and research papers
      - Educational content and learning resources
      - Referenced and cited information
      
      ## News
      - Current events and recent developments
      - News articles and journalistic content
      - Timely information and updates
      
      ## Images
      - Visual content and graphics
      - Illustrations and photographs
      - Visual representations of information
      
      ## Using Categories
      - Filter content by category in the library
      - Specify categories during search with prefixes
      - Organize your research by appropriate categories
    `,
    icon: <Filter size={18} />
  },
  {
    id: 'tips',
    title: 'Helpful Tips & Tricks',
    category: 'advanced',
    content: `
      # Helpful Tips & Tricks
      
      Maximize your productivity with these tips:
      
      ## Keyboard Shortcuts
      - Use Ctrl+S (or Cmd+S) to save content
      - Ctrl+F (or Cmd+F) to search within the current document
      - Esc to exit current dialogs or return to previous view
      
      ## Efficient Searching
      - Be specific with search terms for better results
      - Use quotes around phrases to search for exact matches
      - Combine category prefixes with specific terms
      
      ## Organization
      - Regularly review and clean up your library
      - Use consistent naming for related content
      - Take advantage of filtering to manage large collections
      
      ## Performance
      - Close unused tabs and documents to improve performance
      - Clear cache periodically for optimal experience
      - Update the application when new versions are available
    `,
    icon: <Lightbulb size={18} />
  },
  {
    id: 'sharing',
    title: 'Sharing and Collaboration',
    category: 'advanced',
    content: `
      # Sharing and Collaboration
      
      Share your work with others:
      
      ## Export Options
      - Export as PDF for universal compatibility
      - Save as HTML for web publication
      - Generate plain text versions when needed
      
      ## Sharing Methods
      - Direct link sharing with permission settings
      - Email content directly from the application
      - Generate embed codes for web integration
      
      ## Collaboration Features
      - Comment on shared documents
      - Track changes and revisions
      - Set editing permissions for collaborators
      
      ## Privacy Controls
      - Control who can view or edit your content
      - Set expiration dates for shared links
      - Revoke access at any time
    `,
    icon: <Share size={18} />
  },
  {
    id: 'saving',
    title: 'Saving and Backup',
    category: 'advanced',
    content: `
      # Saving and Backup
      
      Keep your work safe with proper saving and backup:
      
      ## Automatic Saving
      - Content is saved automatically as you type
      - Regular checkpoints prevent data loss
      - Backup copies are maintained for recovery
      
      ## Manual Saving
      - Use Ctrl+S (or Cmd+S) to force an immediate save
      - Export important documents in multiple formats
      - Save local copies of critical information
      
      ## Cloud Backup
      - All content is backed up to secure cloud storage
      - Access your documents from any device
      - Historical versions are preserved for recovery
      
      ## Data Management
      - Archive older content that's no longer needed
      - Organize content into collections for easier management
      - Use tags to categorize and find information quickly
    `,
    icon: <Save size={18} />
  },
  {
    id: 'exporting',
    title: 'Exporting Content',
    category: 'advanced',
    content: `
      # Exporting Content
      
      Export your work in various formats:
      
      ## PDF Export
      - Create professional-looking PDF documents
      - Maintain formatting and layout
      - Perfect for sharing and printing
      
      ## HTML Export
      - Export as web-ready HTML
      - Include styling and formatting
      - Easily publish or share online
      
      ## Text Export
      - Basic text export for maximum compatibility
      - Clean, unformatted content
      - Easy to import into other applications
      
      ## Export Settings
      - Customize page size and margins
      - Include or exclude images and formatting
      - Add headers, footers, and page numbers
      - Set metadata and document properties
    `,
    icon: <Download size={18} />
  }
];

const InstructionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // Filter items by category if one is selected
  const filteredItems = selectedCategory
    ? INSTRUCTION_ITEMS.filter(item => item.category === selectedCategory)
    : INSTRUCTION_ITEMS;

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category === selectedCategory ? null : category);
  };

  const handleItemClick = (itemId: string) => {
    setExpandedItem(expandedItem === itemId ? null : itemId);
  };

  const handleClose = () => {
    navigate('/');
  };

  return (
    <div className="w-full min-h-screen p-6 mt-7">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleClose}
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
          <h1 className="text-3xl font-bold text-center flex-1 mr-10">Instructions</h1>
        </div>

        {/* Category filters */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === null 
                ? 'bg-primary text-white' 
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            All
          </button>
          <button
            onClick={() => handleCategoryClick('basics')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === 'basics' 
                ? 'bg-primary text-white' 
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            Basics
          </button>
          <button
            onClick={() => handleCategoryClick('advanced')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === 'advanced' 
                ? 'bg-primary text-white' 
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            Advanced
          </button>
        </div>

        {/* Content Grid */}
        <div className="grid gap-4">
          {filteredItems.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              layout
              className={`relative group bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-4 cursor-pointer overflow-hidden transition-all duration-200 ${
                expandedItem === item.id ? 'bg-gray-800/70' : ''
              }`}
              onClick={() => handleItemClick(item.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/20 text-primary">
                    {item.icon}
                  </div>
                  <h2 className="text-xl font-semibold group-hover:text-white transition-colors">
                    {item.title}
                  </h2>
                </div>
                <div 
                  className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2"
                  style={{
                    backgroundColor: item.category === 'basics' 
                      ? 'rgba(59, 130, 246, 0.2)' 
                      : 'rgba(139, 92, 246, 0.2)',
                    color: item.category === 'basics' ? '#3b82f6' : '#8b5cf6',
                    border: item.category === 'basics' 
                      ? '1px solid rgba(59, 130, 246, 0.4)' 
                      : '1px solid rgba(139, 92, 246, 0.4)'
                  }}
                >
                  <span>{item.category === 'basics' ? 'Basics' : 'Advanced'}</span>
                </div>
              </div>

              {/* Expanded content */}
              {expandedItem === item.id && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 text-gray-300 prose prose-invert max-w-none"
                >
                  <div className="whitespace-pre-line">
                    {item.content.split('# ').map((section, index) => {
                      if (index === 0) return null;
                      
                      const [title, ...content] = section.split('\n\n');
                      return (
                        <div key={index} className="mb-4">
                          <h3 className="text-lg font-semibold mb-2">{title}</h3>
                          {content.map((paragraph, i) => {
                            if (paragraph.startsWith('## ')) {
                              return (
                                <h4 key={i} className="text-md font-medium mt-3 mb-1">
                                  {paragraph.replace('## ', '')}
                                </h4>
                              );
                            } else if (paragraph.startsWith('- ')) {
                              return (
                                <ul key={i} className="list-disc pl-5 mt-1 mb-2">
                                  {paragraph.split('\n').map((item, j) => (
                                    <li key={j} className="mb-1">{item.replace('- ', '')}</li>
                                  ))}
                                </ul>
                              );
                            } else {
                              return <p key={i} className="mb-2">{paragraph}</p>;
                            }
                          })}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Hover effect overlay */}
              <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  background: item.category === 'basics'
                    ? 'linear-gradient(45deg, rgba(59, 130, 246, 0.1), transparent)'
                    : 'linear-gradient(45deg, rgba(139, 92, 246, 0.1), transparent)'
                }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InstructionsPage; 
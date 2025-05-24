import React, { useState } from 'react';
import { SearchHub } from '../components/SearchHub';
import DarkGradientBackground from '../components/DarkGradientBackground';
import { startResearch } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { toast } from '../components/ui/use-toast';
import ResearchLoadingScreen from '../components/ResearchLoadingScreen';

interface HomePageProps {
  onSearch: (researchId: string, query: string, styleNumber: number) => void;
}

const HomePage: React.FC<HomePageProps> = ({ onSearch }) => {
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();

  const handleSearchSubmit = async (
    query: string,
    styleNumber: number,
    additionalInfo?: string,
    pdfIds?: string[]
  ) => {
    if (!query.trim()) return;

    // Show loading state
    setIsSearching(true);

    try {
      // Combine query with additional info if provided
      const fullQuery = additionalInfo ?
        `${query}\n\nAdditional context: ${additionalInfo}` :
        query;

      // Start research via API with PDF IDs
      const response = await startResearch(fullQuery, styleNumber, pdfIds || []);

      // Pass the research ID to parent component
      onSearch(response.research_id, query, styleNumber);

      // Navigate to editor page with research ID
      navigate(`/editor/research/${response.research_id}`);

      // Note: Don't reset loading state here, as we're navigating away
      // The new page will handle the loading state
    } catch (error) {
      console.error('Error starting research:', error);
      toast({
        title: "Research Error",
        description: "Failed to start research. Please try again.",
        variant: "destructive"
      });

      // Reset loading state on error
      setIsSearching(false);
    }
  };

  return (
    <div className="w-full min-h-screen relative">
      {/* Add the gradient background */}
      <DarkGradientBackground />

      {/* Make sure the search hub is above the background */}
      <div className="relative z-10">
        <SearchHub onSubmit={handleSearchSubmit} isLoading={isSearching} />
      </div>

      {/* Add the enhanced loading screen */}
      <ResearchLoadingScreen isLoading={isSearching} />
    </div>
  );
};

export default HomePage;


import type { Dispatch, SetStateAction } from 'react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { MapPin, Search, Loader2 } from 'lucide-react'; // Removed AlertTriangle as toasts handle errors
import { searchAndFetchRecommendations } from '@/app/actions';
import type { SearchLocationRecommendOutput } from '@/lib/types'; 
import { useToast } from '@/hooks/use-toast';


interface LocationSearchProps {
  searchTerm: string;
  setSearchTerm: Dispatch<SetStateAction<string>>;
  setRecommendations: Dispatch<SetStateAction<SearchLocationRecommendOutput | null>>;
  setIsPageLoading: Dispatch<SetStateAction<boolean>>;
  isPageLoading: boolean;
}

export function LocationSearch({ 
  searchTerm, 
  setSearchTerm, 
  setRecommendations,
  setIsPageLoading,
  isPageLoading 
}: LocationSearchProps) {
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast({
        variant: "destructive",
        title: "Search Error",
        description: "Please enter a location to search.",
      });
      return;
    }
    setIsPageLoading(true);
    setRecommendations(null); 

    try {
      const result = await searchAndFetchRecommendations(searchTerm);
      if ('error' in result) {
        toast({
          variant: "destructive",
          title: "Search Failed",
          description: result.error, // Display error from server action
        });
        setRecommendations(null);
      } else {
        setRecommendations(result); 
        // The message from `result` now includes attribution or "data not found" info
        const hasRecommendations = result.residentialZones?.length || result.commercialZones?.length || result.industrialZones?.length;
        toast({
          title: hasRecommendations ? "Recommendations Ready" : "Search Update",
          description: result.message || `Displayed data for ${result.searchedLocationName || searchTerm}.`,
          duration: hasRecommendations || (result.message && result.message.toLowerCase().includes("error")) ? 9000 : 5000, // Longer for important info
        });
      }
    } catch (error) {
      console.error("Unhandled error in LocationSearch:", error);
      toast({
        variant: "destructive",
        title: "Unhandled Search Error",
        description: "An unexpected error occurred during the search. Please try again.",
      });
      setRecommendations(null);
    } finally {
      setIsPageLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="location-search" className="text-lg font-semibold flex items-center">
        <MapPin className="h-5 w-5 mr-2 text-primary" />
        Search Location for AI Analysis
      </Label>
      <div className="flex space-x-2">
        <Input
          id="location-search"
          type="text"
          placeholder="E.g., Koramangala, MG Road..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
          className="bg-card border-border focus:ring-primary"
          disabled={isPageLoading}
        />
        <Button onClick={handleSearch} disabled={isPageLoading} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          {isPageLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </div>
       {searchTerm && !isPageLoading && <p className="text-xs text-muted-foreground mt-1">Press Enter or click search to get AI recommendations for this location.</p>}
    </div>
  );
}

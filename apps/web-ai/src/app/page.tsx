
'use client';

import { useState, type Dispatch, type SetStateAction, useCallback } from 'react';
import { AppHeader } from '@/components/app/app-header';
import { LocationSearch } from '@/components/app/location-search';
import { ZoneFilters } from '@/components/app/zone-filters';
import { ZoneRecommendationForm } from '@/components/app/zone-recommendation-form';
import { PersonalizedRecommendationForm } from '@/components/app/personalized-recommendation-form';
import { MapView } from '@/components/app/map-view';
import { Separator } from '@/components/ui/separator';
import type { Filters, RecommendedZonesState, SearchLocationRecommendOutput, RecommendZoneOutput, PersonalizedRecState, PersonalizedAreaRec, MapNavigationTarget } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Handshake, MapPin, CheckCircle, Info, UserCheck, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card'; // Keep Card import for results dialog

export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Filters>({
    residential: true,
    commercial: true,
    industrial: true,
  });
  const [recommendations, setRecommendations] = useState<RecommendedZonesState>(null);
  
  // State for the initial personalized form dialog
  const [isInitialFormOpen, setIsInitialFormOpen] = useState(true);
  // State for personalized advice results dialog
  const [personalizedAdvice, setPersonalizedAdvice] = useState<PersonalizedRecState>(null);
  const [isPersonalizedAdviceDialogOpen, setIsPersonalizedAdviceDialogOpen] = useState(false);
  
  const [isPageLoading, setIsPageLoading] = useState(false); 
  const [mapNavigateTo, setMapNavigateTo] = useState<MapNavigationTarget | null>(null);


  const handlePersonalizedAdviceResult = (advice: PersonalizedRecState) => {
    setPersonalizedAdvice(advice);
    setIsInitialFormOpen(false); // Close the initial form dialog

    if (advice && !advice.error) {
      setIsPersonalizedAdviceDialogOpen(true); // Open the results dialog
    }
    // Errors are handled by toasts within the form/action
  };

  const handleClosePersonalizedDialog = () => {
    setIsPersonalizedAdviceDialogOpen(false);
  };
  
  const handleNavigateToRecommendedArea = (areaName: string) => {
    setMapNavigateTo({ name: areaName } as any); 
    setIsPersonalizedAdviceDialogOpen(false); 
  };


  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[24rem] lg:w-[26rem] border-r border-border flex flex-col">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            <AppHeader />
            <Separator />
            <LocationSearch
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              setRecommendations={setRecommendations as Dispatch<SetStateAction<SearchLocationRecommendOutput | null>>} 
              setIsPageLoading={setIsPageLoading}
              isPageLoading={isPageLoading}
            />
            <Separator />
            <ZoneFilters filters={filters} setFilters={setFilters} />
            <Separator />
            {/* Placeholder for a button to re-open personalized form if needed later */}
            {/* For now, it pops up on load */}
            <ZoneRecommendationForm
              setRecommendations={setRecommendations as Dispatch<SetStateAction<RecommendZoneOutput | null>>} 
              setIsPageLoading={setIsPageLoading}
              isPageLoading={isPageLoading}
            />
          </div>
        </ScrollArea>
      </aside>

      {/* Main Content (Map) */}
      <main className="flex-1 p-4 md:p-6">
        <MapView
            filters={filters}
            recommendations={recommendations}
            searchTerm={searchTerm} 
            isPageLoading={isPageLoading}
            navigateTo={mapNavigateTo}
            clearNavigateTo={() => setMapNavigateTo(null)}
        />
      </main>

      {/* Initial Personalized Recommendation Form Dialog */}
      <AlertDialog open={isInitialFormOpen} onOpenChange={setIsInitialFormOpen}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <UserCheck className="h-6 w-6 mr-2 text-primary" />
              Tell Us Your Preferences
            </AlertDialogTitle>
            <AlertDialogDescription>
              Answer a few questions to get AI-powered area recommendations for Bengaluru, tailored to your needs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2 max-h-[60vh] overflow-y-auto pr-2"> {/* Added padding and scroll for form content */}
            <PersonalizedRecommendationForm
              setPersonalizedAdvice={handlePersonalizedAdviceResult}
              setIsPageLoading={setIsPageLoading}
              isPageLoading={isPageLoading}
            />
          </div>
          <AlertDialogFooter className="mt-2"> {/* Reduced margin top */}
            <Button variant="outline" onClick={() => setIsInitialFormOpen(false)}>Skip for now</Button>
            {/* The "Get Personalized Advice" button is inside the form itself */}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      {/* Personalized Advice Results Dialog */}
      {personalizedAdvice && !personalizedAdvice.error && (
        <AlertDialog open={isPersonalizedAdviceDialogOpen} onOpenChange={setIsPersonalizedAdviceDialogOpen}>
          <AlertDialogContent className="max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center">
                <Handshake className="h-6 w-6 mr-2 text-primary" />
                Your Personalized Recommendations
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                 <div className="text-sm text-muted-foreground max-h-[60vh] overflow-y-auto space-y-4 pt-2 pr-2">
                  {personalizedAdvice.prioritizedAreas && personalizedAdvice.prioritizedAreas.length > 0 ? (
                    personalizedAdvice.prioritizedAreas.map((area, index) => (
                      <Card key={index} className="p-4 bg-card"> {/* Ensured card has bg */}
                        <h3 className="font-semibold text-foreground text-md mb-1 flex items-center">
                          <MapPin className="h-4 w-4 mr-1.5 text-primary" /> {area.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-2">{area.reasoning}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleNavigateToRecommendedArea(area.name)}
                          className="text-primary border-primary hover:bg-primary/10"
                        >
                          Show on Map & Get Live AQI
                        </Button>
                      </Card>
                    ))
                  ) : (
                    <div className="p-4 bg-secondary rounded-md text-center">
                        <Info className="h-8 w-8 mx-auto mb-2 text-muted-foreground"/>
                        <p className="text-foreground">No specific areas could be prioritized based on your current selection.</p>
                    </div>
                  )}
                  {personalizedAdvice.additionalAdvice && (
                    <div className="mt-4 p-3 bg-accent/20 rounded-md">
                      <h4 className="font-semibold text-accent-foreground mb-1">Additional Advice:</h4>
                      <p className="text-sm text-accent-foreground/90">{personalizedAdvice.additionalAdvice}</p>
                    </div>
                  )}
                  {!personalizedAdvice.prioritizedAreas?.length && !personalizedAdvice.additionalAdvice && (
                     <p className="text-muted-foreground text-center py-4">The AI could not generate specific advice with the provided inputs. Please try adjusting your preferences.</p>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4">
              <AlertDialogAction onClick={handleClosePersonalizedDialog}>
                <CheckCircle className="h-4 w-4 mr-2" /> Got it!
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}


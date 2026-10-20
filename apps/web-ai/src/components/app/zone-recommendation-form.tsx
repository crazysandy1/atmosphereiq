
'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wand2, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { getZoneRecommendations } from '@/app/actions';
import type { RecommendZoneOutput } from '@/lib/types'; // Specific type for manual form
import { useToast } from '@/hooks/use-toast';

const FormSchema = z.object({
  airQualityData: z.string().min(10, { message: 'Air quality data must be at least 10 characters.' }),
});
type FormData = z.infer<typeof FormSchema>;

interface ZoneRecommendationFormProps {
  setRecommendations: Dispatch<SetStateAction<RecommendZoneOutput | null>>; // Specific type
  setIsPageLoading: Dispatch<SetStateAction<boolean>>;
  isPageLoading: boolean;
}

export function ZoneRecommendationForm({ setRecommendations, setIsPageLoading, isPageLoading }: ZoneRecommendationFormProps) {
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      airQualityData: '',
    },
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setIsPageLoading(true);
    setRecommendations(null); 
    try {
      const result = await getZoneRecommendations(data.airQualityData);
      if ('error' in result) {
        toast({
          variant: "destructive",
          title: "AI Recommendation Error",
          description: result.error,
        });
        setRecommendations(null);
      } else {
        setRecommendations(result); // Result is RecommendZoneOutput
         if (result.message) {
          toast({
            title: "Recommendations Information",
            description: result.message,
          });
        } else {
          toast({
            title: "Recommendations Ready!",
            description: "AI has analyzed the data and provided zone recommendations.",
            action: <CheckCircle2 className="text-green-500" />,
          });
        }
        form.reset(); 
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Unhandled Error",
        description: "An unexpected error occurred. Please try again.",
      });
      setRecommendations(null);
    } finally {
      setIsPageLoading(false);
    }
  };

  return (
    <Card className="bg-card shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <Wand2 className="h-5 w-5 mr-2 text-primary" />
          AI Zone Recommendation (Manual Input)
        </CardTitle>
        <CardDescription>
          Input air quality data (e.g., CSV, JSON, or descriptive text) for Bengaluru. The AI will suggest optimal zones.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="airQualityData" className="font-medium">Air Quality Data</Label>
            <Textarea
              id="airQualityData"
              placeholder="Paste air quality data here..."
              {...form.register('airQualityData')}
              className="min-h-[100px] mt-1 bg-background border-border focus:ring-primary"
              disabled={isPageLoading}
            />
            {form.formState.errors.airQualityData && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.airQualityData.message}
              </p>
            )}
          </div>
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isPageLoading}>
            {isPageLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                Get Recommendations
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

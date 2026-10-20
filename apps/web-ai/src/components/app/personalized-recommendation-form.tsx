
'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useState } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
// Removed Card imports as the form is now directly in AlertDialogContent
import { Sparkles, Loader2 } from 'lucide-react'; // UserCheck was for CardTitle, removed
import { getPersonalizedRecommendations } from '@/app/actions';
import type { PersonalizedRecInput, PersonalizedRecOutput } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const FormSchema = z.object({
  purpose: z.enum(['residential', 'commercial', 'industrial'], {
    required_error: 'Please select a purpose.',
  }),
  lengthOfStay: z.string().min(1, { message: 'Please select your length of stay.' }),
  healthConcerns: z.array(z.string()).refine(value => value.length > 0, {
    message: 'Please select at least one health concern option (or "None").',
  }),
});

type FormData = z.infer<typeof FormSchema>;

const healthConcernOptions = [
  { id: 'respiratory', label: 'Respiratory Issues (Asthma, Bronchitis)' },
  { id: 'allergies', label: 'Allergies (Pollen, Dust)' },
  { id: 'sensitive', label: 'Generally Sensitive to Pollution' },
  { id: 'none', label: 'None' },
];

const lengthOfStayOptions = [
  "<1 Year", "1-3 Years", "3-5 Years", "5+ Years", "Permanent"
];

interface PersonalizedRecommendationFormProps {
  setPersonalizedAdvice: (advice: PersonalizedRecOutput | null) => void;
  setIsPageLoading: Dispatch<SetStateAction<boolean>>; 
  isPageLoading: boolean;
}

export function PersonalizedRecommendationForm({
  setPersonalizedAdvice,
  setIsPageLoading,
  isPageLoading,
}: PersonalizedRecommendationFormProps) {
  const { toast } = useToast();
  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      purpose: undefined,
      lengthOfStay: '',
      healthConcerns: [],
    },
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setIsPageLoading(true);
    // setPersonalizedAdvice(null); // Clearing advice is handled by page.tsx before opening results dialog
    try {
      const input: PersonalizedRecInput = {
        purpose: data.purpose,
        lengthOfStay: data.lengthOfStay,
        healthConcerns: data.healthConcerns,
      };
      const result = await getPersonalizedRecommendations(input);
      
      // The parent (page.tsx) will handle closing this form's dialog
      // and opening the results dialog.
      setPersonalizedAdvice(result); 

      if (result.error) {
        toast({
          variant: 'destructive',
          title: 'Personalized Advice Error',
          description: result.error,
        });
      } else {
        toast({
          title: 'Personalized Advice Ready!',
          description: 'AI has generated recommendations based on your preferences.',
        });
      }
    } catch (error) {
      console.error("Error submitting personalized form:", error);
      toast({
        variant: 'destructive',
        title: 'Submission Error',
        description: 'An unexpected error occurred. Please try again.',
      });
      setPersonalizedAdvice(null); // Ensure advice is cleared on unexpected error
    } finally {
      setIsPageLoading(false);
    }
  };
  
  const handleHealthConcernChange = (concernId: string, checked: boolean) => {
    const currentConcerns = form.getValues("healthConcerns");
    let newConcerns: string[];

    if (concernId === 'none') {
      newConcerns = checked ? ['none'] : [];
    } else {
      if (checked) {
        newConcerns = [...currentConcerns.filter(c => c !== 'none'), concernId];
      } else {
        newConcerns = currentConcerns.filter(c => c !== concernId);
      }
    }
    form.setValue("healthConcerns", newConcerns, { shouldValidate: true });
  };

  // Form content directly, without Card wrappers
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Purpose */}
      <div>
        <Label className="font-semibold">Primary Purpose</Label>
        <Controller
          name="purpose"
          control={form.control}
          render={({ field }) => (
            <RadioGroup
              onValueChange={field.onChange}
              defaultValue={field.value}
              className="mt-2 space-y-1"
              disabled={isPageLoading}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="residential" id="purpose-res" />
                <Label htmlFor="purpose-res" className="font-normal">House/Flat</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="commercial" id="purpose-com" />
                <Label htmlFor="purpose-com" className="font-normal">Commercial</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="industrial" id="purpose-ind" />
                <Label htmlFor="purpose-ind" className="font-normal">Industrial</Label>
              </div>
            </RadioGroup>
          )}
        />
        {form.formState.errors.purpose && (
          <p className="text-sm text-destructive mt-1">{form.formState.errors.purpose.message}</p>
        )}
      </div>

      {/* Length of Stay */}
      <div>
        <Label htmlFor="lengthOfStay" className="font-semibold">Expected Length of Stay</Label>
        <Controller
          name="lengthOfStay"
          control={form.control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isPageLoading}>
              <SelectTrigger id="lengthOfStay" className="mt-1 bg-background border-border focus:ring-primary">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                {lengthOfStayOptions.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {form.formState.errors.lengthOfStay && (
          <p className="text-sm text-destructive mt-1">{form.formState.errors.lengthOfStay.message}</p>
        )}
      </div>

      {/* Health Concerns */}
      <div>
        <Label className="font-semibold">Any Health Concerns?</Label>
         <div className="mt-2 space-y-2">
          {healthConcernOptions.map((option) => (
            <div key={option.id} className="flex items-center space-x-2">
              <Checkbox
                id={`health-${option.id}`}
                checked={form.watch('healthConcerns').includes(option.id) || (option.id === 'none' && form.watch('healthConcerns').includes('none'))}
                onCheckedChange={(checked) => handleHealthConcernChange(option.id, !!checked)}
                disabled={isPageLoading || (option.id !== 'none' && form.watch('healthConcerns').includes('none'))}
              />
              <Label htmlFor={`health-${option.id}`} className="font-normal">
                {option.label}
              </Label>
            </div>
          ))}
        </div>
        {form.formState.errors.healthConcerns && (
          <p className="text-sm text-destructive mt-1">{form.formState.errors.healthConcerns.message}</p>
        )}
      </div>
      
      <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground mt-4" disabled={isPageLoading}>
        {isPageLoading ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
        ) : (
          <><Sparkles className="mr-2 h-4 w-4" /> Get Personalized Advice</>
        )}
      </Button>
    </form>
  );
}


import { Wind, Map } from 'lucide-react';

export function AppHeader() {
  return (
    <div className="mb-6">
      <div className="flex items-center space-x-3 mb-2">
        <div className="p-2 bg-primary/20 rounded-lg">
          <Wind className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-primary">AtmosphereIQ</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Breathe Easy: Discover the ideal zones in Bengaluru based on air quality analysis.
      </p>
    </div>
  );
}

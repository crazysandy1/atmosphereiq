import type { Dispatch, SetStateAction } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Home, Building, Factory, Filter } from 'lucide-react';
import type { Filters } from '@/lib/types';

interface ZoneFiltersProps {
  filters: Filters;
  setFilters: Dispatch<SetStateAction<Filters>>;
}

const filterOptions = [
  { id: 'residential', label: 'Residential Zones', icon: Home },
  { id: 'commercial', label: 'Commercial Zones', icon: Building },
  { id: 'industrial', label: 'Industrial Zones', icon: Factory },
] as const;

export function ZoneFilters({ filters, setFilters }: ZoneFiltersProps) {
  const handleFilterChange = (filterType: keyof Filters) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      [filterType]: !prevFilters[filterType],
    }));
  };

  return (
    <div>
      <Label className="text-lg font-semibold mb-3 flex items-center">
        <Filter className="h-5 w-5 mr-2 text-primary" />
        Filter Zones
      </Label>
      <div className="space-y-3">
        {filterOptions.map((option) => {
          const Icon = option.icon;
          return (
            <div key={option.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-secondary/50 transition-colors">
              <Checkbox
                id={option.id}
                checked={filters[option.id]}
                onCheckedChange={() => handleFilterChange(option.id)}
                className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
              />
              <Icon className={`h-5 w-5 ${filters[option.id] ? 'text-primary' : 'text-muted-foreground'}`} />
              <Label htmlFor={option.id} className="text-sm font-medium cursor-pointer">
                {option.label}
              </Label>
            </div>
          );
        })}
      </div>
    </div>
  );
}

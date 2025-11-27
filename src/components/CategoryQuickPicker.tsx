import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface CategoryQuickPickerProps {
  suggestions: Category[];
  selected?: string;
  onSelect: (categoryId: string) => void;
  loading?: boolean;
}

export function CategoryQuickPicker({
  suggestions,
  selected,
  onSelect,
  loading,
}: CategoryQuickPickerProps) {
  if (loading) {
    return (
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 w-20 bg-muted animate-pulse rounded-md" />
        ))}
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Sparkles className="w-3 h-3" />
        <span>Sugestões</span>
      </div>
      <div className="flex gap-2 flex-wrap">
        {suggestions.map((category) => (
          <Button
            key={category.id}
            type="button"
            variant={selected === category.id ? "default" : "outline"}
            size="sm"
            onClick={() => onSelect(category.id)}
            className="gap-1.5"
          >
            <span>{category.icon}</span>
            <span className="text-xs">{category.name}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

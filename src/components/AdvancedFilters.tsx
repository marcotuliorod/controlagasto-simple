import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { SlidersHorizontal, Save } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSavedFilters } from "@/hooks/useSavedFilters";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AdvancedFiltersProps {
  onApply: (filters: FilterValues) => void;
  currentFilters: FilterValues;
}

export interface FilterValues {
  categories: string[];
  tags: string[];
  minAmount: string;
  maxAmount: string;
  paymentMethods: string[];
}

export function AdvancedFilters({ onApply, currentFilters }: AdvancedFiltersProps) {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<FilterValues>(currentFilters);
  const [filterName, setFilterName] = useState("");
  
  const { filters: savedFilters, saveFilter } = useSavedFilters();

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses-for-tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("tags")
        .not("tags", "is", null);
      if (error) throw error;
      return data;
    },
  });

  const allTags = Array.from(new Set(expenses.flatMap((e) => e.tags || []))).sort();
  const paymentMethods = ["credit", "debit", "cash", "pix", "other"];

  const handleApply = () => {
    onApply(filters);
    setOpen(false);
    toast.success("Filtros aplicados!");
  };

  const handleSaveFilter = async () => {
    if (!filterName.trim()) {
      toast.error("Digite um nome para o filtro");
      return;
    }
    
    await saveFilter.mutateAsync({
      name: filterName,
      filters: filters,
      is_favorite: false,
    });
    
    setFilterName("");
    toast.success("Filtro salvo com sucesso!");
  };

  const handleLoadFilter = (savedFilter: any) => {
    setFilters(savedFilter.filters);
    toast.success(`Filtro "${savedFilter.name}" carregado!`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <SlidersHorizontal className="w-4 h-4 mr-2" />
          Filtros Avançados
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Filtros Avançados</DialogTitle>
          <DialogDescription>
            Configure filtros personalizados para encontrar suas despesas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Saved Filters */}
          {savedFilters && savedFilters.length > 0 && (
            <div className="space-y-2">
              <Label>Filtros Salvos</Label>
              <Select onValueChange={(value) => {
                const saved = savedFilters.find(f => f.id === value);
                if (saved) handleLoadFilter(saved);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Carregar filtro salvo..." />
                </SelectTrigger>
                <SelectContent>
                  {savedFilters.map((filter) => (
                    <SelectItem key={filter.id} value={filter.id}>
                      {filter.is_favorite ? "⭐ " : ""}{filter.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Categories */}
          <div className="space-y-3">
            <Label>Categorias</Label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-md p-3">
              {categories.map((category) => (
                <div key={category.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`cat-${category.id}`}
                    checked={filters.categories.includes(category.id)}
                    onCheckedChange={(checked) => {
                      setFilters({
                        ...filters,
                        categories: checked
                          ? [...filters.categories, category.id]
                          : filters.categories.filter((id) => id !== category.id),
                      });
                    }}
                  />
                  <Label htmlFor={`cat-${category.id}`} className="cursor-pointer text-sm">
                    {category.icon} {category.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-3">
            <Label>Tags</Label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-md p-3">
              {allTags.map((tag) => (
                <div key={tag} className="flex items-center space-x-2">
                  <Checkbox
                    id={`tag-${tag}`}
                    checked={filters.tags.includes(tag)}
                    onCheckedChange={(checked) => {
                      setFilters({
                        ...filters,
                        tags: checked
                          ? [...filters.tags, tag]
                          : filters.tags.filter((t) => t !== tag),
                      });
                    }}
                  />
                  <Label htmlFor={`tag-${tag}`} className="cursor-pointer text-sm">
                    {tag}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Amount Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minAmount">Valor Mínimo (R$)</Label>
              <Input
                id="minAmount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={filters.minAmount}
                onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxAmount">Valor Máximo (R$)</Label>
              <Input
                id="maxAmount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={filters.maxAmount}
                onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
              />
            </div>
          </div>

          {/* Payment Methods */}
          <div className="space-y-3">
            <Label>Formas de Pagamento</Label>
            <div className="grid grid-cols-2 gap-2">
              {paymentMethods.map((method) => (
                <div key={method} className="flex items-center space-x-2">
                  <Checkbox
                    id={`pay-${method}`}
                    checked={filters.paymentMethods.includes(method)}
                    onCheckedChange={(checked) => {
                      setFilters({
                        ...filters,
                        paymentMethods: checked
                          ? [...filters.paymentMethods, method]
                          : filters.paymentMethods.filter((m) => m !== method),
                      });
                    }}
                  />
                  <Label htmlFor={`pay-${method}`} className="cursor-pointer text-sm capitalize">
                    {method === "credit" ? "Crédito" : 
                     method === "debit" ? "Débito" : 
                     method === "cash" ? "Dinheiro" : 
                     method === "pix" ? "PIX" : "Outro"}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Save Filter */}
          <div className="border-t pt-4 space-y-3">
            <Label>Salvar este filtro</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Nome do filtro..."
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
              />
              <Button
                variant="outline"
                onClick={handleSaveFilter}
                disabled={saveFilter.isPending || !filterName.trim()}
              >
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleApply}>
            Aplicar Filtros
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

/**
 * Hook to suggest categories based on merchant/description
 * Uses simple ML-like logic based on historical data
 */
export function useCategorySuggestion(merchant: string) {
  const [suggestions, setSuggestions] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!merchant || merchant.length < 3) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Find most used categories for similar merchants
        const { data: expenses } = await supabase
          .from("expenses")
          .select("category_id, categories(id, name, icon, color)")
          .eq("user_id", user.id)
          .ilike("merchant", `%${merchant}%`)
          .order("created_at", { ascending: false })
          .limit(10);

        if (expenses) {
          // Count category frequency
          const categoryCount = new Map<string, { category: Category; count: number }>();
          
          expenses.forEach((expense) => {
            if (expense.categories) {
              const cat = expense.categories as unknown as Category;
              const existing = categoryCount.get(cat.id);
              if (existing) {
                existing.count++;
              } else {
                categoryCount.set(cat.id, { category: cat, count: 1 });
              }
            }
          });

          // Sort by frequency and get top 3
          const sorted = Array.from(categoryCount.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 3)
            .map((item) => item.category);

          setSuggestions(sorted);
        }
      } catch (error) {
        console.error("Error fetching category suggestions:", error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [merchant]);

  return { suggestions, loading };
}

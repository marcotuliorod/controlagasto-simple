import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertTriangle, FileText, ArrowLeft, Upload, Loader2 } from "lucide-react";
import { formatCurrencyBR } from "@/lib/currencyUtils";
import type { ParsedTransaction } from "@/hooks/useImportTransactions";

interface ImportSummaryProps {
  transactions: ParsedTransaction[];
  categories: Array<{ id: string; name: string; icon: string; color: string }>;
  fileName: string;
  onImport: () => void;
  onBack: () => void;
  isImporting: boolean;
  importProgress?: number;
}

export function ImportSummary({
  transactions,
  categories,
  fileName,
  onImport,
  onBack,
  isImporting,
  importProgress = 0
}: ImportSummaryProps) {
  const stats = useMemo(() => {
    const selected = transactions.filter(t => t.selected !== false);
    const duplicates = transactions.filter(t => t.isDuplicate && t.selected === false);
    const totalAmount = selected.reduce((sum, t) => sum + t.amount, 0);

    // Group by category
    const byCategory: Record<string, { name: string; icon: string; count: number; total: number }> = {};
    selected.forEach(t => {
      const catId = t.categoryId || t.suggestedCategory?.id || 'uncategorized';
      const cat = categories.find(c => c.id === catId);
      
      if (!byCategory[catId]) {
        byCategory[catId] = {
          name: cat?.name || t.suggestedCategory?.name || 'Sem categoria',
          icon: cat?.icon || '📝',
          count: 0,
          total: 0
        };
      }
      byCategory[catId].count++;
      byCategory[catId].total += t.amount;
    });

    return {
      selectedCount: selected.length,
      duplicatesExcluded: duplicates.length,
      totalAmount,
      byCategory: Object.values(byCategory).sort((a, b) => b.total - a.total)
    };
  }, [transactions, categories]);

  if (isImporting) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium">Importando transações...</p>
            <div className="w-full max-w-xs">
              <Progress value={importProgress} className="h-2" />
            </div>
            <p className="text-sm text-muted-foreground">
              {Math.round(importProgress)}% concluído
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Resumo da Importação
        </CardTitle>
        <CardDescription>{fileName}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="bg-primary/10 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-primary">{stats.selectedCount}</p>
            <p className="text-sm text-muted-foreground">Transações para importar</p>
          </div>
          <div className="bg-green-100 dark:bg-green-950/30 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {formatCurrencyBR(stats.totalAmount)}
            </p>
            <p className="text-sm text-muted-foreground">Valor total</p>
          </div>
          <div className="bg-yellow-100 dark:bg-yellow-950/30 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
              {stats.duplicatesExcluded}
            </p>
            <p className="text-sm text-muted-foreground">Duplicatas excluídas</p>
          </div>
        </div>

        {stats.byCategory.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Por Categoria</h4>
            <div className="space-y-2">
              {stats.byCategory.slice(0, 6).map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{cat.icon}</span>
                    <span className="font-medium">{cat.name}</span>
                    <span className="text-xs text-muted-foreground">({cat.count})</span>
                  </div>
                  <span className="font-mono text-sm">{formatCurrencyBR(cat.total)}</span>
                </div>
              ))}
              {stats.byCategory.length > 6 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{stats.byCategory.length - 6} outras categorias
                </p>
              )}
            </div>
          </div>
        )}

        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <p className="font-medium">Pronto para importar</p>
              <p className="text-sm text-muted-foreground">
                As transações serão adicionadas à sua conta selecionada com a origem "import".
              </p>
            </div>
          </div>
          {stats.duplicatesExcluded > 0 && (
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                {stats.duplicatesExcluded} transações foram identificadas como possíveis duplicatas e não serão importadas.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-between gap-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar e Editar
          </Button>
          <Button onClick={onImport} disabled={stats.selectedCount === 0}>
            <Upload className="mr-2 h-4 w-4" />
            Importar {stats.selectedCount} Transações
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

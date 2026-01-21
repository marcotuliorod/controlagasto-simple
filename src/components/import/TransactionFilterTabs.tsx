import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle2, HelpCircle, Banknote, TrendingUp, Building2, ArrowRightLeft } from "lucide-react";
import { formatCurrencyBR } from "@/lib/currencyUtils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ClassifiedTransaction } from "@/hooks/useImportTransactions";
import type { TransactionClassification } from "@/lib/bankPatterns";

interface TransactionFilterTabsProps {
  transactions: ClassifiedTransaction[];
  categories: Array<{ id: string; name: string; icon: string; color: string }>;
  onTransactionsChange: (transactions: ClassifiedTransaction[]) => void;
  onOpenTransferReview: () => void;
}

export function TransactionFilterTabs({
  transactions,
  categories,
  onTransactionsChange,
  onOpenTransferReview
}: TransactionFilterTabsProps) {
  const [activeTab, setActiveTab] = useState("expenses");

  // Group transactions by classification
  const grouped = useMemo(() => {
    const expenses = transactions.filter(t => t.classification === 'expense' && !t.isDuplicate);
    const excluded = transactions.filter(t => 
      ['investment', 'government', 'income', 'ignore'].includes(t.classification || '')
    );
    const needsReview = transactions.filter(t => t.classification === 'transfer' && !t.isDuplicate);
    const duplicates = transactions.filter(t => t.isDuplicate);

    return { expenses, excluded, needsReview, duplicates };
  }, [transactions]);

  const selectedExpenses = grouped.expenses.filter(t => t.selected !== false).length;
  const totalAmount = grouped.expenses
    .filter(t => t.selected !== false)
    .reduce((sum, t) => sum + t.amount, 0);

  const handleSelectExpense = (originalRow: number) => {
    const updated = transactions.map(t => 
      t.originalRow === originalRow 
        ? { ...t, selected: t.selected === false } 
        : t
    );
    onTransactionsChange(updated);
  };

  const handleSelectAllExpenses = (selected: boolean) => {
    const updated = transactions.map(t => 
      t.classification === 'expense' && !t.isDuplicate
        ? { ...t, selected }
        : t
    );
    onTransactionsChange(updated);
  };

  const handleCategoryChange = (originalRow: number, categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    const updated = transactions.map(t => 
      t.originalRow === originalRow
        ? { 
            ...t, 
            categoryId,
            suggestedCategory: category 
              ? { id: categoryId, name: category.name, confidence: 'high' as const }
              : t.suggestedCategory
          }
        : t
    );
    onTransactionsChange(updated);
  };

  const getClassificationIcon = (classification: string) => {
    switch (classification) {
      case 'income': return <Banknote className="h-4 w-4 text-blue-500" />;
      case 'investment': return <TrendingUp className="h-4 w-4 text-purple-500" />;
      case 'government': return <Building2 className="h-4 w-4 text-gray-500" />;
      case 'transfer': return <ArrowRightLeft className="h-4 w-4 text-yellow-500" />;
      default: return null;
    }
  };

  const getClassificationLabel = (classification: string) => {
    switch (classification) {
      case 'income': return 'Receita';
      case 'investment': return 'Investimento';
      case 'government': return 'Governo';
      case 'transfer': return 'Transferência';
      case 'ignore': return 'Ignorado';
      default: return classification;
    }
  };

  const allExpensesSelected = grouped.expenses.length > 0 && 
    grouped.expenses.every(t => t.selected !== false);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
          <div className="text-2xl font-bold text-green-700 dark:text-green-400">
            {selectedExpenses}
          </div>
          <div className="text-sm text-green-600 dark:text-green-500">
            Despesas selecionadas
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {formatCurrencyBR(totalAmount)}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-muted/50 border">
          <div className="text-2xl font-bold">{grouped.excluded.length}</div>
          <div className="text-sm text-muted-foreground">Auto-excluídos</div>
        </div>

        <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800">
          <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
            {grouped.needsReview.length}
          </div>
          <div className="text-sm text-yellow-600 dark:text-yellow-500">
            Precisam revisão
          </div>
        </div>

        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <div className="text-2xl font-bold text-red-700 dark:text-red-400">
            {grouped.duplicates.length}
          </div>
          <div className="text-sm text-red-600 dark:text-red-500">
            Duplicados
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="expenses" className="gap-1">
            <span className="hidden sm:inline">💸</span> Despesas
            <Badge variant="outline" className="ml-1">{grouped.expenses.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="excluded" className="gap-1">
            <span className="hidden sm:inline">🚫</span> Excluídos
            <Badge variant="outline" className="ml-1">{grouped.excluded.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="review" className="gap-1">
            <span className="hidden sm:inline">⚠️</span> Revisar
            <Badge variant="outline" className="ml-1">{grouped.needsReview.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="duplicates" className="gap-1">
            <span className="hidden sm:inline">♻️</span> Duplicados
            <Badge variant="outline" className="ml-1">{grouped.duplicates.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              Transações identificadas como despesas
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleSelectAllExpenses(!allExpensesSelected)}
            >
              {allExpensesSelected ? 'Desmarcar Todas' : 'Selecionar Todas'}
            </Button>
          </div>
          
          <TransactionTable
            transactions={grouped.expenses}
            categories={categories}
            showCheckbox
            onSelectRow={handleSelectExpense}
            onCategoryChange={handleCategoryChange}
          />
        </TabsContent>

        <TabsContent value="excluded" className="mt-4">
          <p className="text-sm text-muted-foreground mb-4">
            Transações excluídas automaticamente (investimentos, receitas, operações governamentais)
          </p>
          
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grouped.excluded.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Nenhuma transação excluída automaticamente
                    </TableCell>
                  </TableRow>
                ) : (
                  grouped.excluded.map((tx, idx) => (
                    <TableRow key={idx} className="bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getClassificationIcon(tx.classification || '')}
                          <span className="text-sm">{getClassificationLabel(tx.classification || '')}</span>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format(parseISO(tx.date), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <p className="truncate max-w-[200px]">{tx.description}</p>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrencyBR(tx.amount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="review" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              Transferências que podem ser despesas ou movimentações internas
            </p>
            {grouped.needsReview.length > 0 && (
              <Button onClick={onOpenTransferReview}>
                Revisar Transferências
              </Button>
            )}
          </div>
          
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grouped.needsReview.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Nenhuma transferência para revisar
                    </TableCell>
                  </TableRow>
                ) : (
                  grouped.needsReview.map((tx, idx) => (
                    <TableRow key={idx} className="bg-yellow-50/50 dark:bg-yellow-950/20">
                      <TableCell className="whitespace-nowrap">
                        {format(parseISO(tx.date), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{tx.merchant}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {tx.description}
                        </p>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrencyBR(tx.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-yellow-600">
                          <ArrowRightLeft className="h-3 w-3 mr-1" />
                          Pendente
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="duplicates" className="mt-4">
          <p className="text-sm text-muted-foreground mb-4">
            Transações que podem já existir no sistema
          </p>
          
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grouped.duplicates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Nenhuma duplicata encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  grouped.duplicates.map((tx, idx) => (
                    <TableRow key={idx} className="bg-red-50/50 dark:bg-red-950/20">
                      <TableCell className="whitespace-nowrap">
                        {format(parseISO(tx.date), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{tx.merchant}</p>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrencyBR(tx.amount)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-red-600">
                          <AlertTriangle className="h-3 w-3" />
                          <span className="text-xs">{tx.duplicateReason}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Sub-component for expense table
function TransactionTable({
  transactions,
  categories,
  showCheckbox,
  onSelectRow,
  onCategoryChange
}: {
  transactions: ClassifiedTransaction[];
  categories: Array<{ id: string; name: string; icon: string; color: string }>;
  showCheckbox?: boolean;
  onSelectRow?: (originalRow: number) => void;
  onCategoryChange?: (originalRow: number, categoryId: string) => void;
}) {
  const getConfidenceIcon = (confidence?: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'medium':
        return <HelpCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {showCheckbox && <TableHead className="w-12"></TableHead>}
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Categoria</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showCheckbox ? 5 : 4} className="text-center py-8 text-muted-foreground">
                  Nenhuma transação encontrada
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((tx, idx) => (
                <TableRow key={idx}>
                  {showCheckbox && (
                    <TableCell>
                      <Checkbox
                        checked={tx.selected !== false}
                        onCheckedChange={() => onSelectRow?.(tx.originalRow || idx)}
                        aria-label={`Selecionar ${tx.merchant}`}
                      />
                    </TableCell>
                  )}
                  <TableCell className="whitespace-nowrap">
                    {format(parseISO(tx.date), 'dd/MM/yyyy', { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[200px]">
                      <p className="font-medium truncate">{tx.merchant}</p>
                      {tx.description !== tx.merchant && (
                        <p className="text-xs text-muted-foreground truncate">
                          {tx.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono whitespace-nowrap">
                    {formatCurrencyBR(tx.amount)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Select
                        value={tx.categoryId || tx.suggestedCategory?.id || 'none'}
                        onValueChange={(val) => onCategoryChange?.(tx.originalRow || idx, val)}
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue placeholder="Categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem categoria</SelectItem>
                          {categories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>
                              <span className="flex items-center gap-2">
                                <span>{cat.icon}</span>
                                <span>{cat.name}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {tx.suggestedCategory && getConfidenceIcon(tx.suggestedCategory.confidence)}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle2, HelpCircle, Edit2, Check, X } from "lucide-react";
import { formatCurrencyBR } from "@/lib/currencyUtils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ParsedTransaction } from "@/hooks/useImportTransactions";

interface ImportPreviewTableProps {
  transactions: ParsedTransaction[];
  categories: Array<{ id: string; name: string; icon: string; color: string }>;
  onTransactionsChange: (transactions: ParsedTransaction[]) => void;
}

export function ImportPreviewTable({
  transactions,
  categories,
  onTransactionsChange
}: ImportPreviewTableProps) {
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Partial<ParsedTransaction>>({});

  const allSelected = transactions.every(t => t.selected !== false);
  const someSelected = transactions.some(t => t.selected !== false) && !allSelected;
  const selectedCount = transactions.filter(t => t.selected !== false).length;
  const duplicatesCount = transactions.filter(t => t.isDuplicate).length;

  const handleSelectAll = () => {
    const newSelected = !allSelected;
    onTransactionsChange(transactions.map(t => ({ ...t, selected: newSelected })));
  };

  const handleSelectRow = (index: number) => {
    const updated = [...transactions];
    updated[index] = { ...updated[index], selected: updated[index].selected === false };
    onTransactionsChange(updated);
  };

  const handleCategoryChange = (index: number, categoryId: string) => {
    const updated = [...transactions];
    const category = categories.find(c => c.id === categoryId);
    updated[index] = {
      ...updated[index],
      categoryId,
      suggestedCategory: category 
        ? { id: categoryId, name: category.name, confidence: 'high' as const }
        : updated[index].suggestedCategory
    };
    onTransactionsChange(updated);
  };

  const startEditing = (index: number) => {
    const tx = transactions[index];
    setEditingRow(index);
    setEditValues({
      date: tx.date,
      merchant: tx.merchant,
      amount: tx.amount
    });
  };

  const cancelEditing = () => {
    setEditingRow(null);
    setEditValues({});
  };

  const saveEditing = () => {
    if (editingRow === null) return;
    
    const updated = [...transactions];
    updated[editingRow] = {
      ...updated[editingRow],
      date: editValues.date || updated[editingRow].date,
      merchant: editValues.merchant || updated[editingRow].merchant,
      amount: editValues.amount || updated[editingRow].amount
    };
    onTransactionsChange(updated);
    setEditingRow(null);
    setEditValues({});
  };

  const getConfidenceIcon = (confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'medium':
        return <HelpCircle className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const selectNonDuplicates = () => {
    onTransactionsChange(transactions.map(t => ({ ...t, selected: !t.isDuplicate })));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">
            <strong>{transactions.length}</strong> transações encontradas
          </p>
        {duplicatesCount > 0 && (
          <Badge variant="outline" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            {duplicatesCount} possíveis duplicadas
          </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSelectAll}>
            {allSelected ? 'Desmarcar Todas' : 'Marcar Todas'}
          </Button>
          {duplicatesCount > 0 && (
            <Button variant="outline" size="sm" onClick={selectNonDuplicates}>
              Ignorar Duplicadas
            </Button>
          )}
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    ref={(el) => {
                      if (el) (el as HTMLButtonElement).dataset.indeterminate = String(someSelected);
                    }}
                    onCheckedChange={handleSelectAll}
                    aria-label="Selecionar todas as transações"
                  />
                </TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="w-20">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx, index) => (
                <TableRow
                  key={index}
                  className={tx.isDuplicate ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''}
                >
                  <TableCell>
                    <Checkbox
                      checked={tx.selected !== false}
                      onCheckedChange={() => handleSelectRow(index)}
                      aria-label={`Selecionar transação ${tx.merchant}`}
                    />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {editingRow === index ? (
                      <Input
                        type="date"
                        value={editValues.date}
                        onChange={(e) => setEditValues(v => ({ ...v, date: e.target.value }))}
                        className="w-36"
                      />
                    ) : (
                      format(parseISO(tx.date), 'dd/MM/yyyy', { locale: ptBR })
                    )}
                  </TableCell>
                  <TableCell>
                    {editingRow === index ? (
                      <Input
                        value={editValues.merchant}
                        onChange={(e) => setEditValues(v => ({ ...v, merchant: e.target.value }))}
                        className="w-48"
                      />
                    ) : (
                      <div className="max-w-[250px]">
                        <p className="font-medium truncate">{tx.merchant}</p>
                        {tx.description !== tx.merchant && (
                          <p className="text-xs text-muted-foreground truncate">{tx.description}</p>
                        )}
                        {tx.isDuplicate && (
                          <div className="flex items-center gap-1 mt-1 text-yellow-600 dark:text-yellow-400">
                            <AlertTriangle className="h-3 w-3" />
                            <span className="text-xs">{tx.duplicateReason}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {editingRow === index ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={editValues.amount}
                        onChange={(e) => setEditValues(v => ({ ...v, amount: parseFloat(e.target.value) }))}
                        className="w-28 text-right"
                      />
                    ) : (
                      <span className="font-mono">{formatCurrencyBR(tx.amount)}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Select
                        value={tx.categoryId || tx.suggestedCategory?.id || 'none'}
                        onValueChange={(val) => handleCategoryChange(index, val)}
                      >
                        <SelectTrigger className="w-40">
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
                      {tx.suggestedCategory && (
                        getConfidenceIcon(tx.suggestedCategory.confidence)
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {editingRow === index ? (
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={saveEditing}>
                          <Check className="h-4 w-4 text-green-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={cancelEditing}>
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ) : (
                      <Button variant="ghost" size="icon" onClick={() => startEditing(index)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <p className="text-sm text-muted-foreground text-center">
        {selectedCount} de {transactions.length} transações selecionadas para importação
      </p>
    </div>
  );
}

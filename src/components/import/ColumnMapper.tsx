import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Save, ArrowRight } from "lucide-react";
import type { ColumnMapping } from "@/hooks/useImportTransactions";

interface ColumnMapperProps {
  columns: string[];
  previewRows: string[][];
  autoMapping?: Partial<ColumnMapping>;
  savedMappings?: Array<{ bank_name: string; mapping: ColumnMapping }>;
  onMappingComplete: (mapping: ColumnMapping, saveAs?: string) => void;
  onCancel: () => void;
}

const FIELD_LABELS: Record<string, { label: string; required: boolean; description: string }> = {
  date: { label: 'Data', required: true, description: 'Data da transação' },
  description: { label: 'Descrição', required: true, description: 'Descrição ou nome do estabelecimento' },
  amount: { label: 'Valor', required: true, description: 'Valor da transação' },
  type: { label: 'Tipo', required: false, description: 'Débito/Crédito (opcional)' },
  balance: { label: 'Saldo', required: false, description: 'Saldo após transação (opcional)' },
};

export function ColumnMapper({
  columns,
  previewRows,
  autoMapping = {},
  savedMappings = [],
  onMappingComplete,
  onCancel
}: ColumnMapperProps) {
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>({
    date: autoMapping.date,
    description: autoMapping.description,
    amount: autoMapping.amount,
    type: autoMapping.type,
    balance: autoMapping.balance,
  });
  const [saveMapping, setSaveMapping] = useState(false);
  const [bankName, setBankName] = useState('');
  const [selectedSavedMapping, setSelectedSavedMapping] = useState<string>('');

  const isValid = useMemo(() => {
    return mapping.date !== undefined && 
           mapping.description !== undefined && 
           mapping.amount !== undefined;
  }, [mapping]);

  const handleFieldChange = (field: keyof ColumnMapping, value: string) => {
    if (value === 'none') {
      setMapping(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    } else {
      setMapping(prev => ({ ...prev, [field]: parseInt(value) }));
    }
  };

  const handleUseSavedMapping = (mappingName: string) => {
    const saved = savedMappings.find(m => m.bank_name === mappingName);
    if (saved) {
      setMapping(saved.mapping);
      setSelectedSavedMapping(mappingName);
      setBankName(mappingName);
    }
  };

  const handleComplete = () => {
    if (!isValid) return;

    const finalMapping: ColumnMapping = {
      date: mapping.date!,
      description: mapping.description!,
      amount: mapping.amount!,
      type: mapping.type,
      balance: mapping.balance,
    };

    onMappingComplete(finalMapping, saveMapping && bankName ? bankName : undefined);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mapear Colunas</CardTitle>
        <CardDescription>
          Indique qual coluna do arquivo corresponde a cada campo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {savedMappings.length > 0 && (
          <div className="space-y-2">
            <Label>Usar mapeamento salvo</Label>
            <Select value={selectedSavedMapping} onValueChange={handleUseSavedMapping}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um banco..." />
              </SelectTrigger>
              <SelectContent>
                {savedMappings.map(m => (
                  <SelectItem key={m.bank_name} value={m.bank_name}>
                    {m.bank_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(FIELD_LABELS).map(([field, { label, required, description }]) => (
            <div key={field} className="space-y-2">
            <Label className="flex items-center gap-2">
                {label}
                {required && <Badge variant="outline" className="text-xs">Obrigatório</Badge>}
              </Label>
              <Select
                value={mapping[field as keyof ColumnMapping]?.toString() ?? 'none'}
                onValueChange={(val) => handleFieldChange(field as keyof ColumnMapping, val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não mapear</SelectItem>
                  {columns.map((col, idx) => (
                    <SelectItem key={idx} value={idx.toString()}>
                      {col || `Coluna ${idx + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted px-4 py-2 border-b">
            <p className="text-sm font-medium">Pré-visualização (primeiras 5 linhas)</p>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((col, idx) => (
                    <TableHead key={idx} className="whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span>{col || `Coluna ${idx + 1}`}</span>
                        {Object.entries(mapping).some(([_, v]) => v === idx) && (
                          <Badge variant="default" className="text-xs w-fit">
                            {FIELD_LABELS[Object.entries(mapping).find(([_, v]) => v === idx)?.[0] ?? '']?.label}
                          </Badge>
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map((row, rowIdx) => (
                  <TableRow key={rowIdx}>
                    {row.map((cell, cellIdx) => (
                      <TableCell key={cellIdx} className="whitespace-nowrap max-w-[200px] truncate">
                        {cell}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="save-mapping"
            checked={saveMapping}
            onCheckedChange={(checked) => setSaveMapping(checked === true)}
          />
          <Label htmlFor="save-mapping" className="cursor-pointer">
            Salvar este mapeamento para uso futuro
          </Label>
        </div>

        {saveMapping && (
          <div className="space-y-2">
            <Label htmlFor="bank-name">Nome do banco</Label>
            <Input
              id="bank-name"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="Ex: Nubank, Itaú, Bradesco..."
            />
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={handleComplete} disabled={!isValid}>
            {saveMapping && bankName && <Save className="mr-2 h-4 w-4" />}
            Continuar
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

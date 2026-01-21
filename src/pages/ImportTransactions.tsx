import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FileUploadZone } from "@/components/import/FileUploadZone";
import { ColumnMapper } from "@/components/import/ColumnMapper";
import { ImportPreviewTable } from "@/components/import/ImportPreviewTable";
import { ImportSummary } from "@/components/import/ImportSummary";
import { useImportTransactions, ParsedTransaction, ColumnMapping } from "@/hooks/useImportTransactions";
import { useAccounts } from "@/hooks/useAccounts";
import { ArrowLeft, FileSpreadsheet, Loader2 } from "lucide-react";
import { triggerCelebration } from "@/components/feedback/Celebration";

type Step = 'upload' | 'mapping' | 'preview' | 'summary';

export default function ImportTransactions() {
  const navigate = useNavigate();
  const { processFile, importTransactions, savedMappings, saveMapping, getFileType } = useImportTransactions();
  const { accounts = [], isLoading: isLoadingAccounts } = useAccounts();

  const [step, setStep] = useState<Step>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [accountId, setAccountId] = useState<string>('');
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; icon: string; color: string }>>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [autoMapping, setAutoMapping] = useState<Partial<ColumnMapping>>({});
  const [fileHash, setFileHash] = useState<string>('');

  useEffect(() => {
    if (accounts && accounts.length > 0 && !accountId) {
      setAccountId(accounts[0].id);
    }
  }, [accounts, accountId]);

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    
    const result = await processFile.mutateAsync({ file, accountId });
    
    if (result.needsMapping) {
      setColumns(result.columns || []);
      setPreviewRows(result.previewRows || []);
      setAutoMapping(result.autoMapping || {});
      setStep('mapping');
    } else {
      setTransactions(result.transactions.map(t => ({ ...t, selected: !t.isDuplicate })));
      setCategories(result.categories || []);
      setFileHash(result.fileHash || '');
      setStep('preview');
    }
  };

  const handleMappingComplete = async (mapping: ColumnMapping, saveName?: string) => {
    if (saveName) {
      await saveMapping.mutateAsync({ bankName: saveName, mapping });
    }

    const result = await processFile.mutateAsync({ 
      file: selectedFile!, 
      mapping, 
      accountId 
    });

    setTransactions(result.transactions.map(t => ({ ...t, selected: !t.isDuplicate })));
    setCategories(result.categories || []);
    setFileHash(result.fileHash || '');
    setStep('preview');
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    const result = await importTransactions.mutateAsync({
      transactions,
      accountId,
      fileHash,
      fileName: selectedFile.name,
      fileType: getFileType(selectedFile) || 'csv'
    });

    triggerCelebration("achievement");
    setTimeout(() => {
      navigate('/expenses');
    }, 1500);
  };

  const handleReset = () => {
    setStep('upload');
    setSelectedFile(null);
    setTransactions([]);
    setColumns([]);
    setPreviewRows([]);
  };

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Importar Transações</h1>
          <p className="text-muted-foreground">Importe extratos bancários ou faturas de cartão</p>
        </div>
      </div>

      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Upload do Arquivo
            </CardTitle>
            <CardDescription>
              Selecione um arquivo CSV, OFX ou PDF do seu banco
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Conta de destino</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma conta..." />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.icon} {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <FileUploadZone
              onFileSelect={handleFileSelect}
              selectedFile={selectedFile}
              onClear={() => setSelectedFile(null)}
              isLoading={processFile.isPending}
              acceptedFormats={['.csv', '.ofx', '.qfx', '.pdf']}
            />

            {processFile.isPending && (
              <div className="flex flex-col items-center justify-center gap-2 py-4">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Processando arquivo...</span>
                {selectedFile?.name.toLowerCase().endsWith('.pdf') && (
                  <span className="text-sm text-muted-foreground">
                    PDFs podem levar alguns segundos a mais para processar...
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 'mapping' && (
        <ColumnMapper
          columns={columns}
          previewRows={previewRows}
          autoMapping={autoMapping}
          savedMappings={savedMappings.data?.map(m => ({
            bank_name: m.bank_name,
            mapping: m.mapping as unknown as ColumnMapping
          }))}
          onMappingComplete={handleMappingComplete}
          onCancel={handleReset}
        />
      )}

      {step === 'preview' && (
        <Card>
          <CardHeader>
            <CardTitle>Revisar Transações</CardTitle>
            <CardDescription>
              Verifique os dados e faça ajustes antes de importar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ImportPreviewTable
              transactions={transactions}
              categories={categories}
              onTransactionsChange={setTransactions}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleReset}>Cancelar</Button>
              <Button onClick={() => setStep('summary')}>
                Continuar para Resumo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'summary' && selectedFile && (
        <ImportSummary
          transactions={transactions}
          categories={categories}
          fileName={selectedFile.name}
          onImport={handleImport}
          onBack={() => setStep('preview')}
          isImporting={importTransactions.isPending}
        />
      )}
    </div>
  );
}

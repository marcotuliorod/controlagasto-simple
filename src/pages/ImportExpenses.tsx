import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Upload, Download, FileSpreadsheet, Loader2, CheckCircle2 } from "lucide-react";
import * as XLSX from "xlsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ParsedExpense {
  date: string;
  amount: number;
  merchant: string;
  category?: string;
  payment_method?: string;
  notes?: string;
}

export default function ImportExpenses() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedExpense[]>([]);
  const [categories, setCategories] = useState<Record<string, string>>({});

  const downloadTemplate = () => {
    const template = [
      ['Data (AAAA-MM-DD)', 'Valor', 'Estabelecimento', 'Categoria', 'Forma Pagamento', 'Observações'],
      ['2025-01-20', '150.50', 'Supermercado', 'Alimentação', 'Crédito', 'Compras mensais'],
      ['2025-01-19', '45.00', 'Posto Ipiranga', 'Transporte', 'PIX', 'Gasolina'],
      ['2025-01-18', '25.80', 'Padaria', 'Alimentação', 'Dinheiro', ''],
    ];

    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    
    // Generate buffer
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template-importacao-despesas.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success('Template baixado com sucesso!');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error('Por favor, selecione um arquivo Excel (.xlsx, .xls) ou CSV');
      return;
    }

    setIsProcessing(true);
    toast.info('Processando arquivo...');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Load categories
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('id, name')
        .or(`user_id.eq.${user.id},is_default.eq.true`);

      const categoryMap: Record<string, string> = {};
      categoriesData?.forEach(cat => {
        categoryMap[cat.name.toLowerCase()] = cat.id;
      });
      setCategories(categoryMap);

      // Read file
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { raw: false });

      if (jsonData.length === 0) {
        throw new Error('Arquivo vazio ou sem dados válidos');
      }

      // Parse and validate data
      const parsed: ParsedExpense[] = [];
      const errors: string[] = [];

      jsonData.forEach((row: any, index: number) => {
        try {
          // Try different column name variations
          const dateValue = row['Data (AAAA-MM-DD)'] || row['Data'] || row['date'];
          const amountValue = row['Valor'] || row['amount'] || row['Amount'];
          const merchantValue = row['Estabelecimento'] || row['Merchant'] || row['merchant'];
          const categoryValue = row['Categoria'] || row['Category'] || row['category'];
          const paymentValue = row['Forma Pagamento'] || row['Payment'] || row['payment_method'];
          const notesValue = row['Observações'] || row['Notes'] || row['notes'];

          if (!dateValue || !amountValue || !merchantValue) {
            errors.push(`Linha ${index + 2}: Campos obrigatórios faltando (Data, Valor, Estabelecimento)`);
            return;
          }

          // Parse date
          let dateStr: string;
          if (dateValue.includes('/')) {
            const [day, month, year] = dateValue.split('/');
            dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          } else if (dateValue.includes('-')) {
            dateStr = dateValue;
          } else {
            throw new Error('Formato de data inválido');
          }

          // Parse amount
          const amountStr = String(amountValue).replace(/[^0-9.,]/g, '').replace(',', '.');
          const amount = parseFloat(amountStr);
          
          if (isNaN(amount) || amount <= 0) {
            errors.push(`Linha ${index + 2}: Valor inválido`);
            return;
          }

          parsed.push({
            date: dateStr,
            amount,
            merchant: String(merchantValue).trim(),
            category: categoryValue ? String(categoryValue).trim() : undefined,
            payment_method: paymentValue ? String(paymentValue).trim() : undefined,
            notes: notesValue ? String(notesValue).trim() : undefined,
          });
        } catch (err: any) {
          errors.push(`Linha ${index + 2}: ${err.message}`);
        }
      });

      if (errors.length > 0) {
        console.warn('Erros de importação:', errors);
        toast.warning(`${parsed.length} linhas válidas, ${errors.length} com erros`);
      }

      if (parsed.length === 0) {
        throw new Error('Nenhuma linha válida encontrada');
      }

      setParsedData(parsed);
      toast.success(`${parsed.length} despesas prontas para importar`);

    } catch (error: any) {
      console.error('Erro ao processar arquivo:', error);
      toast.error(error.message || 'Erro ao processar arquivo');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;

    setIsProcessing(true);
    toast.info('Importando despesas...');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Get first active account
      const { data: accounts } = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1);

      const defaultAccountId = accounts?.[0]?.id || null;

      const expenses = parsedData.map(exp => {
        const categoryName = exp.category?.toLowerCase();
        const categoryId = categoryName ? categories[categoryName] : null;

        return {
          user_id: user.id,
          amount: exp.amount,
          date: exp.date,
          merchant: exp.merchant,
          category_id: categoryId,
          account_id: defaultAccountId,
          payment_method: exp.payment_method || null,
          notes: exp.notes || null,
          source: 'import',
        };
      });

      const { error } = await supabase.from('expenses').insert(expenses);

      if (error) throw error;

      toast.success(`${expenses.length} despesas importadas com sucesso!`);
      navigate('/expenses');

    } catch (error: any) {
      console.error('Erro ao importar:', error);
      toast.error(error.message || 'Erro ao importar despesas');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <header className="gradient-primary text-white p-6">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/settings')}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Importar Despesas</h1>
            <p className="text-white/80 text-sm">Importe despesas de arquivos CSV ou Excel</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Como Importar
            </CardTitle>
            <CardDescription>
              Siga os passos abaixo para importar suas despesas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">1</div>
                  <h3 className="font-semibold">Baixe o Template</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Baixe nosso modelo para ver o formato correto
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">2</div>
                  <h3 className="font-semibold">Preencha os Dados</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Adicione suas despesas seguindo o formato
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">3</div>
                  <h3 className="font-semibold">Importe o Arquivo</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Faça upload e confirme a importação
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={downloadTemplate} variant="outline" className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Baixar Template
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upload do Arquivo</CardTitle>
            <CardDescription>
              Selecione um arquivo Excel (.xlsx, .xls) ou CSV
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">Arquivo</Label>
              <Input
                ref={fileInputRef}
                id="file"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                disabled={isProcessing}
              />
              <p className="text-xs text-muted-foreground">
                Formatos aceitos: Excel (.xlsx, .xls) e CSV
              </p>
            </div>

            {isProcessing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Processando arquivo...
              </div>
            )}
          </CardContent>
        </Card>

        {parsedData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Preview da Importação
              </CardTitle>
              <CardDescription>
                {parsedData.length} despesas encontradas. Revise antes de importar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded-lg overflow-x-auto max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Estabelecimento</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Pagamento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 10).map((exp, index) => (
                      <TableRow key={index}>
                        <TableCell>{exp.date}</TableCell>
                        <TableCell>R$ {exp.amount.toFixed(2)}</TableCell>
                        <TableCell>{exp.merchant}</TableCell>
                        <TableCell>{exp.category || '-'}</TableCell>
                        <TableCell>{exp.payment_method || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {parsedData.length > 10 && (
                <p className="text-sm text-muted-foreground text-center">
                  Mostrando 10 de {parsedData.length} despesas
                </p>
              )}
              <Button 
                onClick={handleImport} 
                disabled={isProcessing} 
                className="w-full"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Importar {parsedData.length} Despesas
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

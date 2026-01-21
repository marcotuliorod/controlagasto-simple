import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ParsedTransaction {
  date: string;
  description: string;
  merchant: string;
  amount: number;
  type: 'debit' | 'credit';
  suggestedCategory?: {
    id: string | null;
    name: string;
    confidence: 'high' | 'medium' | 'low';
  };
  isDuplicate: boolean;
  duplicateReason?: string;
  originalRow?: number;
  selected?: boolean;
  categoryId?: string | null;
}

export interface ImportResult {
  success: boolean;
  transactions: ParsedTransaction[];
  totalCount: number;
  duplicatesCount: number;
  columns?: string[];
  previewRows?: string[][];
  needsMapping: boolean;
  autoMapping?: Partial<ColumnMapping>;
  categories?: Array<{ id: string; name: string; icon: string; color: string }>;
  fileHash?: string;
  error?: string;
  alreadyImported?: boolean;
  pdfNotSupported?: boolean;
}

export interface ColumnMapping {
  date: number;
  description: number;
  amount: number;
  type?: number;
  balance?: number;
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getFileType(file: File): 'csv' | 'ofx' | 'pdf' | null {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'csv') return 'csv';
  if (extension === 'ofx' || extension === 'qfx') return 'ofx';
  if (extension === 'pdf') return 'pdf';
  
  // Check MIME type
  if (file.type === 'text/csv' || file.type === 'application/csv') return 'csv';
  if (file.type === 'application/pdf') return 'pdf';
  
  return null;
}

export function useImportTransactions() {
  const queryClient = useQueryClient();

  const processFile = useMutation({
    mutationFn: async ({ 
      file, 
      mapping, 
      accountId 
    }: { 
      file: File; 
      mapping?: ColumnMapping; 
      accountId?: string;
    }): Promise<ImportResult> => {
      const fileType = getFileType(file);
      if (!fileType) {
        throw new Error('Formato de arquivo não suportado. Use CSV, OFX ou PDF.');
      }

      // Check file size (5MB for PDF, 10MB for others)
      const maxSize = fileType === 'pdf' ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error(fileType === 'pdf' 
          ? 'PDF muito grande. O limite é 5MB. Tente exportar em CSV.' 
          : 'Arquivo muito grande. O limite é 10MB.');
      }

      const fileContent = await fileToBase64(file);

      const { data, error } = await supabase.functions.invoke('process-import-file', {
        body: { 
          fileContent, 
          fileType, 
          mapping,
          accountId 
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      return data as ImportResult;
    },
    onError: (error) => {
      console.error('Error processing file:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao processar arquivo');
    }
  });

  const importTransactions = useMutation({
    mutationFn: async ({ 
      transactions, 
      accountId,
      fileHash,
      fileName,
      fileType
    }: { 
      transactions: ParsedTransaction[];
      accountId: string;
      fileHash: string;
      fileName: string;
      fileType: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const selectedTransactions = transactions.filter(t => t.selected !== false);
      if (selectedTransactions.length === 0) {
        throw new Error('Nenhuma transação selecionada para importar');
      }

      // Create import session
      const { data: session, error: sessionError } = await supabase
        .from('import_sessions')
        .insert({
          user_id: user.id,
          file_name: fileName,
          file_type: fileType,
          file_hash: fileHash,
          status: 'processing',
          total_transactions: transactions.length,
          imported_transactions: 0,
          skipped_duplicates: transactions.filter(t => t.isDuplicate && t.selected === false).length
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Insert expenses in batches
      const BATCH_SIZE = 50;
      let importedCount = 0;

      for (let i = 0; i < selectedTransactions.length; i += BATCH_SIZE) {
        const batch = selectedTransactions.slice(i, i + BATCH_SIZE);
        
        const expenses = batch.map(tx => ({
          user_id: user.id,
          date: tx.date,
          merchant: tx.merchant || tx.description.substring(0, 100),
          amount: tx.amount,
          category_id: tx.categoryId || tx.suggestedCategory?.id || null,
          account_id: accountId,
          source: 'import',
          import_session_id: session.id,
          notes: tx.description !== tx.merchant ? tx.description : null
        }));

        const { error: insertError } = await supabase
          .from('expenses')
          .insert(expenses);

        if (insertError) {
          // Update session with error
          await supabase
            .from('import_sessions')
            .update({ 
              status: 'failed', 
              error_message: insertError.message,
              imported_transactions: importedCount
            })
            .eq('id', session.id);
          throw insertError;
        }

        importedCount += batch.length;
      }

      // Update session as completed
      await supabase
        .from('import_sessions')
        .update({ 
          status: 'completed', 
          completed_at: new Date().toISOString(),
          imported_transactions: importedCount
        })
        .eq('id', session.id);

      return { 
        importedCount, 
        sessionId: session.id,
        skippedDuplicates: transactions.filter(t => t.isDuplicate && t.selected === false).length
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success(`${data.importedCount} transações importadas com sucesso!`);
    },
    onError: (error) => {
      console.error('Error importing transactions:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao importar transações');
    }
  });

  const savedMappings = useQuery({
    queryKey: ['import-mappings'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('import_mappings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  const saveMapping = useMutation({
    mutationFn: async ({ 
      bankName, 
      mapping 
    }: { 
      bankName: string; 
      mapping: ColumnMapping;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // First try to find existing mapping
      const { data: existing } = await supabase
        .from('import_mappings')
        .select('id')
        .eq('user_id', user.id)
        .eq('bank_name', bankName)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('import_mappings')
          .update({ mapping: JSON.parse(JSON.stringify(mapping)) })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('import_mappings')
          .insert([{
            user_id: user.id,
            bank_name: bankName,
            mapping: JSON.parse(JSON.stringify(mapping))
          }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-mappings'] });
      toast.success('Mapeamento salvo com sucesso!');
    }
  });

  return { 
    processFile, 
    importTransactions, 
    savedMappings, 
    saveMapping,
    getFileType
  };
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { TransactionClassification } from "@/lib/bankPatterns";

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

// Extended transaction with classification for smart filtering
export interface ClassifiedTransaction extends ParsedTransaction {
  classification?: TransactionClassification;
  originalDescription?: string;
  documentNumber?: string;
}

export interface ImportResult {
  success: boolean;
  transactions: ClassifiedTransaction[];
  totalCount: number;
  duplicatesCount: number;
  excludedCount?: number;
  reviewCount?: number;
  columns?: string[];
  previewRows?: string[][];
  needsMapping: boolean;
  autoMapping?: Partial<ColumnMapping>;
  categories?: Array<{ id: string; name: string; icon: string; color: string }>;
  fileHash?: string;
  error?: string;
  alreadyImported?: boolean;
  pdfNotSupported?: boolean;
  detectedBank?: {
    name: string;
    code: string;
    displayName: string;
  } | null;
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

/**
 * Limite de tamanho por tipo, em MB.
 *
 * O PDF tem limite menor porque trafega em base64 no corpo da requisição, o que
 * infla o payload em cerca de um terço.
 *
 * Exportado para a zona de upload anunciar exatamente o número que o hook
 * cobra: ela dizia 10MB para tudo, e o PDF entre 5MB e 10MB só era recusado
 * depois de o usuário escolher o arquivo.
 */
export const MAX_FILE_SIZE_MB: Record<'csv' | 'ofx' | 'pdf', number> = {
  csv: 10,
  ofx: 10,
  pdf: 5,
};

/** O mesmo limite indexado pela extensão, que é o que a zona de upload vê. */
export const MAX_FILE_SIZE_MB_BY_EXTENSION: Record<string, number> = {
  '.csv': MAX_FILE_SIZE_MB.csv,
  '.ofx': MAX_FILE_SIZE_MB.ofx,
  '.qfx': MAX_FILE_SIZE_MB.ofx,
  '.pdf': MAX_FILE_SIZE_MB.pdf,
};

/**
 * Extrai a mensagem que a edge function escreveu no corpo da resposta.
 *
 * `supabase.functions.invoke` devolve `data: null` em qualquer status não-2xx,
 * então o `data.error` em português nunca era lido e o usuário via
 * "Edge Function returned a non-2xx status code". A resposta crua fica em
 * `error.context`; é de lá que a mensagem tem que sair.
 */
async function messageFromInvokeError(error: unknown): Promise<string> {
  const context = (error as { context?: unknown })?.context;

  if (context instanceof Response) {
    try {
      const body = await context.clone().json();
      if (typeof body?.error === 'string' && body.error.trim()) {
        return body.error;
      }
    } catch {
      // Corpo não-JSON (timeout de gateway, HTML de erro): cai no genérico.
    }

    if (context.status === 504 || context.status === 408) {
      return 'O processamento demorou demais. Tente um arquivo menor ou exporte o extrato em CSV.';
    }
  }

  // Nunca repassar `error.message` aqui: é sempre a mensagem em inglês do SDK.
  console.error('Falha na chamada de process-import-file:', error);
  return 'Não foi possível processar o arquivo. Tente novamente ou exporte o extrato em CSV.';
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

      const maxSizeMB = MAX_FILE_SIZE_MB[fileType];
      if (file.size > maxSizeMB * 1024 * 1024) {
        throw new Error(fileType === 'pdf'
          ? `PDF muito grande. O limite é ${maxSizeMB}MB. Tente exportar em CSV.`
          : `Arquivo muito grande. O limite é ${maxSizeMB}MB.`);
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

      if (error) throw new Error(await messageFromInvokeError(error));
      if (!data?.success) {
        throw new Error(data?.error || 'Não foi possível processar o arquivo.');
      }

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

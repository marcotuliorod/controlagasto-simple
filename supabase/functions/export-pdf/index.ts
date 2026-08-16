import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple PDF generator class - creates valid PDF 1.4 documents
class SimplePDF {
  private objects: string[] = [];
  private pages: number[] = [];
  private content: string[] = [];
  private objectOffsets: number[] = [];
  private currentY = 800;
  private pageHeight = 842;
  private pageWidth = 595;
  private margin = 50;
  private lineHeight = 14;
  private fontSize = 10;

  constructor() {
    // Initialize with required PDF objects
  }

  private escapeText(text: string): string {
    if (!text) return '';
    return text
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      // eslint-disable-next-line no-control-regex -- intentional: strips real control chars that would break PDF content-stream syntax
      .replace(/[\x00-\x1F\x7F]/g, '');
  }

  addTitle(text: string): void {
    this.content.push(`BT /F1 18 Tf ${this.margin} ${this.currentY} Td (${this.escapeText(text)}) Tj ET`);
    this.currentY -= 30;
  }

  addSubtitle(text: string): void {
    this.content.push(`BT /F1 12 Tf ${this.margin} ${this.currentY} Td (${this.escapeText(text)}) Tj ET`);
    this.currentY -= 20;
  }

  addText(text: string, indent = 0): void {
    if (this.currentY < 50) {
      this.newPage();
    }
    const x = this.margin + indent;
    this.content.push(`BT /F1 ${this.fontSize} Tf ${x} ${this.currentY} Td (${this.escapeText(text)}) Tj ET`);
    this.currentY -= this.lineHeight;
  }

  addLine(): void {
    this.content.push(`${this.margin} ${this.currentY + 5} m ${this.pageWidth - this.margin} ${this.currentY + 5} l S`);
    this.currentY -= 10;
  }

  addSpace(height = 10): void {
    this.currentY -= height;
    if (this.currentY < 50) {
      this.newPage();
    }
  }

  private newPage(): void {
    this.currentY = 800;
  }

  generate(): Uint8Array {
    const contentStream = this.content.join('\n');
    
    // Object 1: Catalog
    const catalog = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
    
    // Object 2: Pages
    const pages = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
    
    // Object 3: Page
    const page = `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.pageWidth} ${this.pageHeight}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n`;
    
    // Object 4: Content stream
    const streamContent = contentStream;
    const contentObj = `4 0 obj\n<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream\nendobj\n`;
    
    // Object 5: Font
    const font = '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n';
    
    // Build PDF
    let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
    const offset1 = pdf.length;
    pdf += catalog;
    const offset2 = pdf.length;
    pdf += pages;
    const offset3 = pdf.length;
    pdf += page;
    const offset4 = pdf.length;
    pdf += contentObj;
    const offset5 = pdf.length;
    pdf += font;
    
    const xrefOffset = pdf.length;
    pdf += 'xref\n0 6\n';
    pdf += '0000000000 65535 f \n';
    pdf += `${offset1.toString().padStart(10, '0')} 00000 n \n`;
    pdf += `${offset2.toString().padStart(10, '0')} 00000 n \n`;
    pdf += `${offset3.toString().padStart(10, '0')} 00000 n \n`;
    pdf += `${offset4.toString().padStart(10, '0')} 00000 n \n`;
    pdf += `${offset5.toString().padStart(10, '0')} 00000 n \n`;
    
    pdf += 'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n';
    pdf += xrefOffset + '\n%%EOF';
    
    return new TextEncoder().encode(pdf);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    const { startDate, endDate } = await req.json();
    console.log('Generating PDF for user:', user.id, 'from', startDate, 'to', endDate);

    // Fetch expenses
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select(`
        *,
        categories (
          name,
          color,
          icon
        )
      `)
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lt('date', endDate)
      .order('date', { ascending: false });

    if (expensesError) throw expensesError;

    // Calculate statistics
    const total = expenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;
    const count = expenses?.length || 0;
    const average = count > 0 ? total / count : 0;

    // Group by category
    const categoryTotals: Record<string, { total: number; count: number; name: string }> = {};
    expenses?.forEach(exp => {
      const catId = exp.category_id || 'uncategorized';
      const catName = exp.categories?.name || 'Sem categoria';
      
      if (!categoryTotals[catId]) {
        categoryTotals[catId] = { total: 0, count: 0, name: catName };
      }
      categoryTotals[catId].total += Number(exp.amount);
      categoryTotals[catId].count += 1;
    });

    const categoryData = Object.entries(categoryTotals)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.total - a.total);

    // Generate PDF
    const pdf = new SimplePDF();
    
    // Header
    pdf.addTitle('Relatorio de Gastos');
    const startFormatted = new Date(startDate).toLocaleDateString('pt-BR');
    const endFormatted = new Date(new Date(endDate).getTime() - 86400000).toLocaleDateString('pt-BR');
    pdf.addSubtitle(`Periodo: ${startFormatted} ate ${endFormatted}`);
    pdf.addLine();
    pdf.addSpace(10);
    
    // Summary
    pdf.addSubtitle('Resumo');
    pdf.addText(`Total de Gastos: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    pdf.addText(`Quantidade de Despesas: ${count}`);
    pdf.addText(`Media por Gasto: R$ ${average.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    pdf.addSpace(15);
    
    // Categories
    pdf.addSubtitle('Gastos por Categoria');
    pdf.addLine();
    categoryData.forEach(cat => {
      const pct = total > 0 ? ((cat.total / total) * 100).toFixed(1) : '0.0';
      pdf.addText(`${cat.name}: R$ ${cat.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${pct}%) - ${cat.count} itens`);
    });
    pdf.addSpace(15);
    
    // Expense details (first 30)
    pdf.addSubtitle('Detalhamento de Gastos');
    pdf.addLine();
    const maxItems = Math.min(expenses?.length || 0, 30);
    for (let i = 0; i < maxItems; i++) {
      const exp = expenses![i];
      const date = new Date(exp.date).toLocaleDateString('pt-BR');
      const merchant = exp.merchant || '-';
      const cat = exp.categories?.name || 'Sem categoria';
      const amount = Number(exp.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      pdf.addText(`${date} | ${cat} | ${merchant.substring(0, 25)} | R$ ${amount}`);
    }
    
    if ((expenses?.length || 0) > 30) {
      pdf.addText(`... e mais ${(expenses?.length || 0) - 30} gastos`);
    }
    
    pdf.addSpace(20);
    pdf.addLine();
    const now = new Date();
    pdf.addText(`Relatorio gerado em ${now.toLocaleDateString('pt-BR')} as ${now.toLocaleTimeString('pt-BR')}`);
    pdf.addText('Entenda Seus Gastos - Educacao Financeira Pessoal');

    // Generate PDF bytes
    const pdfBytes = pdf.generate();
    
    // Encode to base64
    const base64 = btoa(String.fromCharCode(...pdfBytes));

    return new Response(
      JSON.stringify({ 
        success: true, 
        pdf: base64,
        summary: {
          total,
          count,
          average,
          categoryData
        }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error generating PDF:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 500 
      }
    );
  }
});

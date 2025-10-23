import * as XLSX from 'xlsx';
import { format } from 'date-fns';

interface ExpenseExport {
  date: string;
  merchant: string;
  category: string;
  amount: number;
  payment_method: string;
  notes?: string;
}

export function exportToXLSX(expenses: ExpenseExport[], filename: string = 'despesas') {
  // Format data for Excel
  const formattedData = expenses.map(expense => ({
    'Data': format(new Date(expense.date), 'dd/MM/yyyy'),
    'Estabelecimento': expense.merchant || '-',
    'Categoria': expense.category,
    'Valor': new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(expense.amount),
    'Pagamento': expense.payment_method || '-',
    'Observações': expense.notes || '-'
  }));

  // Calculate totals
  const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  
  // Add summary row
  formattedData.push({
    'Data': '',
    'Estabelecimento': '',
    'Categoria': '',
    'Valor': '',
    'Pagamento': '',
    'Observações': ''
  });
  
  formattedData.push({
    'Data': '',
    'Estabelecimento': '',
    'Categoria': 'TOTAL',
    'Valor': new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(total),
    'Pagamento': '',
    'Observações': ''
  });

  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(formattedData, {
    skipHeader: false
  });

  // Set column widths
  ws['!cols'] = [
    { wch: 12 }, // Data
    { wch: 30 }, // Estabelecimento
    { wch: 20 }, // Categoria
    { wch: 15 }, // Valor
    { wch: 15 }, // Pagamento
    { wch: 40 }  // Observações
  ];

  // Style header row
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!ws[cellAddress]) continue;
    ws[cellAddress].s = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "3B82F6" } },
      alignment: { horizontal: "center", vertical: "center" }
    };
  }

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Despesas');

  // Add metadata
  wb.Props = {
    Title: `Relatório de Despesas - ${filename}`,
    Subject: 'Controle Financeiro',
    Author: 'Entenda seus Gastos',
    CreatedDate: new Date()
  };

  // Generate file
  const timestamp = format(new Date(), 'yyyy-MM-dd_HHmm');
  const fileName = `${filename}_${timestamp}.xlsx`;
  
  XLSX.writeFile(wb, fileName);
}

export function exportToCSV(expenses: ExpenseExport[], filename: string = 'despesas') {
  const headers = ['Data', 'Estabelecimento', 'Categoria', 'Valor', 'Pagamento', 'Observações'];
  
  const rows = expenses.map(expense => [
    format(new Date(expense.date), 'dd/MM/yyyy'),
    expense.merchant || '-',
    expense.category,
    new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(expense.amount),
    expense.payment_method || '-',
    expense.notes || '-'
  ]);

  // Add total row
  const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  rows.push(['', '', 'TOTAL', 
    new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(total), 
    '', '']);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  const timestamp = format(new Date(), 'yyyy-MM-dd_HHmm');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${timestamp}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

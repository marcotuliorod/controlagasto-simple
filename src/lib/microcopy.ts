/**
 * Humanized microcopy for UX 2026
 * Centralized, empathetic, and clear messaging
 */

export const microcopy = {
  errors: {
    generic: 'Ops! Algo não saiu como esperado. Tente novamente em instantes.',
    network: 'Parece que você está offline. Verifique sua conexão e tente novamente.',
    loadExpenses: 'Não conseguimos carregar suas despesas. Tente novamente.',
    loadCategories: 'Erro ao carregar categorias. Tente novamente.',
    saveExpense: 'Não conseguimos salvar sua despesa. Revise os dados e tente novamente.',
    deleteExpense: 'Não foi possível excluir esta despesa. Tente novamente.',
    authentication: 'Erro ao fazer login. Verifique suas credenciais.',
    timeout: 'A operação está demorando mais que o esperado. Tente novamente.',
  },
  
  success: {
    expenseAdded: '✨ Despesa adicionada com sucesso!',
    expenseUpdated: 'Despesa atualizada!',
    expenseDeleted: 'Despesa removida.',
    goalAchieved: '🎉 Parabéns! Você atingiu sua meta!',
    dataExported: 'Dados exportados com sucesso!',
    profileUpdated: 'Perfil atualizado!',
  },
  
  empty: {
    expenses: {
      title: 'Nenhuma despesa ainda',
      description: 'Importe seu extrato ou fatura para acompanhar seus gastos.',
      action: 'Importar extrato',
    },
    reports: {
      title: 'Sem dados para exibir',
      description: 'Importe um extrato para visualizar relatórios detalhados.',
      action: 'Ir para despesas',
    },
    notifications: {
      title: 'Tudo certo por aqui!',
      description: 'Você não tem notificações no momento.',
    },
  },
  
  loading: {
    expenses: 'Carregando suas despesas...',
    reports: 'Gerando relatórios...',
    insights: 'Analisando seus gastos...',
    saving: 'Salvando...',
  },
  
  actions: {
    retry: 'Tentar novamente',
    undo: 'Desfazer',
    confirm: 'Confirmar',
    cancel: 'Cancelar',
    save: 'Salvar',
    delete: 'Excluir',
  },
} as const;

export type MicrocopyKey = keyof typeof microcopy;

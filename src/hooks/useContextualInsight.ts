import { useMemo } from "react";

interface Expense {
  amount: number;
  category_id?: string;
  date: string;
  merchant?: string;
}

interface Insight {
  type: "warning" | "info" | "success";
  title: string;
  message: string;
  action?: string;
}

/**
 * Generate contextual insights based on spending patterns
 */
export function useContextualInsight(
  expenses: Expense[],
  monthlyGoal: number
): Insight[] {
  return useMemo(() => {
    const insights: Insight[] = [];
    
    if (expenses.length === 0) {
      insights.push({
        type: "info",
        title: "Comece a adicionar despesas",
        message: "Adicione suas primeiras despesas para receber insights personalizados.",
        action: "Adicionar despesa",
      });
      return insights;
    }

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const percentage = (total / monthlyGoal) * 100;

    // Goal proximity warning
    if (percentage >= 90 && percentage < 100) {
      insights.push({
        type: "warning",
        title: "Atenção aos gastos!",
        message: `Você já utilizou ${percentage.toFixed(0)}% da sua meta mensal.`,
      });
    }

    // Goal exceeded
    if (percentage >= 100) {
      insights.push({
        type: "warning",
        title: "Meta excedida",
        message: `Você ultrapassou sua meta em ${((percentage - 100)).toFixed(0)}%.`,
        action: "Ajustar meta",
      });
    }

    // Spending streak (3+ days in a row)
    const sortedExpenses = [...expenses].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    let streak = 0;
    let lastDate: Date | null = null;
    
    for (const expense of sortedExpenses) {
      const currentDate = new Date(expense.date);
      
      if (lastDate === null) {
        streak = 1;
      } else {
        const daysDiff = Math.floor(
          (lastDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysDiff === 1) {
          streak++;
        } else {
          break;
        }
      }
      
      lastDate = currentDate;
    }

    if (streak >= 3) {
      insights.push({
        type: "info",
        title: "Padrão detectado",
        message: `Você tem registrado despesas por ${streak} dias seguidos.`,
      });
    }

    // Good performance
    if (percentage < 50 && expenses.length > 5) {
      const daysInMonth = new Date().getDate();
      if (daysInMonth > 15) {
        insights.push({
          type: "success",
          title: "Parabéns! 🎉",
          message: "Você está mantendo seus gastos sob controle.",
        });
      }
    }

    return insights;
  }, [expenses, monthlyGoal]);
}

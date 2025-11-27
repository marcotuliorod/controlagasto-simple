/**
 * Contextual greeting based on time of day
 */
export function getContextualGreeting(name: string): string {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return `Bom dia, ${name}! ☀️`;
  } else if (hour >= 12 && hour < 18) {
    return `Boa tarde, ${name}! 👋`;
  } else {
    return `Boa noite, ${name}! 🌙`;
  }
}

export function getContextualMessage(
  percentage: number,
  daysLeft: number
): string {
  if (percentage >= 100) {
    return "Você atingiu sua meta mensal! 🎉";
  }

  if (percentage >= 90) {
    return `Faltam apenas ${daysLeft} dias. Fique atento aos gastos! ⚠️`;
  }

  if (percentage >= 75) {
    return `Você já usou ${percentage.toFixed(0)}% da sua meta.`;
  }

  if (percentage >= 50) {
    return `No meio do caminho. Continue acompanhando! 📊`;
  }

  return `Ótimo começo! Você está no controle. 💪`;
}

import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

interface SuggestedQuestionsProps {
  onQuestionClick: (question: string) => void;
}

const questions = [
  "Como estão meus gastos este mês?",
  "Dicas para economizar na categoria que mais gasto",
  "Como melhorar meu score de saúde financeira?",
  "O que é juros compostos?",
  "Como criar um fundo de emergência?",
];

export default function SuggestedQuestions({ onQuestionClick }: SuggestedQuestionsProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Sparkles className="h-4 w-4" />
        <span className="text-sm font-medium">Perguntas sugeridas</span>
      </div>
      <div className="grid gap-2">
        {questions.map((question, index) => (
          <Button
            key={index}
            variant="outline"
            className="justify-start text-left h-auto py-3 px-4"
            onClick={() => onQuestionClick(question)}
          >
            <span className="text-sm">{question}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
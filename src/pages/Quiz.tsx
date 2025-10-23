import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuizQuestions, useUserQuizResponses, useSubmitQuizAnswer } from "@/hooks/useQuiz";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Trophy, Brain } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

const Quiz = () => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [showExplanation, setShowExplanation] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);
  
  const { data: questions, isLoading } = useQuizQuestions();
  const { data: responses } = useUserQuizResponses();
  const submitAnswer = useSubmitQuizAnswer();
  const { toast } = useToast();

  const currentQuestion = questions?.[currentQuestionIndex];
  const totalQuestions = questions?.length || 0;
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  const totalPoints = responses?.reduce((sum, r) => sum + r.points_earned, 0) || 0;
  const correctAnswers = responses?.filter(r => r.is_correct).length || 0;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "facil":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "medio":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "dificil":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      orcamento: "Orçamento",
      planejamento: "Planejamento",
      investimentos: "Investimentos",
      economia: "Economia",
      credito: "Crédito",
    };
    return labels[category] || category;
  };

  const handleSubmitAnswer = async () => {
    if (!selectedAnswer || !currentQuestion) return;

    const isCorrect = selectedAnswer === currentQuestion.correct_answer;
    const pointsEarned = isCorrect ? currentQuestion.points : 0;

    try {
      await submitAnswer.mutateAsync({
        questionId: currentQuestion.id,
        userAnswer: selectedAnswer,
        isCorrect,
        pointsEarned,
      });

      setIsAnswered(true);
      setShowExplanation(true);

      toast({
        title: isCorrect ? "Resposta Correta! 🎉" : "Resposta Incorreta",
        description: isCorrect
          ? `Você ganhou ${pointsEarned} pontos!`
          : "Continue aprendendo!",
        variant: isCorrect ? "default" : "destructive",
      });
    } catch (error) {
      console.error("Error submitting answer:", error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar sua resposta. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer("");
      setShowExplanation(false);
      setIsAnswered(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6">
          <Card>
            <CardHeader>
              <CardTitle>Nenhuma questão disponível</CardTitle>
              <CardDescription>
                Não há questões de quiz cadastradas no momento.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header with Score */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Brain className="h-8 w-8 text-primary" />
              Quiz Financeiro
            </h1>
            <p className="text-muted-foreground mt-1">
              Teste seus conhecimentos e aprenda mais sobre finanças
            </p>
          </div>
          
          <Card className="w-full md:w-auto">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Pontuação Total</p>
                  <p className="text-2xl font-bold">{totalPoints}</p>
                </div>
              </div>
              <div className="h-12 w-px bg-border" />
              <div>
                <p className="text-sm text-muted-foreground">Acertos</p>
                <p className="text-2xl font-bold">{correctAnswers}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Questão {currentQuestionIndex + 1} de {totalQuestions}</span>
            <span>{Math.round(progress)}% concluído</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge variant="outline" className={getDifficultyColor(currentQuestion.difficulty)}>
                {currentQuestion.difficulty.charAt(0).toUpperCase() + currentQuestion.difficulty.slice(1)}
              </Badge>
              <Badge variant="outline">
                {getCategoryLabel(currentQuestion.category)}
              </Badge>
              <Badge variant="outline">
                {currentQuestion.points} pontos
              </Badge>
            </div>
            <CardTitle className="text-xl">{currentQuestion.question}</CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <RadioGroup
              value={selectedAnswer}
              onValueChange={setSelectedAnswer}
              disabled={isAnswered}
              className="space-y-3"
            >
              {currentQuestion.options.map((option, index) => {
                const isCorrectAnswer = option === currentQuestion.correct_answer;
                const isSelectedAnswer = option === selectedAnswer;
                
                return (
                  <div
                    key={index}
                    className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-colors ${
                      isAnswered
                        ? isCorrectAnswer
                          ? "border-green-500 bg-green-500/10"
                          : isSelectedAnswer
                          ? "border-red-500 bg-red-500/10"
                          : "border-border"
                        : isSelectedAnswer
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <RadioGroupItem value={option} id={`option-${index}`} />
                    <Label
                      htmlFor={`option-${index}`}
                      className="flex-1 cursor-pointer font-normal"
                    >
                      {option}
                    </Label>
                    {isAnswered && isCorrectAnswer && (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    )}
                    {isAnswered && isSelectedAnswer && !isCorrectAnswer && (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                );
              })}
            </RadioGroup>

            {showExplanation && (
              <Alert>
                <Brain className="h-4 w-4" />
                <AlertDescription className="mt-2">
                  <strong>Explicação:</strong> {currentQuestion.explanation}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3">
              {!isAnswered ? (
                <Button
                  onClick={handleSubmitAnswer}
                  disabled={!selectedAnswer || submitAnswer.isPending}
                  className="flex-1"
                >
                  Confirmar Resposta
                </Button>
              ) : (
                <Button
                  onClick={handleNextQuestion}
                  disabled={currentQuestionIndex === totalQuestions - 1}
                  className="flex-1"
                >
                  {currentQuestionIndex === totalQuestions - 1
                    ? "Quiz Finalizado"
                    : "Próxima Questão"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Quiz;

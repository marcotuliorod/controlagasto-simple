import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  category: string;
  difficulty: string;
  points: number;
  created_at: string;
}

export interface QuizResponse {
  id: string;
  user_id: string;
  question_id: string;
  user_answer: string;
  is_correct: boolean;
  points_earned: number;
  completed_at: string;
}

export const useQuizQuestions = (
  categoryFilter?: string,
  difficultyFilter?: string
) => {
  return useQuery({
    queryKey: ["quiz-questions", categoryFilter, difficultyFilter],
    queryFn: async () => {
      let query = supabase
        .from("quiz_questions")
        .select("*")
        .order("created_at", { ascending: false });

      if (categoryFilter && categoryFilter !== "todas") {
        query = query.eq("category", categoryFilter);
      }

      if (difficultyFilter && difficultyFilter !== "todas") {
        query = query.eq("difficulty", difficultyFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as QuizQuestion[];
    },
  });
};

export const useUserQuizResponses = () => {
  return useQuery({
    queryKey: ["quiz-responses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quiz_responses")
        .select("*");

      if (error) throw error;
      return data as QuizResponse[];
    },
  });
};

export const useSubmitQuizAnswer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      questionId,
      userAnswer,
      isCorrect,
      pointsEarned,
    }: {
      questionId: string;
      userAnswer: string;
      isCorrect: boolean;
      pointsEarned: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase.from("quiz_responses").upsert(
        {
          user_id: user.id,
          question_id: questionId,
          user_answer: userAnswer,
          is_correct: isCorrect,
          points_earned: pointsEarned,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,question_id" }
      );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-responses"] });
    },
  });
};

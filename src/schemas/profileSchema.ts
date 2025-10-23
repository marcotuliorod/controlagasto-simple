import { z } from "zod";

/**
 * Schema for profile form validation
 */
export const profileFormSchema = z.object({
  name: z
    .string()
    .min(1, "Nome é obrigatório")
    .max(80, "Nome deve ter no máximo 80 caracteres")
    .trim(),
});

export type ProfileFormData = z.infer<typeof profileFormSchema>;

/**
 * Schema for email change validation
 */
export const emailChangeSchema = z.object({
  email: z
    .string()
    .email("E-mail inválido")
    .min(1, "E-mail é obrigatório"),
});

export type EmailChangeData = z.infer<typeof emailChangeSchema>;

/**
 * Schema for goals form validation
 * Accepts Brazilian currency format and normalizes to number
 */
export const goalsFormSchema = z.object({
  defaultGoal: z
    .string()
    .min(1, "Meta padrão é obrigatória")
    .refine((val) => {
      const normalized = val.replace(/\./g, '').replace(',', '.');
      const num = Number(normalized);
      return !isNaN(num) && num > 0;
    }, "Valor deve ser maior que zero"),
  
  currentMonthGoal: z
    .string()
    .min(1, "Meta do mês é obrigatória")
    .refine((val) => {
      const normalized = val.replace(/\./g, '').replace(',', '.');
      const num = Number(normalized);
      return !isNaN(num) && num > 0;
    }, "Valor deve ser maior que zero"),
  
  propagateEnabled: z.boolean().default(false),
  
  propagateMonths: z
    .number()
    .int("Deve ser um número inteiro")
    .min(1, "Mínimo 1 mês")
    .max(12, "Máximo 12 meses")
    .optional(),
}).refine(
  (data) => {
    // If propagate is enabled, propagateMonths must be provided
    if (data.propagateEnabled) {
      return data.propagateMonths !== undefined && data.propagateMonths >= 1;
    }
    return true;
  },
  {
    message: "Informe o número de meses para propagar",
    path: ["propagateMonths"],
  }
);

export type GoalsFormData = z.infer<typeof goalsFormSchema>;

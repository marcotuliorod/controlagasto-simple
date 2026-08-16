/**
 * Extracts a user-displayable message from a caught value of unknown shape.
 * Use in `catch (error: unknown)` blocks instead of `catch (error: any)`.
 */
export function getErrorMessage(error: unknown, fallback = "Ocorreu um erro inesperado"): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return fallback;
}

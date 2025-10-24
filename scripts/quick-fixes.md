# 🚀 Quick Fixes Checklist

Execute esses fixes rápidos hoje mesmo (1-2 horas no total).

## ✅ 1. Remover Console.logs Desnecessários (15 min)

**Manter apenas:**
- `console.error()` para erros
- Logs informativos em edge functions (para debugging)

**Remover:**
- `console.log()` de debugging
- Logs repetitivos (ex: "Dashboard: Buscando despesas...")

```bash
# Buscar todos os console.logs
grep -r "console.log" src/
```

## ✅ 2. Lazy Loading de Imagens (10 min)

Adicionar `loading="lazy"` em todas as tags `<img>`:

```tsx
// ❌ Antes
<img src="..." alt="..." />

// ✅ Depois
<img src="..." alt="..." loading="lazy" />
```

## ✅ 3. Audit NPM (15 min)

```bash
npm audit
npm audit fix

# Se tiver vulnerabilidades HIGH que não fixam:
npm audit fix --force
# Testar app depois
```

## ✅ 4. Loading States Faltantes (30 min)

Verificar que todos os botões mostram loading:

```tsx
// ✅ Exemplo correto
<Button disabled={isLoading}>
  {isLoading ? "Salvando..." : "Salvar"}
</Button>
```

**Páginas para verificar:**
- AddExpense.tsx
- EditExpense.tsx
- Settings.tsx
- AccountForm.tsx

## ✅ 5. Error Messages em PT-BR (20 min)

Buscar mensagens genéricas:

```typescript
// ❌ Evitar
toast.error("Error")
toast.error("Something went wrong")

// ✅ Preferir
toast.error("Erro ao salvar despesa")
toast.error("Não foi possível carregar os dados")
```

## ✅ 6. Focus States Visíveis (10 min)

Verificar que elementos focados são visíveis (importante para a11y):

```css
/* Já deve estar no index.css */
*:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
}
```

---

## 🎯 Depois de Completar

- [ ] Build production
- [ ] Verificar sem warnings
- [ ] Testar manualmente
- [ ] Commit: "chore: quick fixes - remove logs, add lazy loading, fix errors"

**Tempo total:** ~1-2 horas  
**Impacto:** 🟢 Alto (performance + UX)

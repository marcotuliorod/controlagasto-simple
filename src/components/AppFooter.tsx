import { Link } from "react-router-dom";

export default function AppFooter() {
  return (
    <footer className="bg-muted/30 border-t mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Entenda seus Gastos. Todos os direitos reservados.
          </p>
          <nav className="flex gap-6">
            <Link
              to="/privacy"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Política de Privacidade
            </Link>
            <Link
              to="/terms"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Termos de Uso
            </Link>
            <Link
              to="/account/delete"
              className="text-sm text-muted-foreground hover:text-destructive transition-colors"
            >
              Excluir Conta
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

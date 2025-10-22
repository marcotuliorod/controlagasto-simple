import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">Política de Privacidade</h1>
        </div>

        <Card className="p-6 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-3">1. Coleta de Dados</h2>
            <p className="text-muted-foreground">
              Coletamos apenas os dados necessários para o funcionamento do
              aplicativo, incluindo informações de autenticação (e-mail) e dados
              financeiros que você insere (despesas, categorias, metas).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">2. Uso dos Dados</h2>
            <p className="text-muted-foreground mb-2">
              Seus dados são utilizados exclusivamente para:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>Fornecer funcionalidades do aplicativo</li>
              <li>Gerar relatórios e análises pessoais</li>
              <li>Processar imagens de cupons fiscais via IA</li>
              <li>Enviar alertas sobre suas metas financeiras</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">3. Armazenamento</h2>
            <p className="text-muted-foreground">
              Todos os dados são armazenados de forma segura em servidores
              criptografados. Imagens de cupons fiscais são armazenadas de forma
              privada e acessíveis apenas por você.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">4. Compartilhamento</h2>
            <p className="text-muted-foreground">
              Não compartilhamos, vendemos ou alugamos seus dados pessoais para
              terceiros. As imagens processadas via IA são enviadas temporariamente
              para análise e não são armazenadas pelo provedor de IA.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">5. Seus Direitos (LGPD)</h2>
            <p className="text-muted-foreground mb-2">
              De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem
              direito a:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>Acessar seus dados pessoais</li>
              <li>Corrigir dados incompletos ou incorretos</li>
              <li>Exportar todos os seus dados em formato CSV/JSON</li>
              <li>Solicitar a exclusão completa de sua conta e dados</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">6. Exclusão de Dados</h2>
            <p className="text-muted-foreground">
              Você pode solicitar a exclusão completa de sua conta e todos os dados
              associados a qualquer momento através da página de configurações da
              conta. A exclusão é permanente e não pode ser desfeita.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">7. Segurança</h2>
            <p className="text-muted-foreground">
              Implementamos medidas de segurança técnicas e organizacionais para
              proteger seus dados contra acesso não autorizado, perda ou
              divulgação.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">8. Cookies</h2>
            <p className="text-muted-foreground">
              Utilizamos apenas cookies essenciais para manter sua sessão ativa e
              garantir o funcionamento do aplicativo.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">9. Contato</h2>
            <p className="text-muted-foreground">
              Para questões sobre privacidade ou exercer seus direitos, entre em
              contato através do e-mail: privacidade@entendaseugasto.com.br
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">
              10. Alterações nesta Política
            </h2>
            <p className="text-muted-foreground">
              Podemos atualizar esta política periodicamente. Notificaremos sobre
              mudanças significativas através do aplicativo.
            </p>
          </section>

          <p className="text-sm text-muted-foreground mt-6">
            Última atualização: {new Date().toLocaleDateString("pt-BR")}
          </p>
        </Card>
      </div>
    </div>
  );
}

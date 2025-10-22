import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Terms() {
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
          <h1 className="text-3xl font-bold">Termos de Uso</h1>
        </div>

        <Card className="p-6 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-3">1. Aceitação dos Termos</h2>
            <p className="text-muted-foreground">
              Ao utilizar o aplicativo "Entenda seus Gastos", você concorda com
              estes termos de uso. Se não concordar, não utilize o aplicativo.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">2. Descrição do Serviço</h2>
            <p className="text-muted-foreground">
              O "Entenda seus Gastos" é uma ferramenta de controle financeiro
              pessoal que permite registrar despesas, definir metas, gerar
              relatórios e processar cupons fiscais via tecnologia de IA.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">3. Cadastro e Conta</h2>
            <p className="text-muted-foreground mb-2">
              Para utilizar o aplicativo, você deve:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>Fornecer informações verdadeiras e atualizadas</li>
              <li>Manter a confidencialidade de sua senha</li>
              <li>Notificar imediatamente sobre uso não autorizado</li>
              <li>Ser responsável por todas as atividades em sua conta</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">4. Uso Aceitável</h2>
            <p className="text-muted-foreground mb-2">
              Você concorda em NÃO:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>Usar o serviço para fins ilegais</li>
              <li>Tentar acessar áreas restritas do sistema</li>
              <li>Interferir no funcionamento do aplicativo</li>
              <li>Compartilhar suas credenciais de acesso</li>
              <li>Usar o serviço para processar dados de terceiros sem consentimento</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">5. Propriedade Intelectual</h2>
            <p className="text-muted-foreground">
              Todo o conteúdo, design, código e funcionalidades do aplicativo são
              de propriedade exclusiva dos desenvolvedores e protegidos por leis de
              propriedade intelectual.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">6. Processamento via IA</h2>
            <p className="text-muted-foreground">
              Ao utilizar a funcionalidade de processamento de cupons fiscais via
              IA, você consente que as imagens sejam temporariamente processadas
              por serviços de inteligência artificial para extração de dados. As
              imagens não são armazenadas pelo provedor de IA.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">7. Disponibilidade</h2>
            <p className="text-muted-foreground">
              Embora nos esforcemos para manter o serviço disponível
              continuamente, não garantimos que estará livre de interrupções,
              erros ou completamente seguro contra ataques.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">8. Limitação de Responsabilidade</h2>
            <p className="text-muted-foreground">
              O aplicativo é fornecido "como está". Não nos responsabilizamos por:
              perdas financeiras decorrentes do uso do aplicativo, decisões
              tomadas com base nos relatórios gerados, ou imprecisões no
              processamento de cupons fiscais via IA.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">9. Modificações no Serviço</h2>
            <p className="text-muted-foreground">
              Reservamos o direito de modificar, suspender ou descontinuar
              qualquer parte do serviço a qualquer momento, com ou sem aviso
              prévio.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">10. Encerramento</h2>
            <p className="text-muted-foreground">
              Você pode encerrar sua conta a qualquer momento através da página de
              configurações. Podemos encerrar ou suspender o acesso por violação
              destes termos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">11. Legislação Aplicável</h2>
            <p className="text-muted-foreground">
              Estes termos são regidos pelas leis brasileiras. Quaisquer disputas
              serão resolvidas no foro da comarca de [Cidade], Brasil.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">12. Alterações nos Termos</h2>
            <p className="text-muted-foreground">
              Podemos atualizar estes termos periodicamente. O uso continuado após
              as alterações constitui aceitação dos novos termos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">13. Contato</h2>
            <p className="text-muted-foreground">
              Para questões sobre estes termos, entre em contato através do e-mail:
              contato@entendaseugasto.com.br
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

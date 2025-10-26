import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Wallet, TrendingUp, PieChart, Shield, ArrowRight } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen">
      <section className="gradient-primary text-white py-20 px-6" aria-label="Seção principal">
        <div className="max-w-4xl mx-auto text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-6" role="img" aria-label="Ícone de carteira">
            <Wallet className="w-10 h-10" aria-hidden="true" />
          </div>
          <h1 className="text-5xl font-bold mb-6">Entenda seus Gastos</h1>
          <p className="text-xl text-white/90 mb-8">
            Simples de usar. Inteligente para entender seus gastos.
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="bg-white text-primary hover:bg-white/90 text-lg px-8"
          >
            Começar Agora
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      <section className="py-20 px-6 bg-background" aria-labelledby="features-heading">
        <div className="max-w-6xl mx-auto">
          <h2 id="features-heading" className="text-3xl font-bold text-center mb-12">
            Por que usar o Entenda seus Gastos?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <article className="text-center p-6">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4" role="img" aria-label="Ícone de tendência">
                <TrendingUp className="w-8 h-8 text-primary" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Controle Simples</h3>
              <p className="text-muted-foreground">
                Registre seus gastos em segundos. Manual ou por foto do cupom.
              </p>
            </article>

            <article className="text-center p-6">
              <div className="w-16 h-16 mx-auto rounded-full bg-secondary/10 flex items-center justify-center mb-4" role="img" aria-label="Ícone de gráfico">
                <PieChart className="w-8 h-8 text-secondary" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Visualize Padrões</h3>
              <p className="text-muted-foreground">
                Veja onde está gastando mais e tome decisões inteligentes.
              </p>
            </article>

            <article className="text-center p-6">
              <div className="w-16 h-16 mx-auto rounded-full bg-success/10 flex items-center justify-center mb-4" role="img" aria-label="Ícone de segurança">
                <Shield className="w-8 h-8 text-success" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Dados Seguros</h3>
              <p className="text-muted-foreground">
                Seus dados financeiros protegidos e privados, sempre.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 gradient-card" aria-labelledby="cta-heading">
        <div className="max-w-4xl mx-auto text-center">
          <h2 id="cta-heading" className="text-3xl font-bold mb-6">Pronto para começar?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Crie sua conta gratuitamente e comece a entender seus gastos hoje mesmo.
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="text-lg px-8"
          >
            Criar Conta Grátis
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Index;

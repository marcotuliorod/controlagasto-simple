import AppLayout from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator } from "lucide-react";
import { CompoundInterestCalculator } from "@/components/simulators/CompoundInterestCalculator";
import { FinancingCalculator } from "@/components/simulators/FinancingCalculator";
import { InvestmentProjection } from "@/components/simulators/InvestmentProjection";

const Simulator = () => {
  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-6">
        <header>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calculator className="h-8 w-8 text-primary" />
            Simulador Financeiro
          </h1>
          <p className="text-muted-foreground mt-1">
            Planeje seu futuro financeiro com nossas calculadoras
          </p>
        </header>

        <Tabs defaultValue="compound" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="compound">Juros Compostos</TabsTrigger>
            <TabsTrigger value="financing">Financiamento</TabsTrigger>
            <TabsTrigger value="investment">Investimentos</TabsTrigger>
          </TabsList>

          <TabsContent value="compound" className="mt-6">
            <CompoundInterestCalculator />
          </TabsContent>

          <TabsContent value="financing" className="mt-6">
            <FinancingCalculator />
          </TabsContent>

          <TabsContent value="investment" className="mt-6">
            <InvestmentProjection />
          </TabsContent>
        </Tabs>

        {/* Educational Tips */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="bg-blue-500/10 p-4 rounded-lg border border-blue-500/20">
            <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-2">
              💡 Dica: Juros Compostos
            </h4>
            <p className="text-sm text-muted-foreground">
              O poder dos juros compostos funciona a seu favor quando você investe regularmente.
              Quanto mais cedo começar, maior será o resultado final.
            </p>
          </div>

          <div className="bg-yellow-500/10 p-4 rounded-lg border border-yellow-500/20">
            <h4 className="font-semibold text-yellow-600 dark:text-yellow-400 mb-2">
              ⚠️ Atenção: Financiamentos
            </h4>
            <p className="text-sm text-muted-foreground">
              Sempre compare as taxas de juros antes de contratar um financiamento.
              Pequenas diferenças nas taxas podem resultar em milhares de reais ao longo do tempo.
            </p>
          </div>

          <div className="bg-green-500/10 p-4 rounded-lg border border-green-500/20">
            <h4 className="font-semibold text-green-600 dark:text-green-400 mb-2">
              📈 Meta: Investimentos
            </h4>
            <p className="text-sm text-muted-foreground">
              Estabeleça metas de longo prazo e seja consistente. 
              Investimentos regulares, mesmo que pequenos, podem crescer significativamente.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Simulator;

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getSignedReceiptUrl } from "@/lib/storage";
import { useAccounts } from "@/hooks/useAccounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/TagInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Save, Camera, Loader2, Eye } from "lucide-react";
import { useBillingCycle } from "@/hooks/useBillingCycle";
import { getErrorMessage } from "@/lib/errorUtils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export default function AddExpense() {
  const navigate = useNavigate();
  const { getDateCycle, getCycleRange } = useBillingCycle();
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const { accounts } = useAccounts();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [merchant, setMerchant] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [receiptPath, setReceiptPath] = useState("");
  const [signedReceiptUrl, setSignedReceiptUrl] = useState("");

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("categories")
        .select("*")
        .or(`user_id.eq.${user.id},is_default.eq.true`)
        .order("name");

      if (data) {
        setCategories(data);
      }
    } catch (error) {
      toast.error("Erro ao carregar categorias");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem");
      return;
    }

    setIsProcessingOCR(true);
    toast.info("Processando cupom...");

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Image = event.target?.result as string;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("Usuário não autenticado");
        }

        const { data, error } = await supabase.functions.invoke("process-receipt", {
          body: { imageBase64: base64Image },
        });

        if (error) {
          if (error.message?.includes('429')) {
            toast.error("Limite de requisições atingido. Tente novamente em alguns segundos.");
          } else if (error.message?.includes('402')) {
            toast.error("Créditos esgotados. Adicione créditos nas configurações.");
          } else {
            throw error;
          }
          return;
        }

        if (data?.success && data?.data) {
          const extracted = data.data;
          
          if (extracted.amount) setAmount(extracted.amount.toString());
          if (extracted.date) setDate(extracted.date);
          if (extracted.merchant) setMerchant(extracted.merchant);
          if (extracted.receipt_path) setReceiptPath(extracted.receipt_path);
          
          if (extracted.items && extracted.items.length > 0) {
            const itemsText = extracted.items
              .map((item: { item?: string; name?: string; value?: number; price?: number }) =>
                `${item.item || item.name}: R$ ${item.value || item.price}`)
              .join("\n");
            setNotes(`CNPJ: ${extracted.cnpj || "N/A"}\n\nItens:\n${itemsText}`);
          }

          toast.success("Cupom processado com sucesso!");
        } else {
          toast.error("Não foi possível extrair informações do cupom");
        }
      };

      reader.onerror = () => {
        toast.error("Erro ao ler imagem");
      };

      reader.readAsDataURL(file);
    } catch (error: unknown) {
      console.error("Erro no OCR:", error);
      toast.error(getErrorMessage(error, "Erro ao processar cupom"));
    } finally {
      setIsProcessingOCR(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleViewReceipt = async () => {
    if (!receiptPath) return;

    try {
      const url = await getSignedReceiptUrl(receiptPath, 120);
      if (url) {
        setSignedReceiptUrl(url);
        window.open(url, '_blank');
      } else {
        toast.error("Erro ao gerar link do recibo");
      }
    } catch (error) {
      toast.error("Erro ao visualizar recibo");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const expenseAmount = parseFloat(amount);
      if (isNaN(expenseAmount) || expenseAmount <= 0) {
        throw new Error("Valor deve ser maior que zero");
      }
      if (expenseAmount > 999999.99) {
        throw new Error("Valor máximo é R$ 999.999,99");
      }

      // Validate date (not in future, not more than 2 years old)
      const selectedDate = new Date(date);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      
      if (selectedDate > today) {
        throw new Error("Data não pode ser no futuro");
      }
      if (selectedDate < twoYearsAgo) {
        throw new Error("Data não pode ser há mais de 2 anos");
      }

      const { error } = await supabase.from("expenses").insert({
        user_id: user.id,
        amount: expenseAmount,
        date,
        category_id: categoryId || null,
        account_id: accountId || null,
        merchant: merchant || null,
        payment_method: paymentMethod || null,
        notes: notes || null,
        tags: tags.length > 0 ? tags : null,
        receipt_url: receiptPath || null,
        source: receiptPath ? "ocr" : "manual",
      });

      if (error) throw error;

      // Show cycle feedback
      const cycle = getDateCycle(date);
      const [year, month] = cycle.split('-').map(Number);
      const { start, end } = getCycleRange(year, month);
      const endDate = new Date(end);
      endDate.setDate(endDate.getDate() - 1);
      
      toast.success(
        `Despesa adicionada ao ciclo ${format(new Date(start), 'MMM/yyyy', { locale: ptBR })} ` +
        `(${format(new Date(start), 'dd/MM')} - ${format(endDate, 'dd/MM')})`
      );

      navigate("/dashboard");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Erro ao adicionar despesa"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b p-6">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="hover:bg-muted"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-medium">Adicionar Despesa</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6">
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="amount" className="flex items-center gap-2">
                Valor (R$) *
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                max="999999.99"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                aria-describedby="amount-help"
              />
              <p id="amount-help" className="text-xs text-muted-foreground">
                Valor máximo: R$ 999.999,99
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Data *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date(new Date().setFullYear(new Date().getFullYear() - 2)).toISOString().split("T")[0]}
                max={new Date().toISOString().split("T")[0]}
                required
                aria-describedby="date-help"
              />
              <p id="date-help" className="text-xs text-muted-foreground">
                Apenas datas passadas (até 2 anos atrás)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger aria-describedby="category-help">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        <span>{cat.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p id="category-help" className="text-xs text-muted-foreground">
                Ajuda a organizar seus gastos por tipo
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="account">Conta</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger aria-describedby="account-help">
                  <SelectValue placeholder="Selecione uma conta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts?.filter(a => a.is_active).map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      <span className="flex items-center gap-2">
                        <span>{acc.icon}</span>
                        <span>{acc.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p id="account-help" className="text-xs text-muted-foreground">
                Selecione de qual conta saiu o dinheiro
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="merchant">Estabelecimento</Label>
              <Input
                id="merchant"
                type="text"
                maxLength={100}
                placeholder="Ex: Supermercado Pão de Açúcar"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                aria-describedby="merchant-help"
              />
              <p id="merchant-help" className="text-xs text-muted-foreground">
                {merchant.length}/100 caracteres
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment">Forma de Pagamento</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="Débito">Débito</SelectItem>
                  <SelectItem value="Crédito">Crédito</SelectItem>
                  <SelectItem value="PIX">PIX</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                maxLength={1000}
                placeholder="Adicione observações sobre esta despesa..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                aria-describedby="notes-help"
              />
              <p id="notes-help" className="text-xs text-muted-foreground">
                {notes.length}/1000 caracteres
              </p>
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <TagInput
                tags={tags}
                onChange={setTags}
                placeholder="Ex: viagem, trabalho, pessoal..."
              />
              <p className="text-xs text-muted-foreground">
                Organize suas despesas com tags personalizadas
              </p>
            </div>

            {receiptPath && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleViewReceipt}
                className="w-full"
              >
                <Eye className="w-4 h-4 mr-2" />
                Ver Recibo (link temporário)
              </Button>
            )}

            <div className="flex gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isProcessingOCR}
              />
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingOCR}
                title="Tire foto do recibo para extrair dados automaticamente"
                aria-label="Capturar foto do cupom fiscal para preenchimento automático"
              >
                {isProcessingOCR ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 mr-2" />
                    Foto do Cupom
                  </>
                )}
              </Button>
              <Button type="submit" className="flex-1" disabled={isLoading || isProcessingOCR}>
                <Save className="w-4 h-4 mr-2" />
                {isLoading ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
}

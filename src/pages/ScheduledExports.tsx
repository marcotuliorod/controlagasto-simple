import { useState } from "react";
import { useScheduledExports, ScheduledExport } from "@/hooks/useScheduledExports";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Calendar, FileText, Trash2, Edit, Pause, Play } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

export default function ScheduledExports() {
  const { exports, isLoading, createExport, updateExport, deleteExport } = useScheduledExports();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [exportFormat, setExportFormat] = useState<"csv" | "xlsx" | "pdf">("pdf");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const nextRun = new Date();
    if (frequency === "daily") nextRun.setDate(nextRun.getDate() + 1);
    if (frequency === "weekly") nextRun.setDate(nextRun.getDate() + 7);
    if (frequency === "monthly") nextRun.setMonth(nextRun.getMonth() + 1);

    if (editingId) {
      await updateExport.mutateAsync({
        id: editingId,
        name,
        frequency,
        format: exportFormat,
      });
    } else {
      await createExport.mutateAsync({
        name,
        frequency,
        format: exportFormat,
        filters: {},
        next_run_at: nextRun.toISOString(),
        is_active: true,
      });
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setName("");
    setFrequency("monthly");
    setExportFormat("pdf");
    setEditingId(null);
  };

  const handleEdit = (exp: ScheduledExport) => {
    setEditingId(exp.id);
    setName(exp.name);
    setFrequency(exp.frequency);
    setExportFormat(exp.format);
    setIsDialogOpen(true);
  };

  const toggleActive = (id: string, isActive: boolean) => {
    updateExport.mutate({ id, is_active: !isActive });
  };

  const frequencyLabels = {
    daily: "Diário",
    weekly: "Semanal",
    monthly: "Mensal",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Exportações Agendadas</h1>
            <p className="text-muted-foreground">Automatize seus relatórios periódicos</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Exportação
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar" : "Nova"} Exportação Agendada</DialogTitle>
                <DialogDescription>
                  Configure uma exportação automática dos seus dados
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Relatório Mensal"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequência</Label>
                  <Select value={frequency} onValueChange={(v) => setFrequency(v as ScheduledExport["frequency"])}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diário</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="format">Formato</Label>
                  <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as ScheduledExport["format"])}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" className="w-full">
                  {editingId ? "Salvar Alterações" : "Criar Exportação"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Carregando exportações...</p>
          </Card>
        ) : exports && exports.length > 0 ? (
          <div className="grid gap-4">
            {exports.map((exp) => (
              <Card key={exp.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{exp.name}</h3>
                      <Badge variant={exp.is_active ? "default" : "outline"}>
                        {exp.is_active ? "Ativo" : "Pausado"}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{frequencyLabels[exp.frequency]}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        <span>{exp.format.toUpperCase()}</span>
                      </div>
                    </div>

                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="text-muted-foreground">Próxima execução:</span>{" "}
                        <span className="font-medium">
                          {format(new Date(exp.next_run_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </p>
                      {exp.last_run_at && (
                        <p>
                          <span className="text-muted-foreground">Última execução:</span>{" "}
                          <span className="font-medium">
                            {format(new Date(exp.last_run_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleActive(exp.id, exp.is_active)}
                    >
                      {exp.is_active ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(exp)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Confirma exclusão desta exportação?")) {
                          deleteExport.mutate(exp.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">Nenhuma exportação agendada</h3>
            <p className="text-muted-foreground mb-4">
              Configure exportações automáticas para receber seus relatórios periodicamente
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeira Exportação
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}

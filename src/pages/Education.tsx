import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Clock, CheckCircle2, Search, Video, FileText, Lightbulb } from "lucide-react";
import { useEducationalContent, useUserProgress, useMarkAsCompleted, EducationalContent } from "@/hooks/useEducationalContent";
import { toast } from "sonner";

export default function Education() {
  const [categoryFilter, setCategoryFilter] = useState<string>("todas");
  const [levelFilter, setLevelFilter] = useState<string>("todos");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedContent, setSelectedContent] = useState<EducationalContent | null>(null);

  const { data: content = [], isLoading } = useEducationalContent(categoryFilter, levelFilter, searchQuery);
  const { data: userProgress = [] } = useUserProgress();
  const markAsCompleted = useMarkAsCompleted();

  const categoryLabels: Record<string, string> = {
    todas: "Todas",
    orcamento: "Orçamento",
    investimento: "Investimento",
    dividas: "Dívidas",
    economia: "Economia",
    planejamento: "Planejamento",
  };

  const levelLabels: Record<string, string> = {
    todos: "Todos",
    iniciante: "Iniciante",
    intermediario: "Intermediário",
    avancado: "Avançado",
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-4 w-4" />;
      case "dica":
        return <Lightbulb className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const isCompleted = (contentId: string) => {
    return userProgress.some((p) => p.content_id === contentId && p.completed);
  };

  const handleMarkComplete = async (contentId: string, completed: boolean) => {
    try {
      await markAsCompleted.mutateAsync({ contentId, completed });
      toast.success(completed ? "Marcado como concluído!" : "Marcado como não concluído");
    } catch (error) {
      toast.error("Erro ao atualizar progresso");
    }
  };

  const completedCount = content.filter((c) => isCompleted(c.id)).length;
  const progressPercentage = content.length > 0 ? (completedCount / content.length) * 100 : 0;

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Educação Financeira</h1>
        <p className="text-muted-foreground">
          Aprenda a gerenciar melhor suas finanças com nosso conteúdo educativo
        </p>
      </div>

      {/* Progress Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Seu Progresso
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Conteúdos concluídos</span>
            <span className="font-semibold">
              {completedCount} de {content.length}
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar conteúdo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Nível" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(levelLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Content Grid */}
      {isLoading ? (
        <div className="text-center py-12">Carregando conteúdo...</div>
      ) : content.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum conteúdo encontrado com os filtros aplicados.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {content.map((item) => {
            const completed = isCompleted(item.id);
            return (
              <Card
                key={item.id}
                className="hover:shadow-lg transition-shadow cursor-pointer relative"
                onClick={() => setSelectedContent(item)}
              >
                {completed && (
                  <div className="absolute top-3 right-3 z-10">
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    {getTypeIcon(item.type)}
                    <Badge variant="outline" className="text-xs">
                      {categoryLabels[item.category as keyof typeof categoryLabels]}
                    </Badge>
                    <Badge variant="default" className="text-xs">
                      {levelLabels[item.level as keyof typeof levelLabels]}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <CardDescription className="line-clamp-2">{item.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{item.reading_time} min</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Content Dialog */}
      <Dialog open={!!selectedContent} onOpenChange={() => setSelectedContent(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {selectedContent && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  {getTypeIcon(selectedContent.type)}
                  <Badge variant="outline">
                    {categoryLabels[selectedContent.category as keyof typeof categoryLabels]}
                  </Badge>
                  <Badge variant="default">
                    {levelLabels[selectedContent.level as keyof typeof levelLabels]}
                  </Badge>
                </div>
                <DialogTitle className="text-2xl">{selectedContent.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-muted-foreground">{selectedContent.description}</p>
                
                {selectedContent.video_url && (
                  <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                    <Video className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}

                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap">{selectedContent.content}</p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{selectedContent.reading_time} minutos de leitura</span>
                  </div>
                  <Button
                    onClick={() =>
                      handleMarkComplete(
                        selectedContent.id,
                        !isCompleted(selectedContent.id)
                      )
                    }
                    variant={isCompleted(selectedContent.id) ? "outline" : "default"}
                  >
                    {isCompleted(selectedContent.id) ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Concluído
                      </>
                    ) : (
                      "Marcar como concluído"
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

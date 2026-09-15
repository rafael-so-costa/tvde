import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Send, Clock, CheckCircle, MessageSquare, Image, Video } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Mock data for messages
const mockMessages = [
  {
    id: "1",
    titulo: "Lembrete: Renovação de documentos",
    conteudo: "Prezados motoristas, lembramos que os documentos devem estar sempre atualizados.",
    tipo_midia: "texto",
    tipo_destinatario: "motoristas",
    enviada: true,
    data_envio: "2024-01-20T10:30:00",
    agendamento: null,
  },
  {
    id: "2",
    titulo: "Promoção de Natal",
    conteudo: "Feliz Natal a todos! Aproveitem as festas com segurança.",
    tipo_midia: "imagem",
    tipo_destinatario: "todos",
    enviada: true,
    data_envio: "2023-12-24T09:00:00",
    agendamento: null,
  },
  {
    id: "3",
    titulo: "Reunião Mensal",
    conteudo: "Convocamos todos para a reunião mensal no dia 25/01.",
    tipo_midia: "texto",
    tipo_destinatario: "todos",
    enviada: false,
    data_envio: null,
    agendamento: "2024-01-25T14:00:00",
  },
];

export default function Messages() {
  const [activeTab, setActiveTab] = useState("enviar");
  const [messageTitle, setMessageTitle] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [mediaType, setMediaType] = useState("texto");
  const [recipientType, setRecipientType] = useState("todos");

  const sentMessages = mockMessages.filter((m) => m.enviada);
  const scheduledMessages = mockMessages.filter((m) => !m.enviada && m.agendamento);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <AppLayout title="Mensagens" subtitle="Envio de mensagens e notificações">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="enviar" className="gap-2">
            <Send className="w-4 h-4" />
            Enviar Agora
          </TabsTrigger>
          <TabsTrigger value="agendar" className="gap-2">
            <Clock className="w-4 h-4" />
            Agendar
          </TabsTrigger>
          <TabsTrigger value="enviadas" className="gap-2">
            <CheckCircle className="w-4 h-4" />
            Enviadas ({sentMessages.length})
          </TabsTrigger>
        </TabsList>

        {/* Send Now Tab */}
        <TabsContent value="enviar">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Message Form */}
            <Card>
              <CardHeader>
                <CardTitle>Nova Mensagem</CardTitle>
                <CardDescription>
                  Envie uma mensagem para motoristas ou proprietários
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="titulo">Título</Label>
                  <Input
                    id="titulo"
                    placeholder="Título da mensagem"
                    value={messageTitle}
                    onChange={(e) => setMessageTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="conteudo">Conteúdo</Label>
                  <Textarea
                    id="conteudo"
                    placeholder="Escreva sua mensagem aqui..."
                    rows={5}
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Mídia</Label>
                  <RadioGroup
                    value={mediaType}
                    onValueChange={setMediaType}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="texto" id="texto" />
                      <Label htmlFor="texto" className="cursor-pointer">
                        <MessageSquare className="w-4 h-4 inline mr-1" />
                        Texto
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="imagem" id="imagem" />
                      <Label htmlFor="imagem" className="cursor-pointer">
                        <Image className="w-4 h-4 inline mr-1" />
                        Imagem
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="video" id="video" />
                      <Label htmlFor="video" className="cursor-pointer">
                        <Video className="w-4 h-4 inline mr-1" />
                        Vídeo
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {mediaType !== "texto" && (
                  <div className="space-y-2">
                    <Label>Upload de Mídia</Label>
                    <div className="border-2 border-dashed rounded-lg p-6 text-center">
                      <p className="text-muted-foreground">
                        Arraste e solte ou clique para fazer upload
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Destinatários</Label>
                  <Select value={recipientType} onValueChange={setRecipientType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione os destinatários" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="motoristas">Apenas Motoristas</SelectItem>
                      <SelectItem value="proprietarios">Apenas Proprietários</SelectItem>
                      <SelectItem value="individual">Indivíduo Específico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button className="w-full btn-accent gap-2">
                  <Send className="w-4 h-4" />
                  Enviar Mensagem
                </Button>
              </CardContent>
            </Card>

            {/* Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Pré-visualização WhatsApp</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-[#e5ddd5] rounded-lg p-4 min-h-[300px]">
                  {(messageTitle || messageContent) && (
                    <div className="bg-[#dcf8c6] rounded-lg p-3 max-w-[80%] ml-auto shadow">
                      {messageTitle && (
                        <p className="font-semibold text-sm">{messageTitle}</p>
                      )}
                      {messageContent && (
                        <p className="text-sm mt-1 whitespace-pre-wrap">
                          {messageContent}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 text-right mt-1">
                        {new Date().toLocaleTimeString("pt-PT", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  )}
                  {!messageTitle && !messageContent && (
                    <p className="text-center text-gray-500 py-12">
                      Comece a escrever para ver a pré-visualização
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="agendar">
          <Card>
            <CardHeader>
              <CardTitle>Mensagens Agendadas</CardTitle>
              <CardDescription>
                Mensagens programadas para envio futuro
              </CardDescription>
            </CardHeader>
            <CardContent>
              {scheduledMessages.length > 0 ? (
                <div className="space-y-4">
                  {scheduledMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <h4 className="font-medium">{msg.titulo}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {msg.conteudo}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary">
                          <Clock className="w-3 h-3 mr-1" />
                          {msg.agendamento && formatDate(msg.agendamento)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma mensagem agendada
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sent Tab */}
        <TabsContent value="enviadas">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Mensagens</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sentMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <div>
                        <h4 className="font-medium">{msg.titulo}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {msg.conteudo}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{msg.tipo_destinatario}</Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {msg.data_envio && formatDate(msg.data_envio)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Building2, 
  Users, 
  Car, 
  FileText, 
  Shield, 
  Printer,
  ArrowLeft,
  CheckCircle2,
  Database,
  Layers,
  Zap
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SystemSummary() {
  const navigate = useNavigate();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Hidden on print */}
      <div className="print:hidden sticky top-0 z-10 bg-background border-b p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-8 print:p-0">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">TVDE Pro</h1>
          <p className="text-xl text-muted-foreground">
            Sistema de Gestão de Frotas e Contratos TVDE
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Documento gerado em {new Date().toLocaleDateString('pt-PT')}
          </p>
        </div>

        <Separator className="my-6" />

        {/* Overview */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Layers className="w-6 h-6 text-primary" />
            Visão Geral
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            O TVDE Pro é uma plataforma SaaS multi-tenant desenvolvida para gestão completa 
            de frotas de veículos TVDE (Uber, Bolt) em Portugal. O sistema oferece automação 
            de contratos, gestão de documentos, controlo de multas e sinistros, com isolamento 
            total de dados entre empresas.
          </p>
        </section>

        {/* Architecture */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Database className="w-6 h-6 text-primary" />
            Arquitetura
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Multi-Tenancy</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Isolamento completo de dados via Row Level Security (RLS) no PostgreSQL. 
                Cada empresa opera num ambiente isolado.
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Hierarquia de Utilizadores</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Super Admin:</strong> Gestão global</li>
                  <li><strong>Admin Empresa:</strong> Gestão do tenant</li>
                  <li><strong>Motorista:</strong> Acesso restrito</li>
                  <li><strong>Proprietário:</strong> Acesso restrito</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Core Modules */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" />
            Módulos Principais
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Empresas
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                NIF, licenças TVDE, certificados, dados fiscais e documentação legal.
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Proprietários
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Suporte para Particular (Pessoa Física) e Empresa (Pessoa Jurídica) com campos específicos.
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Motoristas
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Certificado TVDE, carta de condução, documentos de identificação e contactos.
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  Veículos
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Matrícula, dados técnicos, inspeções, seguros, manutenções e valor de aluguer.
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Contratos
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Templates personalizáveis, preenchimento automático, assinatura digital com OTP.
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Multas & Sinistros
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Registo, acompanhamento de status, documentação e associação a motoristas/veículos.
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Contract Automation */}
        <section className="mb-8 print:break-before-page">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" />
            Automação de Contratos
          </h2>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Wizard de 3 Passos</h3>
                  <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                    <li><strong>Seleção de Template:</strong> Escolha do modelo de contrato</li>
                    <li><strong>Identificação:</strong> Seleção de perfis e preenchimento de campos manuais</li>
                    <li><strong>Revisão:</strong> Pré-visualização com campos destacados</li>
                  </ol>
                </div>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2">Mapeamento Inteligente</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span>+50 campos automáticos extraídos dos perfis</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span>Aliases inteligentes para variações de nomenclatura</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span>Normalização automática de tipos de proprietário</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span>Correção de erros comuns em templates (OCR)</span>
                    </li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2">Assinatura Digital</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span>Verificação por OTP (código enviado por email)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span>Registo de IP, data/hora e user agent</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span>Bloqueio do documento após assinatura</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Tech Stack */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Stack Tecnológico</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Frontend</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="list-disc list-inside space-y-1">
                  <li>React 18 + TypeScript</li>
                  <li>Vite (build tool)</li>
                  <li>Tailwind CSS + shadcn/ui</li>
                  <li>TanStack Query (cache)</li>
                  <li>React Router DOM</li>
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Backend (Lovable Cloud)</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="list-disc list-inside space-y-1">
                  <li>PostgreSQL com RLS</li>
                  <li>Edge Functions (Deno)</li>
                  <li>Storage (ficheiros/documentos)</li>
                  <li>Autenticação integrada</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Footer */}
        <Separator className="my-6" />
        <div className="text-center text-sm text-muted-foreground">
          <p>TVDE Pro - Sistema de Gestão de Frotas TVDE</p>
          <p className="mt-1">Desenvolvido com Lovable</p>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:break-before-page {
            break-before: page;
          }
          .print\\:p-0 {
            padding: 2rem !important;
          }
        }
      `}</style>
    </div>
  );
}

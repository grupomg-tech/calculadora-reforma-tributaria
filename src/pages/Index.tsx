import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Download, ExternalLink, FlaskConical } from "lucide-react";
import FilterPanel from "@/components/dashboard/FilterPanel";
import { ImpactCards, SummaryCards, ImpactBadge } from "@/components/dashboard/ImpactOverview";
import TopProducts from "@/components/dashboard/TopProducts";
import TaxCharts from "@/components/dashboard/TaxCharts";
import type { DadosRelatorio } from "@/lib/api-types";
import { API_URL, REPO_URL, isDemoMode } from "@/lib/config";
import { buildDemoReport } from "@/lib/demo";
import { csvFileName, downloadCsv, toCsv } from "@/lib/export";
import {
  computeImpactDelta, deriveBurdenBar, deriveComparativo, derivePieData, parseApiResponse,
} from "@/lib/report";
import { interpolate, useI18n } from "@/i18n";

const Index = () => {
  const t = useI18n();
  const urlParams = new URLSearchParams(window.location.search);
  const [empresa, setEmpresa] = useState(urlParams.get("empresa") || "");
  const [periodoInicial, setPeriodoInicial] = useState(urlParams.get("periodo_inicial") || "");
  const [periodoFinal, setPeriodoFinal] = useState(urlParams.get("periodo_final") || "");
  const [aliquotaIbs, setAliquotaIbs] = useState(urlParams.get("aliquota_ibs") || "18.5");
  const [aliquotaCbs, setAliquotaCbs] = useState(urlParams.get("aliquota_cbs") || "8.5");
  const [aliquotaIs, setAliquotaIs] = useState(urlParams.get("aliquota_is") || "0");
  const [demo, setDemo] = useState(() => isDemoMode());
  const [data, setData] = useState<DadosRelatorio | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (demo) {
        setData(buildDemoReport({
          ibs: parseFloat(aliquotaIbs) || 0,
          cbs: parseFloat(aliquotaCbs) || 0,
          is: parseFloat(aliquotaIs) || 0,
        }));
        return;
      }
      const params = new URLSearchParams({
        empresa,
        periodo_inicial: periodoInicial,
        periodo_final: periodoFinal,
        aliquota_ibs: aliquotaIbs,
        aliquota_cbs: aliquotaCbs,
        aliquota_is: aliquotaIs,
      });
      const res = await fetch(`${API_URL}?${params}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) throw new Error(interpolate(t.errors.http, { status: res.status }));
      setData(parseApiResponse(await res.text()));
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      setError(
        message === "Failed to fetch"
          ? t.errors.network
          : message || t.errors.generic
      );
    } finally {
      setLoading(false);
    }
  }, [demo, empresa, periodoInicial, periodoFinal, aliquotaIbs, aliquotaCbs, aliquotaIs, t]);

  // Fetch once on mount and whenever demo mode is toggled.
  useEffect(() => { fetchData(); }, [demo]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchData, 30000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, fetchData]);

  const graficos = data?.graficos || {};
  const resumoAtual = data?.resumo?.apuracao_atual;
  const resumoReforma = data?.resumo?.apuracao_reforma;
  const produtosEntrada = data?.entradas?.produtos || [];
  const produtosSaida = data?.saidas?.produtos || [];

  const impactoDelta = computeImpactDelta(resumoAtual, resumoReforma);
  // Category names on BurdenBar are data keys (unchanged across locales).
  const barDataCompras = deriveBurdenBar("Compras", graficos.carga_tributaria_compras, data?.entradas);
  const barDataVendas = deriveBurdenBar("Vendas", graficos.carga_tributaria_vendas, data?.saidas);
  const pieDataEntradas = derivePieData(graficos.tributos_entradas, produtosEntrada);
  const pieDataSaidas = derivePieData(graficos.tributos_saidas, produtosSaida);
  const comparativoEntradas = deriveComparativo(graficos.comparativo_entradas);
  const comparativoSaidas = deriveComparativo(graficos.comparativo_saidas);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-white/70 backdrop-blur-md border-b shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#4e6ae9] to-[#764ba2] bg-clip-text text-transparent">
              {t.header.title}
            </h1>
            <p className="text-sm text-muted-foreground">{t.header.subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {data && impactoDelta && (
              <div className="hidden md:flex items-center gap-3">
                <ImpactBadge label={t.header.burdenImpact} value={impactoDelta.carga} suffix="pp" />
                <ImpactBadge label={t.header.resultImpact} value={impactoDelta.resultado} prefix="R$" />
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!data}
              onClick={() => { if (data) downloadCsv(toCsv(data), csvFileName({ empresa, periodoInicial, periodoFinal })); }}
              className="bg-white/80"
            >
              <Download className="h-4 w-4" /> {t.header.exportCsv}
            </Button>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-md border bg-white/80 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-white"
              title={t.header.githubTitle}
            >
              <ExternalLink className="h-4 w-4" /> {t.header.githubLink}
            </a>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Demo banner */}
        {demo && (
          <div role="status" className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            <FlaskConical className="h-4 w-4 shrink-0" />
            <span>
              <strong>{t.demo.lead}</strong> {t.demo.body}
              <span className="block text-xs text-amber-700">
                {t.demo.source}{" "}
                <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="underline">{t.demo.sourceLink}</a>.
              </span>
            </span>
          </div>
        )}

        {/* Filters */}
        <FilterPanel
          empresa={empresa} setEmpresa={setEmpresa}
          periodoInicial={periodoInicial} setPeriodoInicial={setPeriodoInicial}
          periodoFinal={periodoFinal} setPeriodoFinal={setPeriodoFinal}
          aliquotaIbs={aliquotaIbs} setAliquotaIbs={setAliquotaIbs}
          aliquotaCbs={aliquotaCbs} setAliquotaCbs={setAliquotaCbs}
          aliquotaIs={aliquotaIs} setAliquotaIs={setAliquotaIs}
          loading={loading} autoRefresh={autoRefresh} setAutoRefresh={setAutoRefresh}
          onSubmit={fetchData}
        />

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="shadow-lg border-none">
                <CardContent className="pt-6 space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-red-200 bg-red-50 shadow-lg border-none">
              <CardContent className="pt-6 text-center text-red-600 font-medium flex flex-col items-center justify-center gap-3">
                <span className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> {error}</span>
                {!demo && (
                  <Button variant="outline" size="sm" onClick={() => setDemo(true)}>
                    <FlaskConical className="h-4 w-4 mr-1" /> {t.errors.fallbackSample}
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Dashboard Content */}
        {data && !loading && (
          <div className="space-y-8">
            {/* Impact Overview */}
            {impactoDelta && <ImpactCards delta={impactoDelta} />}

            {/* Summary Cards */}
            {resumoAtual && resumoReforma && (
              <SummaryCards atual={resumoAtual} reforma={resumoReforma} />
            )}

            {/* Top Products - Interactive */}
            <TopProducts produtosEntrada={produtosEntrada} produtosSaida={produtosSaida} />

            {/* Tax Charts */}
            <TaxCharts
              barDataCompras={barDataCompras}
              barDataVendas={barDataVendas}
              pieDataEntradas={pieDataEntradas}
              pieDataSaidas={pieDataSaidas}
              comparativoEntradas={comparativoEntradas}
              comparativoSaidas={comparativoSaidas}
              entradas={data?.entradas}
              saidas={data?.saidas}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;

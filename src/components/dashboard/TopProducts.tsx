import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, Store, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Package, BarChart3, Activity } from "lucide-react";
import { COLORS, formatCurrency, formatCurrencyShort, formatPercent, formatNumber, tooltipCurrency } from "./utils";
import type { Produto } from "@/lib/api-types";
import { regimeForNcm, regimeKind, type NcmRegime, type RegimeKind } from "@/lib/regimes";

type Tipo = "compra" | "venda";
const productName = (p: Produto) => p.descricao || p.nome || p.produto || "Produto";

const REGIME_BADGE: Record<RegimeKind, { label: string; className: string }> = {
  zero: { label: "Alíquota zero", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  reduced60: { label: "Redução 60%", className: "border-sky-200 bg-sky-50 text-sky-700" },
  standard: { label: "Alíquota padrão", className: "border-slate-200 bg-slate-50 text-slate-600" },
  selective: { label: "Imposto seletivo", className: "border-orange-200 bg-orange-50 text-orange-700" },
};

const RegimeBadge = ({ ncm, showBase = false }: { ncm?: string; showBase?: boolean }) => {
  if (!ncm) return null;
  const regime: NcmRegime = regimeForNcm(ncm);
  const ui = REGIME_BADGE[regimeKind(regime)];
  return (
    <div className="flex flex-col gap-1">
      <Badge variant="outline" className={`w-fit text-[10px] font-semibold ${ui.className}`}>
        {ui.label}
      </Badge>
      {showBase ? (
        <p className="text-[10px] text-muted-foreground leading-snug">
          NCM {ncm} · {regime.base}
        </p>
      ) : null}
    </div>
  );
};

interface TopProductsProps {
  produtosEntrada: Produto[];
  produtosSaida: Produto[];
}

const TopProducts = ({ produtosEntrada, produtosSaida }: TopProductsProps) => {
  const [selectedProduct, setSelectedProduct] = useState<Produto | null>(null);
  const [selectedType, setSelectedType] = useState<Tipo>("compra");

  if (!produtosEntrada.length && !produtosSaida.length) return null;

  // Sort by valor_total descending for top products
  const topCompras = [...produtosEntrada].sort((a, b) => (b.valor_total || 0) - (a.valor_total || 0)).slice(0, 10);
  const topVendas = [...produtosSaida].sort((a, b) => (b.valor_total || 0) - (a.valor_total || 0)).slice(0, 10);

  const openDetail = (produto: Produto, tipo: Tipo) => {
    setSelectedProduct(produto);
    setSelectedType(tipo);
  };

  return (
    <>
      <Tabs defaultValue="mais-vendidos" className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Activity className="h-5 w-5 text-[#764ba2]" />
              Produtos em Destaque
            </h2>
            <p className="text-sm text-muted-foreground">Clique em um produto para ver o impacto tributário detalhado</p>
          </div>
          <TabsList className="bg-white/80 shadow-sm">
            <TabsTrigger value="mais-vendidos" className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#4e6ae9] data-[state=active]:to-[#6b8cff] data-[state=active]:text-white">
              <Store className="h-4 w-4" /> Mais Vendidos ({topVendas.length})
            </TabsTrigger>
            <TabsTrigger value="mais-comprados" className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#764ba2] data-[state=active]:to-[#9b6fd0] data-[state=active]:text-white">
              <ShoppingCart className="h-4 w-4" /> Mais Comprados ({topCompras.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="mais-vendidos">
          <ProductRankingChart products={topVendas} tipo="venda" onProductClick={openDetail} />
          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mt-4">
            <AnimatePresence>
              {topVendas.map((p, i) => (
                <ProductCard key={i} product={p} rank={i + 1} onClick={() => openDetail(p, "venda")} />
              ))}
            </AnimatePresence>
          </motion.div>
        </TabsContent>

        <TabsContent value="mais-comprados">
          <ProductRankingChart products={topCompras} tipo="compra" onProductClick={openDetail} />
          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mt-4">
            <AnimatePresence>
              {topCompras.map((p, i) => (
                <ProductCard key={i} product={p} rank={i + 1} onClick={() => openDetail(p, "compra")} />
              ))}
            </AnimatePresence>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Product Detail Dialog */}
      <ProductDetailDialog
        product={selectedProduct}
        tipo={selectedType}
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </>
  );
};

const ProductRankingChart = ({ products, tipo, onProductClick }: { products: Produto[]; tipo: Tipo; onProductClick: (p: Produto, t: Tipo) => void }) => {
  const chartData = products.map((p) => ({
    name: productName(p).substring(0, 18),
    fullName: productName(p),
    "Valor Atual": p.valor_total ?? 0,
    "Valor Reforma": p.total_reforma ?? 0,
  }));

  const gradientId = tipo === "venda" ? "gradVenda" : "gradCompra";

  return (
    <Card className="shadow-lg border-none bg-white/80 backdrop-blur-sm overflow-hidden">
      <div className="h-1" style={{ background: tipo === "venda" ? `linear-gradient(90deg, ${COLORS.blue}, ${COLORS.cyan})` : `linear-gradient(90deg, ${COLORS.purple}, ${COLORS.pink})` }} />
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Ranking por Valor — {tipo === "venda" ? "Vendas" : "Compras"}
          <Badge variant="outline" className="ml-auto text-xs">Atual vs Reforma</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(280, products.length * 40)}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
            <defs>
              <linearGradient id={`${gradientId}Atual`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={COLORS.blue} stopOpacity={0.9} />
                <stop offset="100%" stopColor={COLORS.cyan} stopOpacity={0.7} />
              </linearGradient>
              <linearGradient id={`${gradientId}Reforma`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={COLORS.purple} stopOpacity={0.9} />
                <stop offset="100%" stopColor={COLORS.pink} stopOpacity={0.7} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" tickFormatter={formatCurrencyShort} tick={{ fontSize: 11 }} />
            <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11, fontWeight: 500 }} />
            <Tooltip
              formatter={tooltipCurrency}
              labelFormatter={(label, payload) => (payload?.[0]?.payload as { fullName?: string } | undefined)?.fullName ?? String(label)}
              contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 40px rgba(0,0,0,0.12)" }}
            />
            <Bar dataKey="Valor Atual" fill={`url(#${gradientId}Atual)`} radius={[0, 6, 6, 0]} barSize={16}
              cursor="pointer" onClick={(_, index) => onProductClick(products[index], tipo)} />
            <Bar dataKey="Valor Reforma" fill={`url(#${gradientId}Reforma)`} radius={[0, 6, 6, 0]} barSize={16}
              cursor="pointer" onClick={(_, index) => onProductClick(products[index], tipo)} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

const ProductCard = ({ product, rank, onClick }: { product: Produto; rank: number; onClick: () => void }) => {
  const diff = (product.dif_total ?? 0);
  const diffPercent = product.valor_total ? ((diff / product.valor_total) * 100) : 0;
  const isIncrease = diff > 0;
  const name = productName(product);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: rank * 0.05 }}
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card
        className="cursor-pointer shadow-md hover:shadow-xl transition-all duration-200 border-none bg-white/90 backdrop-blur-sm overflow-hidden group relative"
        onClick={onClick}
      >
        {/* Rank badge */}
        <div className={`absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md ${
          rank <= 3 
            ? "bg-gradient-to-br from-amber-400 to-orange-500" 
            : "bg-gradient-to-br from-slate-400 to-slate-500"
        }`}>
          {rank}
        </div>

        <CardContent className="pt-10 pb-4 px-4">
          <div className="flex items-start gap-2 mb-3">
            <Package className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="min-w-0 space-y-1.5" title={name}>
              <p className="text-xs font-semibold leading-tight line-clamp-2">{name}</p>
              <RegimeBadge ncm={product.ncm} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Atual</span>
              <span className="text-sm font-bold" style={{ color: COLORS.blue }}>{formatCurrencyShort(product.valor_total ?? 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Reforma</span>
              <span className="text-sm font-bold" style={{ color: COLORS.purple }}>{formatCurrencyShort(product.total_reforma ?? 0)}</span>
            </div>
            
            {/* Impact indicator */}
            <div className={`flex items-center justify-center gap-1 py-1.5 rounded-md text-xs font-bold ${
              Math.abs(diff) < 0.01 
                ? "bg-slate-50 text-slate-500" 
                : isIncrease 
                  ? "bg-red-50 text-red-600" 
                  : "bg-emerald-50 text-emerald-600"
            }`}>
              {Math.abs(diff) >= 0.01 && (isIncrease
                ? <ArrowUpRight className="h-3.5 w-3.5" />
                : <ArrowDownRight className="h-3.5 w-3.5" />
              )}
              {Math.abs(diffPercent) >= 0.01 ? `${diffPercent > 0 ? "+" : ""}${diffPercent.toFixed(1)}%` : "Sem impacto"}
            </div>
          </div>

          <div className="mt-2 text-[10px] text-center text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            Clique para ver detalhes →
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const ProductDetailDialog = ({ product, tipo, open, onClose }: { product: Produto | null; tipo: Tipo; open: boolean; onClose: () => void }) => {
  if (!product) return null;

  const name = productName(product);
  const diff = product.dif_total ?? 0;
  const isIncrease = diff > 0;

  // Build comparison data for the radar chart
  const radarData = [];
  if (product.icms != null) radarData.push({ metric: "ICMS", Atual: product.icms || 0, Reforma: 0 });
  if (product.pis != null) radarData.push({ metric: "PIS", Atual: product.pis || 0, Reforma: 0 });
  if (product.cofins != null) radarData.push({ metric: "COFINS", Atual: product.cofins || 0, Reforma: 0 });
  if (product.ibs != null || product.ibs_cbs != null) radarData.push({ metric: "IBS/CBS", Atual: 0, Reforma: product.ibs_cbs || product.ibs || 0 });
  if (product.is != null) radarData.push({ metric: "IS", Atual: 0, Reforma: product.is || 0 });

  // Bar comparison data
  const barData = [
    { name: tipo === "compra" ? "Custo Total" : "Preço Venda", Atual: product.valor_total ?? 0, Reforma: product.total_reforma ?? 0 },
  ];
  if (product.creditos != null || product.debitos != null) {
    barData.push({ name: tipo === "compra" ? "Créditos" : "Débitos", Atual: product.creditos ?? product.debitos ?? 0, Reforma: product.creditos_reforma ?? product.debitos_reforma ?? product.ibs_cbs ?? 0 });
  }

  // All numeric fields for detail table
  const numericFields = Object.entries(product).filter(
    (entry): entry is [string, number] => typeof entry[1] === "number" && !["id", "codigo", "ncm"].some(x => entry[0].includes(x))
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-start gap-3 text-lg">
            <div className={`p-2 rounded-lg ${tipo === "compra" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
              {tipo === "compra" ? <ShoppingCart className="h-5 w-5" /> : <Store className="h-5 w-5" />}
            </div>
            <div>
              <div>{name}</div>
              <div className="text-xs text-muted-foreground font-normal mt-0.5">
                {tipo === "compra" ? "Produto Comprado" : "Produto Vendido"}
                {product.quantidade != null && ` • Qtd: ${formatNumber(product.quantidade)}`}
              </div>
              <div className="mt-2 font-normal">
                <RegimeBadge ncm={product.ncm} showBase />
              </div>
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">Detalhes do impacto tributário do produto</DialogDescription>
        </DialogHeader>

        {/* Impact Hero */}
        <div className={`rounded-xl p-4 flex items-center justify-between ${
          Math.abs(diff) < 0.01 ? "bg-slate-50" : isIncrease ? "bg-red-50" : "bg-emerald-50"
        }`}>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Impacto da Reforma no {tipo === "compra" ? "Custo" : "Preço"}</p>
            <p className={`text-2xl font-bold ${Math.abs(diff) < 0.01 ? "text-slate-500" : isIncrease ? "text-red-600" : "text-emerald-600"}`}>
              {isIncrease ? "+" : ""}{formatCurrency(diff)}
            </p>
          </div>
          <div className={`p-3 rounded-full ${Math.abs(diff) < 0.01 ? "bg-slate-200" : isIncrease ? "bg-red-100" : "bg-emerald-100"}`}>
            {Math.abs(diff) < 0.01 
              ? <TrendingUp className="h-6 w-6 text-slate-500" />
              : isIncrease 
                ? <TrendingUp className="h-6 w-6 text-red-600" />
                : <TrendingDown className="h-6 w-6 text-emerald-600" />
            }
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          {/* Comparison Bar */}
          <div className="bg-muted/30 rounded-xl p-4">
            <h4 className="text-sm font-semibold mb-3">Comparativo de Valores</h4>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={barData}>
                <defs>
                  <linearGradient id="gradAtualDialog" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.blue} />
                    <stop offset="100%" stopColor={COLORS.cyan} />
                  </linearGradient>
                  <linearGradient id="gradReformaDialog" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.purple} />
                    <stop offset="100%" stopColor={COLORS.pink} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={formatCurrencyShort} tick={{ fontSize: 10 }} />
                <Tooltip formatter={tooltipCurrency} contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                <Bar dataKey="Atual" fill="url(#gradAtualDialog)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Reforma" fill="url(#gradReformaDialog)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Radar Chart - Tax Distribution */}
          {radarData.length >= 3 && (
            <div className="bg-muted/30 rounded-xl p-4">
              <h4 className="text-sm font-semibold mb-3">Distribuição Tributária</h4>
              <ResponsiveContainer width="100%" height={180}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fontWeight: 600 }} />
                  <PolarRadiusAxis tick={{ fontSize: 8 }} />
                  <Radar name="Atual" dataKey="Atual" stroke={COLORS.blue} fill={COLORS.blue} fillOpacity={0.2} strokeWidth={2} />
                  <Radar name="Reforma" dataKey="Reforma" stroke={COLORS.purple} fill={COLORS.purple} fillOpacity={0.2} strokeWidth={2} />
                  <Tooltip formatter={tooltipCurrency} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Detail Grid */}
        <div className="mt-2">
          <h4 className="text-sm font-semibold mb-3">Todos os Indicadores</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {numericFields.map(([key, val]) => {
              const isPercentField = key.includes("carga") || key.includes("aliquota") || key.includes("percentual");
              return (
                <div key={key} className="bg-muted/30 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                  </p>
                  <p className="text-sm font-bold mt-0.5">
                    {isPercentField ? formatPercent(val) : formatCurrency(val)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TopProducts;

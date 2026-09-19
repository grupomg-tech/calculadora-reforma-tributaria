import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Minus, TrendingDown, TrendingUp, DollarSign, Percent } from "lucide-react";
import { formatCurrency, formatPercent, COLORS } from "./utils";
import { useI18n } from "@/i18n";

interface ImpactDelta {
  debitos: number;
  creditos: number;
  resultado: number;
  carga: number;
}

interface SummaryData {
  debitos: number;
  creditos: number;
  resultado: number;
  carga_tributaria_efetiva: number;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export const ImpactCards = ({ delta }: { delta: ImpactDelta }) => {
  const t = useI18n();
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <ImpactCard label={t.impact.debits} value={delta.debitos} isCurrency />
      <ImpactCard label={t.impact.credits} value={delta.creditos} isCurrency />
      <ImpactCard label={t.impact.result} value={delta.resultado} isCurrency />
      <ImpactCard label={t.impact.burden} value={delta.carga} isPercent />
    </motion.div>
  );
};

const ImpactCard = ({ label, value, isCurrency, isPercent }: { label: string; value: number; isCurrency?: boolean; isPercent?: boolean }) => {
  const isPositive = value > 0;
  const isNeutral = Math.abs(value) < 0.01;
  const formatted = isCurrency ? formatCurrency(Math.abs(value)) : isPercent ? formatPercent(Math.abs(value)) : Math.abs(value).toFixed(2);
  const sign = isNeutral ? "" : isPositive ? "+" : "-";

  return (
    <motion.div variants={item}>
      <Card className={`shadow-md border-l-4 overflow-hidden transition-all hover:scale-[1.02] ${isNeutral ? "border-l-muted" : isPositive ? "border-l-red-400" : "border-l-emerald-400"}`}>
        <CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground mb-1 font-medium">{label}</p>
          <div className="flex items-center gap-1.5">
            {!isNeutral && (isPositive
              ? <ArrowUpRight className="h-5 w-5 text-red-500" />
              : <ArrowDownRight className="h-5 w-5 text-emerald-500" />
            )}
            {isNeutral && <Minus className="h-5 w-5 text-muted-foreground" />}
            <span className={`font-bold text-xl ${isNeutral ? "text-muted-foreground" : isPositive ? "text-red-600" : "text-emerald-600"}`}>
              {sign}{formatted}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export const SummaryCards = ({ atual, reforma }: { atual: SummaryData; reforma: SummaryData }) => {
  const t = useI18n();
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <SummaryCard title={t.summary.currentSystem} color={COLORS.blue} gradientFrom="#4e6ae9" gradientTo="#6b8cff" data={atual} />
      <SummaryCard title={t.summary.taxReform} color={COLORS.purple} gradientFrom="#764ba2" gradientTo="#9b6fd0" data={reforma} />
    </motion.div>
  );
};

const SummaryCard = ({ title, color, gradientFrom, gradientTo, data }: {
  title: string; color: string; gradientFrom: string; gradientTo: string; data: SummaryData;
}) => {
  const t = useI18n();
  return (
    <motion.div variants={item}>
      <Card className="shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border-none">
        <div className="h-2" style={{ background: `linear-gradient(90deg, ${gradientFrom}, ${gradientTo})` }} />
        <CardContent className="pt-5 pb-5">
          <h3 className="text-lg font-bold mb-4" style={{ color }}>{title}</h3>
          <div className="grid grid-cols-2 gap-4">
            <MetricItem icon={<TrendingDown className="h-4 w-4" />} label={t.summary.debits} value={formatCurrency(data.debitos)} color={COLORS.red} />
            <MetricItem icon={<TrendingUp className="h-4 w-4" />} label={t.summary.credits} value={formatCurrency(data.creditos)} color={COLORS.green} />
            <MetricItem icon={<DollarSign className="h-4 w-4" />} label={t.summary.result} value={formatCurrency(data.resultado)} color={color} />
            <MetricItem icon={<Percent className="h-4 w-4" />} label={t.summary.effectiveBurden} value={formatPercent(data.carga_tributaria_efetiva)} color={color} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const MetricItem = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) => (
  <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors">
    <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}15`, color }}>{icon}</div>
    <div>
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <p className="font-bold text-sm">{value}</p>
    </div>
  </div>
);

export const ImpactBadge = ({ label, value, prefix, suffix }: { label: string; value: number; prefix?: string; suffix?: string }) => {
  const isPositive = value > 0;
  const isNeutral = Math.abs(value) < 0.01;
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 border shadow-sm backdrop-blur-sm">
      <span className="text-xs text-muted-foreground">{label}:</span>
      <span className={`text-sm font-bold flex items-center gap-0.5 ${isNeutral ? "text-muted-foreground" : isPositive ? "text-red-600" : "text-emerald-600"}`}>
        {!isNeutral && (isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />)}
        {prefix && `${prefix} `}{Math.abs(value).toFixed(2)}{suffix && ` ${suffix}`}
      </span>
    </div>
  );
};

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, RefreshCw } from "lucide-react";
import { useI18n } from "@/i18n";

interface FilterPanelProps {
  empresa: string;
  setEmpresa: (v: string) => void;
  periodoInicial: string;
  setPeriodoInicial: (v: string) => void;
  periodoFinal: string;
  setPeriodoFinal: (v: string) => void;
  aliquotaIbs: string;
  setAliquotaIbs: (v: string) => void;
  aliquotaCbs: string;
  setAliquotaCbs: (v: string) => void;
  aliquotaIs: string;
  setAliquotaIs: (v: string) => void;
  loading: boolean;
  autoRefresh: boolean;
  setAutoRefresh: (v: boolean) => void;
  onSubmit: () => void;
}

const FilterPanel = ({
  empresa, setEmpresa, periodoInicial, setPeriodoInicial, periodoFinal, setPeriodoFinal,
  aliquotaIbs, setAliquotaIbs, aliquotaCbs, setAliquotaCbs, aliquotaIs, setAliquotaIs,
  loading, autoRefresh, setAutoRefresh, onSubmit,
}: FilterPanelProps) => {
  const t = useI18n();
  return (
    <Card className="shadow-lg border-none bg-white/70 backdrop-blur-md">
      <CardContent className="pt-6">
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="empresa" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.filters.company}</Label>
            <Input id="empresa" value={empresa} onChange={(e) => setEmpresa(e.target.value)} className="w-28 bg-white" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pi" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.filters.periodStart}</Label>
            <Input id="pi" type="month" value={periodoInicial} onChange={(e) => setPeriodoInicial(e.target.value)} className="w-44 bg-white" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.filters.periodEnd}</Label>
            <Input id="pf" type="month" value={periodoFinal} onChange={(e) => setPeriodoFinal(e.target.value)} className="w-44 bg-white" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ibs" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.filters.ibs}</Label>
            <Input id="ibs" type="number" step="0.1" value={aliquotaIbs} onChange={(e) => setAliquotaIbs(e.target.value)} className="w-24 bg-white" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cbs" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.filters.cbs}</Label>
            <Input id="cbs" type="number" step="0.1" value={aliquotaCbs} onChange={(e) => setAliquotaCbs(e.target.value)} className="w-24 bg-white" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="is" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.filters.is}</Label>
            <Input id="is" type="number" step="0.1" value={aliquotaIs} onChange={(e) => setAliquotaIs(e.target.value)} className="w-24 bg-white" />
          </div>
          <Button type="submit" disabled={loading} className="bg-gradient-to-r from-[#4e6ae9] to-[#764ba2] hover:opacity-90 shadow-md">
            <Search className="mr-2 h-4 w-4" /> {t.filters.simulate}
          </Button>
          <Button type="button" variant={autoRefresh ? "destructive" : "outline"} onClick={() => setAutoRefresh(!autoRefresh)} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${autoRefresh ? "animate-spin" : ""}`} />
            {autoRefresh ? t.filters.stop : t.filters.autoRefresh}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default FilterPanel;

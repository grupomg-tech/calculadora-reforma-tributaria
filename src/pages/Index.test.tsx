import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import Index from "./Index";
import relatorio from "@/test/fixtures/relatorio.json";
import * as exportModule from "@/lib/export";

// Recharts measures its container; jsdom has no layout, so ResizeObserver must exist.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const jsonResponse = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, text: async () => JSON.stringify(body) }) as Response;

const setSearch = (search: string) => window.history.replaceState({}, "", `/${search}`);

describe("<Index />", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    setSearch("");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("fetches the report on mount and renders the impact overview", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(relatorio));
    vi.stubGlobal("fetch", fetchMock);

    render(<Index />);

    await waitFor(() => expect(screen.getByText("Variação Débitos")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("/dashboards/api/graficos/dados-relatorio/");
    expect(url).toContain("aliquota_ibs=18.5");
    expect(screen.getByText("Sistema Atual")).toBeInTheDocument();
    expect(screen.getByText("Reforma Tributária")).toBeInTheDocument();
    expect(screen.getByText("Produtos em Destaque")).toBeInTheDocument();
    expect(screen.queryByText(/Modo demonstração/)).not.toBeInTheDocument();
  });

  it("accepts a report wrapped in `dados`", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ dados: relatorio })));

    render(<Index />);

    await waitFor(() => expect(screen.getByText("Variação Débitos")).toBeInTheDocument());
  });

  it("shows the HTTP error and offers the demo dataset as a fallback", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse("nf", 404)));

    render(<Index />);

    await waitFor(() => expect(screen.getByText(/Erro HTTP 404/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /dados de exemplo/ }));

    await waitFor(() => expect(screen.getByText(/Modo demonstração/)).toBeInTheDocument());
    expect(screen.getByText("Produtos em Destaque")).toBeInTheDocument();
    expect(screen.queryByText(/Erro HTTP 404/)).not.toBeInTheDocument();
  });

  it("explains a network failure in plain words", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    render(<Index />);

    await waitFor(() => expect(screen.getByText(/Não foi possível conectar à API/)).toBeInTheDocument());
  });

  it("runs in demo mode with ?demo=1 without calling the API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    setSearch("?demo=1");

    render(<Index />);

    await waitFor(() => expect(screen.getByText(/Modo demonstração/)).toBeInTheDocument());
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText("Variação Débitos")).toBeInTheDocument();
  });

  it("recalculates the demo simulation when the rates change", async () => {
    vi.stubGlobal("fetch", vi.fn());
    setSearch("?demo=1");

    render(<Index />);
    await waitFor(() => expect(screen.getByText("Variação Débitos")).toBeInTheDocument());

    const before = screen.getByText("Reforma Tributária").closest("div")!.parentElement!.textContent;

    fireEvent.change(screen.getByLabelText("IS (%)"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: /Simular/ }));

    await waitFor(() => {
      const after = screen.getByText("Reforma Tributária").closest("div")!.parentElement!.textContent;
      expect(after).not.toBe(before);
    });
  });

  it("keeps Exportar CSV disabled until a report is loaded", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse("nf", 404)));

    render(<Index />);

    await waitFor(() => expect(screen.getByText(/Erro HTTP 404/)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /Exportar CSV/ })).toBeDisabled();
  });

  it("downloads a CSV from the header in demo mode", async () => {
    vi.stubGlobal("fetch", vi.fn());
    setSearch("?demo=1");
    const downloadSpy = vi.spyOn(exportModule, "downloadCsv").mockImplementation(() => undefined);

    render(<Index />);

    const button = await screen.findByRole("button", { name: /Exportar CSV/ });
    expect(button).toBeEnabled();
    fireEvent.click(button);

    expect(downloadSpy).toHaveBeenCalledTimes(1);
    const csv = downloadSpy.mock.calls[0][0];
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("tipo;descricao;");
    expect(csv).toContain("compra;Arroz branco tipo 1 5kg;");
    expect(csv).toContain("venda;");
  });

  it("links to the repository from the header and from the demo banner", async () => {
    vi.stubGlobal("fetch", vi.fn());
    setSearch("?demo=1");

    render(<Index />);

    await waitFor(() => expect(screen.getByText(/Modo demonstração/)).toBeInTheDocument());
    const links = screen.getAllByRole("link", { name: /GitHub/ });
    expect(links.length).toBeGreaterThanOrEqual(2);
    for (const link of links) {
      expect(link).toHaveAttribute("href", "https://github.com/grupomg-tech/calculadora-reforma-tributaria");
      expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    }
    expect(screen.getByText(/Demo with fictional data/)).toBeInTheDocument();
  });

  it("switches the UI to English when ?lang=en and keeps BRL formatting", async () => {
    vi.stubGlobal("fetch", vi.fn());
    setSearch("?demo=1&lang=en");

    render(<Index />);

    await waitFor(() => expect(screen.getByText("Tax Reform Calculator")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /Simulate/ })).toBeInTheDocument();
    expect(screen.getByText("Featured products")).toBeInTheDocument();
    expect(screen.getByText("Current system")).toBeInTheDocument();
    expect(screen.queryByText("Produtos em Destaque")).not.toBeInTheDocument();
    expect(screen.queryByText("Calculadora Reforma Tributária")).not.toBeInTheDocument();
    expect(screen.getAllByText(/R\$/).length).toBeGreaterThan(0);
  });

  it("reads filters from the query string", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(relatorio));
    vi.stubGlobal("fetch", fetchMock);
    setSearch("?empresa=42&periodo_inicial=2026-01&periodo_final=2026-06&aliquota_cbs=9");

    render(<Index />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("empresa=42");
    expect(url).toContain("periodo_inicial=2026-01");
    expect(url).toContain("periodo_final=2026-06");
    expect(url).toContain("aliquota_cbs=9");
    expect((screen.getByLabelText("Empresa") as HTMLInputElement).value).toBe("42");
  });
});

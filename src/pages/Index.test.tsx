import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import Index from "./Index";
import relatorio from "@/test/fixtures/relatorio.json";

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

  it("exports the loaded report as CSV and stays disabled without data", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse("nf", 404)));
    const createObjectURL = vi.fn((_blob: Blob) => "blob:report");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", Object.assign(Object.create(URL), { createObjectURL, revokeObjectURL }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(<Index />);

    await waitFor(() => expect(screen.getByText(/Erro HTTP 404/)).toBeInTheDocument());
    const button = screen.getByRole("button", { name: /Exportar CSV/ });
    expect(button).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /dados de exemplo/ }));
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0];
    expect(blob.type).toBe("text/csv;charset=utf-8");
    // jsdom's Blob has no text(); read it the browser way.
    const text = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(blob);
    });
    expect(text).toContain("tipo;descricao;ncm");
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:report");
    click.mockRestore();
  });

  it("links to the repository from the header and from the demo banner", async () => {
    vi.stubGlobal("fetch", vi.fn());
    setSearch("?demo=1");

    render(<Index />);

    await waitFor(() => expect(screen.getByText(/Modo demonstração/)).toBeInTheDocument());
    const links = screen.getAllByRole("link", { name: /GitHub/ });
    expect(links.length).toBeGreaterThanOrEqual(2);
    for (const link of links) {
      expect(link).toHaveAttribute("href", "https://github.com/grupomg-tech/dashreforma");
      expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    }
    expect(screen.getByText(/Demo with fictional data/)).toBeInTheDocument();
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

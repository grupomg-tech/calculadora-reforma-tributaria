import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import TopProducts from "./TopProducts";
import type { Produto } from "@/lib/api-types";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const produto = (i: number, extra: Partial<Produto> = {}): Produto => ({
  descricao: `Produto ${String(i).padStart(2, "0")}`,
  quantidade: 10 * i,
  valor_total: 1000 * i,
  total_reforma: 1000 * i + 50 * i,
  dif_total: 50 * i,
  icms: 100 * i,
  pis: 10 * i,
  cofins: 40 * i,
  ibs_cbs: 120 * i,
  is: 0,
  ...extra,
});

describe("<TopProducts />", () => {
  beforeEach(() => vi.stubGlobal("ResizeObserver", ResizeObserverStub));
  afterEach(() => vi.unstubAllGlobals());

  it("renders nothing without products", () => {
    const { container } = render(<TopProducts produtosEntrada={[]} produtosSaida={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows at most the 10 highest-value sales, in descending order", () => {
    const vendas = Array.from({ length: 12 }, (_, i) => produto(i + 1));
    render(<TopProducts produtosEntrada={[]} produtosSaida={vendas} />);

    expect(screen.getByRole("tab", { name: /Mais Vendidos \(10\)/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Mais Comprados \(0\)/ })).toBeInTheDocument();

    const cards = screen.getAllByTitle(/^Produto \d+$/);
    expect(cards).toHaveLength(10);
    expect(cards[0]).toHaveTextContent("Produto 12");
    expect(cards[9]).toHaveTextContent("Produto 03");
    expect(screen.queryByTitle("Produto 01")).not.toBeInTheDocument();
  });

  it("flags increases and decreases per product", () => {
    const vendas = [
      produto(1, { dif_total: 200 }),
      produto(2, { dif_total: -300 }),
      produto(3, { dif_total: 0 }),
    ];
    render(<TopProducts produtosEntrada={[]} produtosSaida={vendas} />);

    expect(screen.getByText("+20.0%")).toBeInTheDocument();
    expect(screen.getByText("-15.0%")).toBeInTheDocument();
    expect(screen.getByText("Sem impacto")).toBeInTheDocument();
  });

  it("opens the detail dialog with the product's tax breakdown", () => {
    render(<TopProducts produtosEntrada={[]} produtosSaida={[produto(1, { quantidade: 1234 })]} />);

    fireEvent.click(screen.getByTitle("Produto 01"));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Produto 01")).toBeInTheDocument();
    expect(within(dialog).getByText(/Produto Vendido/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Qtd: 1\.234/)).toBeInTheDocument();
    expect(within(dialog).getByText("Todos os Indicadores")).toBeInTheDocument();
    expect(within(dialog).getByText("Icms")).toBeInTheDocument();
  });

  it("keeps the full product name available for the tooltip while the axis label is truncated", () => {
    const longo = produto(1, { descricao: "Refrigerante cola garrafa retornável 2 litros" });
    render(<TopProducts produtosEntrada={[]} produtosSaida={[longo]} />);

    // The card shows the full name; the chart row (rendered by recharts from `name`) uses the 18-char cut.
    expect(screen.getByTitle("Refrigerante cola garrafa retornável 2 litros")).toBeInTheDocument();
    expect(screen.getByTitle("Refrigerante cola garrafa retornável 2 litros")).toHaveTextContent("Refrigerante cola garrafa retornável 2 litros");
  });

  it("shows the reform regime on the product card and in the detail dialog", () => {
    render(<TopProducts produtosEntrada={[]} produtosSaida={[produto(1, { ncm: "1006.30.21" })]} />);

    const card = screen.getByTitle("Produto 01");
    expect(within(card).getByText("Alíquota zero")).toBeInTheDocument();

    fireEvent.click(card);

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Alíquota zero")).toBeInTheDocument();
    expect(within(dialog).getByText(/NCM 1006\.30\.21 · LC 214\/2025 art\. 125, Anexo I/)).toBeInTheDocument();
  });

  it("labels an unknown NCM as the standard rate", () => {
    render(<TopProducts produtosEntrada={[]} produtosSaida={[produto(1, { ncm: "9999.99.99" })]} />);
    expect(screen.getByText("Alíquota padrão")).toBeInTheDocument();
  });

  it("uses the purchases tab for inbound products", () => {
    render(<TopProducts produtosEntrada={[produto(5)]} produtosSaida={[]} />);

    // Radix tabs activate on pointer down, not on click.
    fireEvent.mouseDown(screen.getByRole("tab", { name: /Mais Comprados \(1\)/ }), { button: 0 });
    fireEvent.click(screen.getByTitle("Produto 05"));

    expect(within(screen.getByRole("dialog")).getByText(/Produto Comprado/)).toBeInTheDocument();
  });
});

import { describe, it, expect, afterEach } from "vitest";
import { en } from "./en";
import { ptBR } from "./pt-BR";
import {
  applyDocumentLocale,
  DEFAULT_LOCALE,
  interpolate,
  messagesFor,
  parseLangTag,
  resolveLocale,
} from "./index";

const leafKeys = (value: object, prefix = ""): string[] =>
  Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return child !== null && typeof child === "object"
      ? leafKeys(child as Record<string, unknown>, path)
      : [path];
  });

describe("parseLangTag", () => {
  it("accepts en and en-* as English", () => {
    expect(parseLangTag("en")).toBe("en");
    expect(parseLangTag("EN")).toBe("en");
    expect(parseLangTag("en-US")).toBe("en");
    expect(parseLangTag("en-GB")).toBe("en");
  });

  it("accepts pt, pt-BR and other pt-* as pt-BR", () => {
    expect(parseLangTag("pt")).toBe("pt-BR");
    expect(parseLangTag("pt-BR")).toBe("pt-BR");
    expect(parseLangTag("pt-br")).toBe("pt-BR");
    expect(parseLangTag("pt-PT")).toBe("pt-BR");
  });

  it("ignores empty and unsupported tags", () => {
    expect(parseLangTag(null)).toBeNull();
    expect(parseLangTag("")).toBeNull();
    expect(parseLangTag("   ")).toBeNull();
    expect(parseLangTag("fr")).toBeNull();
    expect(parseLangTag("de-DE")).toBeNull();
  });
});

describe("resolveLocale", () => {
  it("defaults to pt-BR", () => {
    expect(DEFAULT_LOCALE).toBe("pt-BR");
    expect(resolveLocale("", "")).toBe("pt-BR");
  });

  it("lets ?lang= win over navigator.language", () => {
    expect(resolveLocale("?lang=en", "pt-BR")).toBe("en");
    expect(resolveLocale("?demo=1&lang=pt-BR", "en-US")).toBe("pt-BR");
  });

  it("falls through an unknown ?lang= to navigator, then to pt-BR", () => {
    expect(resolveLocale("?lang=fr", "en-US")).toBe("en");
    expect(resolveLocale("?lang=fr", "de-DE")).toBe("pt-BR");
  });

  it("uses navigator.language when the query omits lang", () => {
    expect(resolveLocale("?demo=1", "en-GB")).toBe("en");
    expect(resolveLocale("", "pt-PT")).toBe("pt-BR");
  });
});

describe("catalogs", () => {
  it("keeps the English catalog aligned with pt-BR", () => {
    expect(leafKeys(en).sort()).toEqual(leafKeys(ptBR).sort());
  });

  it("returns the catalog for the requested locale", () => {
    expect(messagesFor("en").header.title).toBe("Tax Reform Calculator");
    expect(messagesFor("pt-BR").header.title).toBe("Calculadora Reforma Tributária");
  });
});

describe("interpolate", () => {
  it("replaces named placeholders and leaves unknown tokens", () => {
    expect(interpolate("Erro HTTP {status}", { status: 404 })).toBe("Erro HTTP 404");
    expect(interpolate("Hello {name}", { other: "x" })).toBe("Hello {name}");
  });
});

describe("applyDocumentLocale", () => {
  const originalLang = document.documentElement.lang;
  const originalTitle = document.title;

  afterEach(() => {
    document.documentElement.lang = originalLang;
    document.title = originalTitle;
  });

  it("sets html lang and the document title from the catalog", () => {
    applyDocumentLocale("en");
    expect(document.documentElement.lang).toBe("en");
    expect(document.title).toBe(en.document.title);
  });
});

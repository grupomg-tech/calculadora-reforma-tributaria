import { once } from "node:events";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildDemoReport } from "../../src/lib/demo";
import { createRequestListener, REPORT_PATH } from "./server";

const RATES = { ibs: 18.5, cbs: 8.5, is: 0 };

describe("example backend HTTP", () => {
  let server: http.Server;
  let origin: string;

  beforeAll(async () => {
    server = http.createServer(createRequestListener());
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const { port } = server.address() as AddressInfo;
    origin = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    server.close();
    await once(server, "close");
  });

  it("returns 200 and schema_version 1.0 for the report endpoint", async () => {
    const res = await fetch(
      `${origin}${REPORT_PATH}/?aliquota_ibs=18.5&aliquota_cbs=8.5&aliquota_is=0`,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    const body = await res.json();
    expect(body.schema_version).toBe("1.0");
    expect(body).toEqual(buildDemoReport(RATES));
  });

  it("accepts the path without a trailing slash", async () => {
    const res = await fetch(`${origin}${REPORT_PATH}`);
    expect(res.status).toBe(200);
    expect((await res.json()).schema_version).toBe("1.0");
  });

  it("answers CORS preflight", async () => {
    const res = await fetch(`${origin}${REPORT_PATH}/`, { method: "OPTIONS" });
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-methods")).toMatch(/GET/);
  });
});

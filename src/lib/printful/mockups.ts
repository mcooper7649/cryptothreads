import { pf } from "./client";

export interface MockupRequest {
  catalogProductId: number;
  catalogVariantIds: number[];
  placement: string;
  technique?: string;
  /** Reference the design either by uploaded file id or public URL. */
  fileId?: number;
  fileUrl?: string;
  mockupStyleIds?: number[];
  format?: "png" | "jpg";
}

interface MockupTaskCreated {
  task_key?: string;
  id?: number;
}

export interface MockupResult {
  catalogVariantId: number;
  placement: string;
  url: string;
}

function layer(req: MockupRequest) {
  return req.fileId
    ? { type: "file", file_id: req.fileId }
    : { type: "file", url: req.fileUrl };
}

/** Kick off async mockup generation. Completion arrives via webhook or polling. */
export async function createMockupTask(
  req: MockupRequest
): Promise<MockupTaskCreated> {
  const body = {
    format: req.format ?? "png",
    products: [
      {
        catalog_product_id: req.catalogProductId,
        catalog_variant_ids: req.catalogVariantIds,
        ...(req.mockupStyleIds ? { mockup_style_ids: req.mockupStyleIds } : {}),
        placements: [
          {
            placement: req.placement,
            ...(req.technique ? { technique: req.technique } : {}),
            layers: [layer(req)],
          },
        ],
      },
    ],
  };
  return pf<MockupTaskCreated>("/mockup-tasks", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

interface MockupTaskStatus {
  status: "pending" | "completed" | "failed" | string;
  catalog_variant_mockups?: Array<{
    catalog_variant_id: number;
    mockups: Array<{ placement: string; mockup_url: string }>;
  }>;
  failure_reasons?: string[];
}

export async function getMockupTask(idOrKey: string | number): Promise<MockupTaskStatus> {
  return pf<MockupTaskStatus>(`/mockup-tasks?id=${encodeURIComponent(String(idOrKey))}`);
}

function flatten(status: MockupTaskStatus): MockupResult[] {
  const out: MockupResult[] = [];
  for (const v of status.catalog_variant_mockups ?? []) {
    for (const m of v.mockups ?? []) {
      out.push({ catalogVariantId: v.catalog_variant_id, placement: m.placement, url: m.mockup_url });
    }
  }
  return out;
}

/**
 * Create a mockup task and poll until done. Prod should prefer the
 * `mockup_task_finished` webhook; polling is the dev/synchronous fallback.
 */
export async function generateMockups(
  req: MockupRequest,
  { timeoutMs = 60000, intervalMs = 3000 }: { timeoutMs?: number; intervalMs?: number } = {}
): Promise<MockupResult[]> {
  const created = await createMockupTask(req);
  const id = created.id ?? created.task_key;
  if (!id) throw new Error("mockup task: no id/task_key returned");

  const deadline = Date.now() + timeoutMs;
  // Poll without using a forbidden bare sleep timer pattern.
  while (Date.now() < deadline) {
    const status = await getMockupTask(id);
    if (status.status === "completed") return flatten(status);
    if (status.status === "failed") {
      throw new Error(`mockup failed: ${(status.failure_reasons ?? []).join("; ")}`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("mockup generation timed out");
}

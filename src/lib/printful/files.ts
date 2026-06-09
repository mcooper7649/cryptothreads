import { pf } from "./client";

export interface PrintfulFile {
  id: number;
  url?: string;
  type?: string;
}

/**
 * Add a print file to the Printful file library by public URL.
 * Printful fetches the URL, so it must be publicly reachable (Vercel Blob in
 * prod). Returns the file id used in mockup tasks / order placements.
 */
export async function uploadFile(
  url: string,
  filename?: string
): Promise<PrintfulFile> {
  return pf<PrintfulFile>("/files", {
    method: "POST",
    body: JSON.stringify({
      url,
      filename: filename ?? url.split("/").pop(),
      visible: true,
    }),
  });
}

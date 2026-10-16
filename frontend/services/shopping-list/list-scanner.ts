import type { ScannedItem } from "@/models/entities/shopping-list";

/** Reads a photo of a grocery list. Interface, so tests or other providers can be swapped in. */
export interface ListScanner {
  scan(image: File): Promise<ScannedItem[]>;
}

/** Sends the photo to FastAPI, which asks the OpenAI vision model. */
export class HttpListScanner implements ListScanner {
  constructor(private readonly backendUrl: string) {}

  async scan(image: File): Promise<ScannedItem[]> {
    const form = new FormData();
    form.append("image", image);

    let response: Response;
    try {
      response = await fetch(`${this.backendUrl}/api/list/scan`, { method: "POST", body: form });
    } catch {
      throw new Error("The list reader is offline right now. Please try again later.");
    }
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.detail?.message ?? "Couldn't read the photo. Please try again.");
    return (data as { items: ScannedItem[] }).items;
  }
}

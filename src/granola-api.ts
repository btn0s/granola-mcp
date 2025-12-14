import { readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const GRANOLA_APP_SUPPORT_PATH = join(
  homedir(),
  "Library",
  "Application Support",
  "Granola"
);

export interface GranolaDocument {
  id: string;
  title?: string;
  content?: string;
  markdown?: string;
  created_at?: string;
  updated_at?: string;
  last_viewed_panel?: any;
  [key: string]: any;
}

export interface GranolaApiResponse {
  docs: GranolaDocument[];
  [key: string]: any;
}

export class GranolaApiClient {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private readonly apiUrl = "https://api.granola.ai/v2/get-documents";

  private loadCredentials(): string | null {
    try {
      const credsPath = join(GRANOLA_APP_SUPPORT_PATH, "supabase.json");
      const fileContent = readFileSync(credsPath, "utf-8");
      const data = JSON.parse(fileContent);

      const workosTokens = JSON.parse(data.workos_tokens);
      const accessToken = workosTokens.access_token;
      const expiresIn = workosTokens.expires_in || 21600; // Default 6 hours
      const obtainedAt = workosTokens.obtained_at || Date.now();

      this.tokenExpiry = obtainedAt + expiresIn * 1000;
      this.accessToken = accessToken;

      return accessToken;
    } catch (error) {
      console.error("Error loading Granola credentials:", error);
      return null;
    }
  }

  private getAccessToken(): string | null {
    if (!this.accessToken || Date.now() >= this.tokenExpiry - 5 * 60 * 1000) {
      return this.loadCredentials();
    }
    return this.accessToken;
  }

  async fetchDocuments(
    limit: number = 100,
    offset: number = 0
  ): Promise<GranolaDocument[]> {
    const token = this.getAccessToken();
    if (!token) {
      throw new Error("Failed to load Granola credentials");
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "*/*",
      "User-Agent": "Granola/5.354.0",
      "X-Client-Version": "5.354.0",
    };

    const body = {
      limit,
      offset,
      include_last_viewed_panel: true,
    };

    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(
          `Granola API error: ${response.status} ${response.statusText}`
        );
      }

      const data = (await response.json()) as GranolaApiResponse;
      return data.docs || [];
    } catch (error) {
      console.error("Error fetching documents from Granola API:", error);
      throw error;
    }
  }

  async getAllDocuments(): Promise<GranolaDocument[]> {
    const allDocs: GranolaDocument[] = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const docs = await this.fetchDocuments(limit, offset);
      if (docs.length === 0) {
        break;
      }
      allDocs.push(...docs);
      offset += limit;
      if (offset > 10000) {
        break;
      }
    }

    return allDocs;
  }

  async searchDocuments(
    query: string,
    limit: number = 10
  ): Promise<GranolaDocument[]> {
    const allDocs = await this.getAllDocuments();
    const lowerQuery = query.toLowerCase();

    return allDocs
      .filter((doc) => {
        const title = doc.title?.toLowerCase() || "";
        const markdown = doc.markdown?.toLowerCase() || "";
        const content = doc.content?.toLowerCase() || "";
        return (
          title.includes(lowerQuery) ||
          markdown.includes(lowerQuery) ||
          content.includes(lowerQuery)
        );
      })
      .slice(0, limit);
  }

  async getDocumentById(id: string): Promise<GranolaDocument | null> {
    const allDocs = await this.getAllDocuments();
    return allDocs.find((doc) => doc.id === id) || null;
  }
}

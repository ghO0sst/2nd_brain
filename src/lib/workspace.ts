/**
 * Google Workspace API Client for Second Brain
 * Supports Google Drive and Gmail live search, retrieval, and embedding ingestion.
 */

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
  iconLink?: string;
  size?: string;
  description?: string;
  owners?: { displayName: string; emailAddress: string }[];
}

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  snippet?: string;
  subject?: string;
  from?: string;
  to?: string;
  date?: string;
  body?: string;
}

// Decode base64url encoded strings from Gmail API
function decodeBase64Url(input: string): string {
  try {
    let base64 = input.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    return decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  } catch {
    try {
      return atob(input.replace(/-/g, "+").replace(/_/g, "/"));
    } catch {
      return input;
    }
  }
}

/**
 * List files from user's Google Drive
 */
export async function listGoogleDriveFiles(
  accessToken: string,
  searchQuery = ""
): Promise<GoogleDriveFile[]> {
  try {
    let q = "trashed = false";
    if (searchQuery.trim()) {
      q += ` and name contains '${searchQuery.replace(/'/g, "\\'")}'`;
    }

    const fields =
      "files(id,name,mimeType,modifiedTime,webViewLink,iconLink,size,description,owners)";
    const url = `https://www.googleapis.com/drive/v3/files?pageSize=20&q=${encodeURIComponent(
      q
    )}&orderBy=modifiedTime desc&fields=${encodeURIComponent(fields)}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(
        err.error?.message || `Google Drive API error: ${response.statusText}`
      );
    }

    const data = await response.json();
    return data.files || [];
  } catch (error: any) {
    console.error("Failed to list Google Drive files:", error);
    throw error;
  }
}

/**
 * Fetch text content of a Google Drive file or Google Doc
 */
export async function getGoogleDriveFileContent(
  accessToken: string,
  fileId: string,
  mimeType: string
): Promise<string> {
  try {
    let fetchUrl = "";

    if (mimeType === "application/vnd.google-apps.document") {
      // Export Google Doc as plain text
      fetchUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`;
    } else if (
      mimeType === "application/vnd.google-apps.spreadsheet" ||
      mimeType === "application/vnd.google-apps.presentation"
    ) {
      fetchUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/csv`;
    } else {
      // Direct media download for txt, md, json, code, etc.
      fetchUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    }

    const response = await fetch(fetchUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 403 || response.status === 404) {
        return `[Content unavailable for direct text stream. File ID: ${fileId}]`;
      }
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || "Failed to download file content");
    }

    const text = await response.text();
    return text || `[Document empty or no text content found]`;
  } catch (error: any) {
    console.error("Error reading file content from Google Drive:", error);
    return `[Attached Google Drive document: ${fileId} - Preview not loaded directly]`;
  }
}

/**
 * List Gmail messages matching an optional query
 */
export async function listGmailMessages(
  accessToken: string,
  searchQuery = "is:starred OR label:important",
  maxResults = 15
): Promise<GmailMessageSummary[]> {
  try {
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=${encodeURIComponent(
      searchQuery
    )}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(
        err.error?.message || `Gmail API error: ${response.statusText}`
      );
    }

    const data = await response.json();
    const messageStubs = data.messages || [];

    if (messageStubs.length === 0) {
      return [];
    }

    // Fetch message summaries in parallel (limit to top 10 for performance)
    const details = await Promise.all(
      messageStubs.slice(0, 10).map(async (stub: { id: string; threadId: string }) => {
        try {
          return await getGmailMessageDetails(accessToken, stub.id);
        } catch {
          return {
            id: stub.id,
            threadId: stub.threadId,
            subject: "Email conversation",
            snippet: "Message content loading...",
          };
        }
      })
    );

    return details;
  } catch (error: any) {
    console.error("Failed to list Gmail messages:", error);
    throw error;
  }
}

/**
 * Fetch full details and body of a Gmail message
 */
export async function getGmailMessageDetails(
  accessToken: string,
  messageId: string
): Promise<GmailMessageSummary> {
  try {
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Gmail fetch error for ID ${messageId}`);
    }

    const msg = await response.json();
    const headers = msg.payload?.headers || [];

    const getHeader = (name: string) =>
      headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())
        ?.value || "";

    const subject = getHeader("Subject") || "No Subject";
    const from = getHeader("From") || "Unknown Sender";
    const to = getHeader("To") || "";
    const date = getHeader("Date") || "";

    // Extract message body text
    let body = "";
    if (msg.payload?.body?.data) {
      body = decodeBase64Url(msg.payload.body.data);
    } else if (msg.payload?.parts) {
      // Check multi-part message
      const findTextPart = (parts: any[]): string => {
        for (const part of parts) {
          if (part.mimeType === "text/plain" && part.body?.data) {
            return decodeBase64Url(part.body.data);
          }
          if (part.mimeType === "text/html" && part.body?.data && !body) {
            body = decodeBase64Url(part.body.data).replace(/<[^>]+>/g, " ");
          }
          if (part.parts) {
            const nested = findTextPart(part.parts);
            if (nested) return nested;
          }
        }
        return body;
      };
      body = findTextPart(msg.payload.parts) || msg.snippet || "";
    } else {
      body = msg.snippet || "";
    }

    return {
      id: msg.id,
      threadId: msg.threadId,
      snippet: msg.snippet,
      subject,
      from,
      to,
      date,
      body: body.trim(),
    };
  } catch (error: any) {
    console.error(`Error loading Gmail message ${messageId}:`, error);
    throw error;
  }
}

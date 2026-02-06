import express, { Request, Response } from "express";
import { resolve, join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { existsSync, readFileSync } from "fs";
import { config as loadEnv } from "dotenv";
import { createServer } from "net";

// Import handlers from individual modules
import {
  handleList,
  handleSearch,
  handleListFolders,
  handleCountImages,
  handleFolderImages,
} from "../handlers/list";
import {
  handleUpload,
  handleDelete,
  handleDeleteStream,
  handleCreateFolder,
  handleRename,
  handleRenameStream,
  handleMoveStream,
} from "../handlers/files";
import {
  handleSync,
  handleSyncStream,
  handleReprocessStream,
  handleUnprocessStream,
  handleDownloadStream,
  handlePushUpdatesStream,
  handleCancelUpdates,
  handleCancelStreamOperation,
} from "../handlers/images";
import { handleScanStream, handleDeleteOrphans } from "../handlers/scan";
import {
  handleImportUrls,
  handleGetCdns,
  handleUpdateCdns,
} from "../handlers/import";
import { handleGenerateFavicon } from "../handlers/favicon";
import {
  handleGenerateFeaturedImage,
  handleCheckFeaturedImage,
  handleGetFeaturedImageOptions,
} from "../handlers/featured-image";
import { handleEditImage } from "../handlers/edit-image";
import { handleFontsList, handleFontsUpload, handleFontsCreateFolder, handleFontsDelete } from "../handlers/fonts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get version from package.json
const packageJsonPath = resolve(__dirname, "../../package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
const version = packageJson.version;

export interface ServerOptions {
  port: number;
  workspace: string;
  open?: boolean;
}

/**
 * Check if a port is available
 */
function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => {
      resolve(false);
    });
    server.once("listening", () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
}

/**
 * Find an available port starting from the given port
 */
async function findAvailablePort(
  startPort: number,
  maxAttempts = 10
): Promise<number> {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(
    `No available port found between ${startPort} and ${
      startPort + maxAttempts - 1
    }`
  );
}

export async function startServer(options: ServerOptions) {
  const { port: requestedPort, workspace, open } = options;

  // Find an available port starting from the requested port
  const port = await findAvailablePort(requestedPort);
  if (port !== requestedPort) {
    console.log(`Port ${requestedPort} is in use, using port ${port} instead`);
  }

  const app = express();

  // Store workspace in a way handlers can access
  process.env.STUDIO_WORKSPACE = workspace;

  // Load environment variables from workspace
  // Load .env.local (contains both R2 credentials and local dev URL)
  const envLocalPath = join(workspace, ".env.local");

  if (existsSync(envLocalPath)) {
    loadEnv({ path: envLocalPath, quiet: true });
  }

  // Also set STUDIO_DEV_SITE_URL from NEXT_PUBLIC_PRODUCTION_URL if not already set
  if (
    !process.env.STUDIO_DEV_SITE_URL &&
    process.env.NEXT_PUBLIC_PRODUCTION_URL
  ) {
    process.env.STUDIO_DEV_SITE_URL = process.env.NEXT_PUBLIC_PRODUCTION_URL;
  }

  // Middleware - skip JSON parsing for upload routes (needs raw body for FormData)
  const rawBodyPaths = ["/api/studio/upload", "/api/studio/fonts/upload"];
  app.use((req, res, next) => {
    if (rawBodyPaths.includes(req.path)) {
      next();
    } else {
      express.json({ limit: "50mb" })(req, res, next);
    }
  });
  app.use((req, res, next) => {
    if (rawBodyPaths.includes(req.path)) {
      next();
    } else {
      express.urlencoded({ extended: true, limit: "50mb" })(req, res, next);
    }
  });

  // API Routes - GET endpoints
  app.get("/api/studio/list", wrapHandler(handleList));
  app.get("/api/studio/list-folders", wrapHandler(handleListFolders));
  app.get("/api/studio/search", wrapHandler(handleSearch));
  app.get("/api/studio/count-images", wrapHandler(handleCountImages));
  app.get("/api/studio/folder-images", wrapHandler(handleFolderImages));
  app.get("/api/studio/cdns", wrapHandler(handleGetCdns));
  app.get(
    "/api/studio/check-featured-image",
    wrapHandler(handleCheckFeaturedImage)
  );
  app.get(
    "/api/studio/featured-image-options",
    wrapHandler(handleGetFeaturedImageOptions)
  );

  // Font management routes
  app.get("/api/studio/fonts/list", wrapHandler(handleFontsList));
  app.post("/api/studio/fonts/upload", wrapRawHandler(handleFontsUpload));
  app.post("/api/studio/fonts/create-folder", wrapHandler(handleFontsCreateFolder));
  app.post("/api/studio/fonts/delete", wrapHandler(handleFontsDelete));

  // API Routes - POST endpoints
  // Upload uses raw body wrapper to preserve FormData
  app.post("/api/studio/upload", wrapRawHandler(handleUpload));
  app.post("/api/studio/create-folder", wrapHandler(handleCreateFolder));
  app.post("/api/studio/rename", wrapHandler(handleRename));
  app.post("/api/studio/rename-stream", wrapHandler(handleRenameStream, true));
  app.post("/api/studio/move", wrapHandler(handleMoveStream, true));
  app.post("/api/studio/edit-image", wrapHandler(handleEditImage));
  app.post("/api/studio/sync", wrapHandler(handleSync, true));
  app.post("/api/studio/sync-stream", wrapHandler(handleSyncStream, true));
  app.post(
    "/api/studio/reprocess-stream",
    wrapHandler(handleReprocessStream, true)
  );
  app.post(
    "/api/studio/unprocess-stream",
    wrapHandler(handleUnprocessStream, true)
  );
  app.post(
    "/api/studio/download-stream",
    wrapHandler(handleDownloadStream, true)
  );
  app.post(
    "/api/studio/push-updates-stream",
    wrapHandler(handlePushUpdatesStream, true)
  );
  app.post("/api/studio/cancel-updates", wrapHandler(handleCancelUpdates));
  app.post(
    "/api/studio/cancel-stream",
    wrapHandler(handleCancelStreamOperation)
  );
  app.post("/api/studio/scan", wrapHandler(handleScanStream, true));
  app.post("/api/studio/delete-orphans", wrapHandler(handleDeleteOrphans));
  app.post("/api/studio/import", wrapHandler(handleImportUrls, true));
  app.post("/api/studio/cdns", wrapHandler(handleUpdateCdns));
  app.post(
    "/api/studio/generate-favicon",
    wrapHandler(handleGenerateFavicon, true)
  );
  app.post(
    "/api/studio/generate-featured-image",
    wrapHandler(handleGenerateFeaturedImage, true)
  );

  // API Routes - DELETE endpoints
  app.post("/api/studio/delete", wrapHandler(handleDelete));
  app.post("/api/studio/delete-stream", wrapHandler(handleDeleteStream, true));

  // Serve static files from workspace's public folder
  // Files are accessed at root path (e.g., /favicon.png, /images/photo.jpg)
  app.use(express.static(join(workspace, "public")));

  // Serve the client app
  const clientDir = resolve(__dirname, "../client");

  // Inject workspace and dev URL into the HTML
  app.get("/", (req: Request, res: Response) => {
    const htmlPath = join(clientDir, "index.html");
    if (existsSync(htmlPath)) {
      let html = readFileSync(htmlPath, "utf-8");
      // Inject workspace and site URL as global variables
      const siteUrl = process.env.STUDIO_DEV_SITE_URL || "";
      const script = `<script>
        window.__STUDIO_WORKSPACE__ = ${JSON.stringify(workspace)};
        window.__STUDIO_SITE_URL__ = ${JSON.stringify(siteUrl)};
      </script>`;
      html = html.replace("</head>", `${script}</head>`);
      res.type("html").send(html);
    } else {
      res.status(404).send("Client not built. Run npm run build first.");
    }
  });

  // Serve other static assets
  app.use(express.static(clientDir));

  // Start server
  const title = `Gallop - Studio (${version})`;
  app.listen(port, () => {
    console.log(`
┌─────────────────────────────────────┐
│  ${title.padEnd(34)}│
├─────────────────────────────────────┤
│  Workspace: ${
      workspace.length > 24
        ? "..." + workspace.slice(-21)
        : workspace.padEnd(24)
    }│
│  URL: http://localhost:${port}         │
└─────────────────────────────────────┘
`);

    if (open) {
      import("open")
        .then((mod) => {
          mod.default(`http://localhost:${port}`);
        })
        .catch(() => {
          // open package might not be available
        });
    }
  });
}

// Wrapper to adapt Next.js-style handlers to Express
function wrapHandler(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (request?: any) => Promise<globalThis.Response>,
  streaming = false
) {
  return async (req: Request, res: Response) => {
    try {
      const request = createFetchRequest(req);
      const response = await handler(request);
      if (streaming) {
        await sendStreamingResponse(res, response);
      } else {
        await sendResponse(res, response);
      }
    } catch (error) {
      console.error("Handler error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}

// Wrapper for handlers that need raw body (like file uploads with FormData)
function wrapRawHandler(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (request?: any) => Promise<globalThis.Response>
) {
  return async (req: Request, res: Response) => {
    try {
      const request = await createRawFetchRequest(req);
      const response = await handler(request);
      await sendResponse(res, response);
    } catch (error) {
      console.error("Handler error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}

// Helper to create a Fetch API Request from Express request
function createFetchRequest(req: Request): globalThis.Request {
  const url = new URL(req.url, `http://${req.headers.host}`);

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) {
      if (Array.isArray(value)) {
        value.forEach((v) => headers.append(key, v));
      } else {
        headers.set(key, value);
      }
    }
  }

  const init: RequestInit = {
    method: req.method,
    headers,
  };

  // Add body for non-GET requests
  if (req.method !== "GET" && req.method !== "HEAD") {
    if (req.body) {
      init.body = JSON.stringify(req.body);
    }
  }

  return new globalThis.Request(url.toString(), init);
}

// Helper to create a Fetch API Request with raw body (for FormData uploads)
async function createRawFetchRequest(
  req: Request
): Promise<globalThis.Request> {
  const url = new URL(req.url, `http://${req.headers.host}`);

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) {
      if (Array.isArray(value)) {
        value.forEach((v) => headers.append(key, v));
      } else {
        headers.set(key, value);
      }
    }
  }

  // Collect raw body chunks
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  const body = Buffer.concat(chunks);

  const init: RequestInit = {
    method: req.method,
    headers,
    body,
  };

  return new globalThis.Request(url.toString(), init);
}

// Helper to send a Response to Express response
async function sendResponse(res: Response, response: globalThis.Response) {
  res.status(response.status);

  // Copy headers
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  // Send body
  const body = await response.text();
  res.send(body);
}

// Helper to send a streaming Response to Express response
async function sendStreamingResponse(
  res: Response,
  response: globalThis.Response
) {
  res.status(response.status);

  // Copy headers
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  // Check if it's a streaming response
  if (response.body) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
      res.end();
    } catch (error) {
      console.error("Streaming error:", error);
      res.end();
    }
  } else {
    const body = await response.text();
    res.send(body);
  }
}

import express from "express";
import path from "path";
import fs from "fs";

async function startServer() {
  const app = express();
  
  // AI Studio infrastructure runs an Nginx reverse proxy on port 8080 (Cloud Run PORT)
  // that routes all external traffic exclusively to the application listening on port 3000.
  // The server MUST always bind to port 3000 on 0.0.0.0.
  const PORT = 3000;
  // In CJS, __filename and __dirname are available; in ESM, process.cwd() is used.
  const isCJS = typeof __filename !== "undefined";
  const isProduction = process.env.NODE_ENV === "production" || (isCJS && __filename.endsWith(".cjs"));

  // JSON body parser
  app.use(express.json());

  // Health check routes for Cloud Run container readiness and liveness probes
  app.get(["/api/health", "/health", "/healthz"], (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  if (!isProduction) {
    // Dynamic import to prevent loading Vite in production
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Resolve static assets directory
    let distPath = path.join(process.cwd(), "dist");
    const baseDir = typeof __dirname !== "undefined" ? __dirname : process.cwd();
    if (!fs.existsSync(distPath) || !fs.existsSync(path.join(distPath, "index.html"))) {
      distPath = baseDir;
    }
    if (!fs.existsSync(path.join(distPath, "index.html"))) {
      distPath = path.join(baseDir, "dist");
    }

    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT} (${isProduction ? "production" : "development"})`);
  });

  // Graceful shutdown handling for Cloud Run container lifecycle
  process.on("SIGTERM", () => {
    server.close(() => {
      process.exit(0);
    });
  });

  process.on("SIGINT", () => {
    server.close(() => {
      process.exit(0);
    });
  });
}

startServer();

import express from "express";
import path from "path";
import fs from "fs";

async function startServer() {
  const app = express();
  
  // In the AI Studio development container, CONTROL_PLANE_PORT is set and dev servers MUST listen on port 3000.
  // In deployed Cloud Run services, the container MUST listen on the port provided by Cloud Run via process.env.PORT.
  const isDevContainer = Boolean(process.env.CONTROL_PLANE_PORT);
  const isProduction = !isDevContainer || process.env.NODE_ENV === "production";
  const PORT = isDevContainer ? 3000 : (Number(process.env.PORT) || 3000);

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
    if (!fs.existsSync(distPath)) {
      distPath = path.join(__dirname, "dist");
    }
    if (!fs.existsSync(distPath)) {
      distPath = __dirname;
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

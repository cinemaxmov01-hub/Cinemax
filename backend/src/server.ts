import "dotenv/config";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
// Ensure config/.env is loaded in both dev and production builds.
try {
  const __dir = path.dirname(fileURLToPath(import.meta.url));
  dotenv.config({ path: path.resolve(__dir, "../config/.env") });
  dotenv.config({ path: path.resolve(__dir, "../../config/.env") });
} catch {}
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { authRouter } from "./routes/website.js";
import { adminRouter } from "./routes/admin.js";
import { seedAdminUser, getUserById, getOptionalUserId, AuthedRequest, isAdminEmail } from "./lib/auth.js";
import { connectDB } from "../config/db.js";
import db, { initDb, flushDb } from "./lib/db.js";
import { getMailerStatus } from "./lib/mailer.js";
import { buildCinemaxKnowledgeBase } from "./lib/assistantKnowledge.js";
import { matchMoviesFromAnalysis, VisualAnalysis } from "./lib/tmdbMatch.js";

const app = express();

// Behind Render's proxy — required for `secure` cookies to be recognized.
app.set("trust proxy", 1);

// ---------------------------------------------------------------------------
// CORS — allow the deployed website + admin panel origins, plus anything
// listed explicitly in CORS_ORIGIN (comma-separated). WEBSITE_URL and
// ADMIN_PANEL_URL are wired automatically by render.yaml.
// ---------------------------------------------------------------------------
function buildAllowedOrigins(): string[] {
  const raw: string[] = [];
  if (process.env.CORS_ORIGIN) raw.push(...process.env.CORS_ORIGIN.split(","));
  if (process.env.WEBSITE_URL) raw.push(process.env.WEBSITE_URL);
  if (process.env.ADMIN_PANEL_URL) raw.push(process.env.ADMIN_PANEL_URL);
  
  // KOMEZA KWEMERERA IMBUGA ZA RENDER N'IZ'UBUNTU ZA INFINITYFREE
  raw.push(
    "https://cinemax-backend.onrender.com",
    "https://cinemaxmovie.onrender.com",
    "https://cinemaxmovie-admin.onrender.com",
    "https://cinemax-website.onrender.com",
    "https://cinemax-admin.onrender.com",
    "https://cinemaxmovie-backend-1mol.onrender.com",
    "https://cinemaxmovie-site.onrender.com",
    "https://cinemax-tc3o.onrender.com"
  );
  
  // KORA NYABO: Emerera domain zose z'ubuntu zishobora kuva kuri InfinityFree
  if (process.env.INFINITY_URL) {
    raw.push(process.env.INFINITY_URL);
  }
  
  // Local dev conveniences.
  raw.push("http://localhost:5173", "http://localhost:5174", "http://localhost:3000");
  return Array.from(
    new Set(
      raw
        .map((o) => (o || "").trim().replace(/\/+$/, ""))
        .filter(Boolean),
    ),
  );
}
const allowedOrigins = buildAllowedOrigins();
console.log("[cors] Allowed origins:", allowedOrigins);

function isAllowedOrigin(origin: string): boolean {
  const normalized = origin.replace(/\/+$/, "");
  if (allowedOrigins.includes(normalized)) return true;
  
  // Emerera mu buryo bwikora amadomains ya Render na InfinityFree (.great-site.net cyangwa .rf.gd)
  if (/^https:\/\/[a-z0-9-]+\.onrender\.com$/i.test(normalized)) return true;
  if (/^https?:\/\/[a-z0-9-]+\.(great-site\.net|rf\.gd|infinityfreeapp\.com)$/i.test(normalized)) return true;
  
  return false;
}

const corsOptions: cors.CorsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (isAllowedOrigin(origin)) return cb(null, true);
    console.warn("[cors] Rejected origin:", origin);
    return cb(new Error(`Origin ${origin} is not allowed by CORS.`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json({ limit: "20mb" }));
app.use(cookieParser());

// Render healthcheck target
app.get("/api/health", (_req, res) => {
  const mailerStatus = getMailerStatus();
  res.json({
    status: "ok",
    uptime: process.uptime(),
    db: process.env.MONGO_URI ? "mongo" : "file",
    mailer: mailerStatus.configured ? "configured" : "missing",
    mailerUser: mailerStatus.user ? mailerStatus.user.substring(0, 3) + "***" : "not_set",
    time: new Date().toISOString(),
  });
});

// Test endpoint to verify mailer configuration
app.get("/api/test/mailer", async (_req, res) => {
  const mailerStatus = getMailerStatus();
  res.json({
    configured: mailerStatus.configured,
    user: mailerStatus.user,
    envEmailUser: process.env.EMAIL_USER ? "set" : "missing",
    envEmailAppPassword: process.env.EMAIL_APP_PASSWORD ? "set" : "missing",
    envGmailUser: process.env.GMAIL_USER ? "set" : "missing",
    envGmailAppPassword: process.env.GMAIL_APP_PASSWORD ? "set" : "missing",
  });
});

app.use(authRouter);
app.use(adminRouter);

app.post("/api/assistant", async (req, res) => {
  try {
    if (db.data?.site_settings?.aiEnabled === false) {
      res.status(403).json({ error: "The AI assistant is currently disabled by the administrator." });
      return;
    }

    const { message, history = [], movieContext, visualContext } = req.body || {};
    const userMessage = String(message || "").trim();
    if (!userMessage) {
      res.status(400).json({ error: "Message is required." });
      return;
    }

    const systemPrompt = buildAssistantSystemPrompt({
      movieContext,
      visualContext,
      sessionUser: resolveSessionUser(req),
    });

    const safeHistory = Array.isArray(history)
      ? history.slice(-12).map((h: any) => ({
          role: h?.role === "assistant" ? "assistant" : "user",
          content: String(h?.content ?? h?.text ?? "").slice(0, 3000),
        })).filter((h: any) => h.content.trim())
      : [];

    const routed = await routedAssistantChat([
      { role: "system", content: systemPrompt },
      ...safeHistory,
      { role: "user", content: userMessage },
    ], db.data?.site_settings?.aiModel);

    const user = resolveSessionUser(req);
    saveAiChatLog(user, "user", userMessage, "system");
    saveAiChatLog(user, "assistant", routed.text, routed.engine);

    res.json({ text: routed.text, engine: routed.engine });
  } catch (err: any) {
    console.error("[assistant] request failed:", err);
    const missingKey = String(err?.message || "").toLowerCase().includes("api key");
    res.status(missingKey ? 503 : 500).json({
      error: missingKey
        ? "AI is not configured yet. Add OPENAI_API_KEY, GEMINI_API_KEY or GROQ_API_KEY in the hosted backend environment."
        : "The AI assistant is temporarily unavailable. Please try again.",
    });
  }
});

app.post("/api/agent/generate-image", async (req, res) => {
  try {
    const { prompt, size = "1024x1024" } = req.body || {};
    const cleanPrompt = String(prompt || "").trim();
    if (!cleanPrompt) {
      res.status(400).json({ error: "Prompt is required." });
      return;
    }

    const imageUrl = await openaiGenerateImage(cleanPrompt, size);
    if (!imageUrl) {
      throw new Error("Image generation failed");
    }

    const user = resolveSessionUser(req);
    saveAiChatLog(user, "user", `Generate image: ${cleanPrompt}`, "system");
    saveAiChatLog(user, "assistant", `Image generated: ${imageUrl}`, "openai");

    res.json({ imageUrl, prompt: cleanPrompt });
  } catch (err: any) {
    console.error("[agent] image generation failed:", err);
    const missingKey = String(err?.message || "").toLowerCase().includes("api key");
    res.status(missingKey ? 503 : 500).json({
      error: missingKey
        ? "Image generation is not configured yet. Add OPENAI_API_KEY in the hosted backend environment."
        : "Image generation is temporarily unavailable. Please try again.",
    });
  }
});

app.post("/api/visual-search/match", async (req, res) => {
  try {
    const { imageBase64, mimeType, question } = req.body || {};
    const rawImage = String(imageBase64 || "").trim();
    if (!rawImage) {
      res.status(400).json({ error: "Image data is required." });
      return;
    }
    // IYI ENDPOINT IRI GUHAMAGARA `matchMoviesFromAnalysis` IVUYE MURI TWE GICE CYA `lib/tmdbMatch.js`
    // NIYO RIGOMBA GUHINDURWAMO IZINA RYA GEMINI 2.5 N'AHO API VERSION YA V1 IKORESHWA.
  } catch (err) {
     res.status(500).json({ error: "Internal error" });
  }
});

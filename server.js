import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { SignReq, isPrivateIPv4 } from "./lib/validate.js";
import { signLeaf } from "./lib/crypto.js";

dotenv.config();

const PORT = process.env.PORT || 8080;
const TOKEN = process.env.SIGNER_TOKEN || "";
const ALLOW_PRIVATE = (process.env.ALLOW_PRIVATE_IPS || "true") === "true";
const DEFAULT_DAYS = parseInt(process.env.DEFAULT_DAYS || "7", 10);

const DEV_INT_CRT_CONTENT = process.env.DEV_INT_CRT || "";
const DEV_INT_KEY_CONTENT = process.env.DEV_INT_KEY || "";
if (!DEV_INT_CRT_CONTENT || !DEV_INT_KEY_CONTENT) {
  console.error("Missing DEV_INT_CRT or DEV_INT_KEY environment variables");
  process.exit(1);
}

const app = express();
app.disable("x-powered-by");

// Configure Express to trust proxy for production deployment
app.set('trust proxy', 1);

app.use(helmet());

// Configure CORS to explicitly allow X-Requested-With header
const corsOptions = {
  origin: true, // Allow all origins
  credentials: true,
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  preflightContinue: false,
  optionsSuccessStatus: 200 // For legacy browsers
};

app.use(cors(corsOptions));

// Handle preflight requests explicitly for all routes
app.options('*', cors(corsOptions));

app.use(express.json({ limit: "64kb" }));
app.use(morgan("combined"));

const limiter = rateLimit({ 
  windowMs: 60_000, 
  max: 5, 
  standardHeaders: true, 
  legacyHeaders: false,
  trustProxy: true
});
app.use("/v1/", limiter);

app.post("/v1/sign", async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!TOKEN || token !== TOKEN) return res.status(401).json({ error: "unauthorized" });

    const parsed = SignReq.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "invalid_request", details: parsed.error.flatten() });

    const { device_id, ip, dns, days } = parsed.data;
    if (!ALLOW_PRIVATE && isPrivateIPv4(ip)) return res.status(400).json({ error: "ip_not_allowed" });

    // Clamp certificate lifetime to safe bounds
    const clampedDays = Math.min(Math.max(Number.isFinite(days) ? days : DEFAULT_DAYS, 1), 365);

    const result = await signLeaf({
      deviceId: device_id,
      ip,
      dns,
      days: clampedDays,
      devIntCrtContent: DEV_INT_CRT_CONTENT,
      devIntKeyContent: DEV_INT_KEY_CONTENT
    });

    return res.json(result);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "sign_failed" });
  }
});

// Add root route to handle proxy health checks
app.get("/", (_req, res) => res.json({ ok: true, service: "laniot-signer" }));

// Health endpoint (original)
app.get("/healthz", (_req, res) => res.json({ ok: true }));

// Health endpoint under /v1 path (same routing as working POST)
app.get("/v1/healthz", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`signer listening on :${PORT}`));
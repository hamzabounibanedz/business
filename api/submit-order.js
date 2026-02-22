// Proxy for order submission (avoids CORS). Set GOOGLE_WEBHOOK_URL in Vercel.

const GOOGLE_WEBHOOK_URL = process.env.GOOGLE_WEBHOOK_URL;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  if (!GOOGLE_WEBHOOK_URL) {
    return res.status(500).json({ success: false, error: "Webhook URL not set" });
  }

  const body = req.body == null ? "" : (typeof req.body === "string" ? req.body : JSON.stringify(req.body));
  if (!body) {
    return res.status(400).json({ success: false, error: "Missing body" });
  }

  try {
    const response = await fetch(GOOGLE_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { success: response.ok, raw: text };
    }

    res.status(response.status).json(data);
  } catch (err) {
    console.error("Order proxy error:", err);
    res.status(502).json({
      success: false,
      error: "Failed to reach order service",
    });
  }
}

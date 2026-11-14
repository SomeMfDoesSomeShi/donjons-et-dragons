const MODEL = "@cf/black-forest-labs/flux-1-schnell";

function json(data, status, headers) {
  return new Response(JSON.stringify(data), { status, headers });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowedOrigin = env.ALLOWED_ORIGIN || "";
    const cors = {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Vary": "Origin"
    };

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (origin !== allowedOrigin) return json({ error: "Origine non autorisée." }, 403, { ...cors, "Content-Type": "application/json" });
    if (request.method !== "POST") return json({ error: "Méthode non autorisée." }, 405, { ...cors, "Content-Type": "application/json" });

    if (!env.IMAGE_API_SECRET || request.headers.get("Authorization") !== `Bearer ${env.IMAGE_API_SECRET}`) {
      return json({ error: "Secret incorrect." }, 401, { ...cors, "Content-Type": "application/json" });
    }

    try {
      const body = await request.json();
      const prompt = String(body.prompt || "").trim();
      if (!prompt || prompt.length > 2000) return json({ error: "Prompt vide ou trop long (2000 caractères maximum)." }, 400, { ...cors, "Content-Type": "application/json" });

      const result = await env.AI.run(MODEL, { prompt, steps: 4 });
      if (!result?.image) throw new Error("Aucune image reçue de Cloudflare AI.");

      return json({ dataURI: `data:image/jpeg;base64,${result.image}` }, 200, { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" });
    } catch (error) {
      return json({ error: error?.message || "Erreur de génération." }, 500, { ...cors, "Content-Type": "application/json" });
    }
  }
};

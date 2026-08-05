const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

// Restrict to max 10 instances for cost control
setGlobalOptions({maxInstances: 10});

/**
 * Cloud Function to handle Mailtrap email proxying.
 */
exports.api = onRequest({
  cors: true,
  invoker: "public",
  secrets: ["MAILTRAP_API_TOKEN"],
}, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const payload = req.body;
  const token = process.env.MAILTRAP_API_TOKEN;
  const sandboxId = process.env.VITE_MAILTRAP_SANDBOX_ID;

  if (!token) {
    logger.error("Missing MAILTRAP_API_TOKEN environment variable.");
    res.status(500).json({error: "Server configuration error."});
    return;
  }

  const url = (sandboxId && sandboxId !== "your_sandbox_id") ?
    `https://sandbox.api.mailtrap.io/api/send/${sandboxId}` :
    "https://send.api.mailtrap.io/api/send";

  logger.info(`Forwarding mail request to: ${url}`);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    res.status(response.status).send(responseText);
  } catch (error) {
    logger.error("Error communicating with Mailtrap:", error);
    res.status(500).json({error: error.message});
  }
});

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

const { WEBHOOK_VERIFY_TOKEN, GRAPH_API_TOKEN } = process.env;

// Webhook verification (WhatsApp setup)
app.get("/webhook", (req, res) => {
  const VERIFY_TOKEN = WEBHOOK_VERIFY_TOKEN;

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN) {
    console.log("WEBHOOK_VERIFIED");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Handle incoming messages
app.post("/webhook", async (req, res) => {
  console.log("Incoming webhook message:", JSON.stringify(req.body, null, 2));

  const message = req.body.entry?.[0]?.changes[0]?.value?.messages?.[0];

  if (message?.type === "text") {
    const business_phone_number_id =
      req.body.entry?.[0].changes?.[0].value?.metadata?.phone_number_id;

    await axios.post(`https://graph.facebook.com/v18.0/${business_phone_number_id}/messages`, 
      {
        messaging_product: "whatsapp",
        to: message.from,
        text: { body: "Echo: " + message.text.body },
        context: { message_id: message.id }
      },
      {
        headers: { Authorization: `Bearer ${GRAPH_API_TOKEN}` }
      }
    );

    await axios.post(`https://graph.facebook.com/v18.0/${business_phone_number_id}/messages`, 
      {
        messaging_product: "whatsapp",
        status: "read",
        message_id: message.id
      },
      {
        headers: { Authorization: `Bearer ${GRAPH_API_TOKEN}` }
      }
    );
  }

  res.sendStatus(200);
});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


// accepts GET requests at the /webhook endpoint. You need this URL to setup webhook initially.
// info on verification request payload: https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
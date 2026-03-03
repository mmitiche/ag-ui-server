import express from "express";
import cors from "cors";
import agcore from "@ag-ui/core";

const { EventType } = agcore;

const app = express();
app.use(cors());
app.use(express.json());

function sseWrite(res, event) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

function id(prefix) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function buildAnswer(question, type) {
  return `
You asked about "${question}".

This is a ${type} answer related to "${question}".
When discussing "${question}", we usually analyze different aspects of "${question}".

### About "${question}"

- "${question}" can have multiple meanings.
- Testing "${question}" helps validate the UI behavior.
- In this mock server, "${question}" is intentionally repeated for realism.

In summary, this response demonstrates how "${question}" would look in a real scenario.`;
}

/* ===========================
   ANSWER ENDPOINT
=========================== */

app.post("/orgs/:orgId/agents/:agentId/answer", async (req, res) => {
  const { orgId, agentId } = req.params;
  console.log(`Answer request for org ${orgId}, agent ${agentId}`);

  const runId = id("run");
  const threadId = id("thread");
  const messageId = id("msg");

  const question = (req.body?.q ?? "").toLowerCase();

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("x-answer-id", runId);

  sseWrite(res, {
    type: EventType.RUN_STARTED,
    threadId,
    runId,
    timestamp: Date.now(),
  });

  sseWrite(res, {
    type: EventType.CUSTOM,
    name: "header",
    value: {
      contentFormat: "text/markdown",
      followUpEnabled: !question.includes("disabled"),
    },
    timestamp: Date.now(),
  });

  // Simulate error
  if (question.includes("error")) {
    await delay(1000);

    sseWrite(res, {
      type: EventType.RUN_ERROR,
      message: "Simulated backend failure.",
      timestamp: Date.now(),
    });

    res.end();
    return;
  }

  // Searching step
  sseWrite(res, {
    type: EventType.STEP_STARTED,
    stepName: "searching",
    timestamp: Date.now(),
  });

  await delay(1000);

  sseWrite(res, {
    type: EventType.STEP_FINISHED,
    stepName: "searching",
    timestamp: Date.now(),
  });

  // Thinking step
  sseWrite(res, {
    type: EventType.STEP_STARTED,
    stepName: "thinking",
    timestamp: Date.now(),
  });

  await delay(1000);

  sseWrite(res, {
    type: EventType.STEP_FINISHED,
    stepName: "thinking",
    timestamp: Date.now(),
  });

  const answer = buildAnswer(req.body?.q ?? "", "head");

  const chunks = answer.split(/(\n)/);
  for (const chunk of chunks) {
    if (!chunk) continue;
    await delay(40);

    sseWrite(res, {
      type: EventType.TEXT_MESSAGE_CHUNK,
      messageId,
      delta: chunk,
      timestamp: Date.now(),
    });
  }

  sseWrite(res, {
    type: EventType.RUN_FINISHED,
    threadId,
    runId,
    timestamp: Date.now(),
    result: { answerGenerated: true },
  });

  res.end();
});

/* ===========================
   FOLLOW-UP ENDPOINT
=========================== */

app.post("/orgs/:orgId/agents/:agentId/follow-up", async (req, res) => {
  const { orgId, agentId } = req.params;
  console.log(`Follow-up request for org ${orgId}, agent ${agentId}`);

  const runId = id("run");
  const threadId = req.body?.conversationId;
  const messageId = id("msg");

  const question = (req.body?.q ?? "").toLowerCase();

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("x-answer-id", runId);

  sseWrite(res, {
    type: EventType.RUN_STARTED,
    threadId,
    runId,
    timestamp: Date.now(),
  });

  sseWrite(res, {
    type: EventType.CUSTOM,
    name: "header",
    value: {
      contentFormat: "text/markdown",
    },
    timestamp: Date.now(),
  });

  // Simulate error
  if (question.includes("error")) {
    await delay(1000);

    sseWrite(res, {
      type: EventType.RUN_ERROR,
      message: "Simulated backend failure.",
      timestamp: Date.now(),
    });

    res.end();
    return;
  }

  // Thinking
  sseWrite(res, {
    type: EventType.STEP_STARTED,
    stepName: "thinking",
    timestamp: Date.now(),
  });

  await delay(1000);

  sseWrite(res, {
    type: EventType.STEP_FINISHED,
    stepName: "thinking",
    timestamp: Date.now(),
  });

  const answer = buildAnswer(req.body?.q ?? "", "follow-up");

  const chunks = answer.split(/(\n)/);
  for (const chunk of chunks) {
    if (!chunk) continue;
    await delay(40);

    sseWrite(res, {
      type: EventType.TEXT_MESSAGE_CHUNK,
      messageId,
      delta: chunk,
      timestamp: Date.now(),
    });
  }

  sseWrite(res, {
    type: EventType.RUN_FINISHED,
    threadId,
    runId,
    timestamp: Date.now(),
    result: { answerGenerated: true },
  });

  res.end();
});

app.listen(3000, () => {
  console.log("Mock backend running on http://localhost:3000");
});

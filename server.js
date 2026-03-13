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

${
  question.includes("code")
    ? `
### Example Code

\`\`\`
<script type="module" src="https://static.cloud.coveo.com/atomic/v3/atomic.esm.js"></script>
<link rel="stylesheet" href="https://static.cloud.coveo.com/atomic/v3/themes/coveo.css"/>
<atomic-search-interface id="search-interface">
  <atomic-search-layout>
    <atomic-layout-section section="search">
      <atomic-search-box></atomic-search-box>
    </atomic-layout-section>
    <atomic-layout-section section="facets">
      <atomic-facet-manager>
        <atomic-facet field="author" label="Authors"></atomic-facet>
      </atomic-facet-manager>
    </atomic-layout-section>
    <atomic-layout-section section="main">
      <atomic-layout-section section="results">
        <atomic-result-list>
          <atomic-result-template>
            <template>
              <atomic-result-link></atomic-result-link>
            </template>
          </atomic-result-template>
        </atomic-result-list>
      </atomic-layout-section>
      <atomic-layout-section section="pagination">
        <atomic-load-more-results></atomic-load-more-results>
      </atomic-layout-section>
    </atomic-layout-section>
  </atomic-search-layout>
</atomic-search-interface>
\`\`\`
`
    : ""
}

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

  // Simulate cannot answer
  if (question.includes("cannot answer")) {
    sseWrite(res, {
      type: EventType.RUN_FINISHED,
      threadId,
      runId,
      timestamp: Date.now(),
      result: { answerGenerated: false },
    });

    res.end();
    return;
  }

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
    type: EventType.CUSTOM,
    name: "citations",
    value: {
      citations: [
        {
          id: "NB4GO5LIOZNDOMSRGZT4HMLJM5US4NBWGU4TILTEMVTGC5LMOQ",
          title: "About Coveo In-Product Experience",
          uri: "https://docs.coveo.com/en/n47d1000/",
          clickUri: "https://docs.coveo.com/en/n47d1000/",
          permanentid:
            "954f9d44bee238a72b0abc2fcd52823a0cca3e16cb3ac35163764b25c79c",
          primaryId: "NB4GO5LIOZNDOMSRGZT4HMLJM5US4NBWGU4TILTEMVTGC5LMOQ",
          text: "# About Coveo In-Product Experience ...",
          source: "Coveo Docs",
          filetype: "html",
        },
        {
          id: "NNYWUR3FMM3WI5L2J4YXOVDENAXDINRVHE2C4ZDFMZQXK3DU",
          title:
            "Create and manage in-product experiences | Coveo In-Product Experience",
          uri: "https://docs.coveo.com/en/3160/",
          clickUri: "https://docs.coveo.com/en/3160/",
          permanentid:
            "e607f4ffe29a5bada0e7c02cb25e4cf6ffea892380f6ef67c2f633a3962b",
          primaryId: "NNYWUR3FMM3WI5L2J4YXOVDENAXDINRVHE2C4ZDFMZQXK3DU",
          text: "# Create and manage in-product experiences ...",
          source: "Coveo Docs",
          filetype: "html",
        },
      ],
    },
    timestamp: Date.now(),
  });

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

  // Searching step
  sseWrite(res, {
    type: EventType.STEP_STARTED,
    stepName: "searching",
    timestamp: Date.now(),
  });

  await delay(200);

  sseWrite(res, {
    type: EventType.STEP_FINISHED,
    stepName: "searching",
    timestamp: Date.now(),
  });

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

  // Simulate cannot answer
  if (question.includes("cannot answer")) {
    sseWrite(res, {
      type: EventType.RUN_FINISHED,
      threadId,
      runId,
      timestamp: Date.now(),
      result: { answerGenerated: false },
    });

    res.end();
    return;
  }

  sseWrite(res, {
    type: EventType.STEP_STARTED,
    stepName: "answering",
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
    type: EventType.CUSTOM,
    name: "citations",
    value: {
      citations: [
        {
          id: "NB4GO5LIOZNDOMSRGZT4HMLJM5US4NBWGU4TILTEMVTGC5LMOQ",
          title: "About Coveo In-Product Experience",
          uri: "https://docs.coveo.com/en/n47d1000/",
          clickUri: "https://docs.coveo.com/en/n47d1000/",
          permanentid:
            "954f9d44bee238a72b0abc2fcd52823a0cca3e16cb3ac35163764b25c79c",
          primaryId: "NB4GO5LIOZNDOMSRGZT4HMLJM5US4NBWGU4TILTEMVTGC5LMOQ",
          text: "# About Coveo In-Product Experience ...",
          source: "Coveo Docs",
          filetype: "html",
        },
        {
          id: "NNYWUR3FMM3WI5L2J4YXOVDENAXDINRVHE2C4ZDFMZQXK3DU",
          title:
            "Create and manage in-product experiences | Coveo In-Product Experience",
          uri: "https://docs.coveo.com/en/3160/",
          clickUri: "https://docs.coveo.com/en/3160/",
          permanentid:
            "e607f4ffe29a5bada0e7c02cb25e4cf6ffea892380f6ef67c2f633a3962b",
          primaryId: "NNYWUR3FMM3WI5L2J4YXOVDENAXDINRVHE2C4ZDFMZQXK3DU",
          text: "# Create and manage in-product experiences ...",
          source: "Coveo Docs",
          filetype: "html",
        },
      ],
    },
    timestamp: Date.now(),
  });

  sseWrite(res, {
    type: EventType.STEP_FINISHED,
    stepName: "answering",
    timestamp: Date.now(),
  });

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

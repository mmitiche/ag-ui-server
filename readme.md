# Mock AGUI Streaming Server

This is a lightweight mock backend used to simulate AGUI streaming behavior while the real backend is under development.

The goal of this server is to:

* Enable UI QA testing
* Simulate realistic streaming responses
* Mimic backend success and failure scenarios
* Keep the implementation simple and easy to modify

---

# Overview

The server exposes two endpoints:

* `POST /orgs/:orgId/agents/:agentId/answer`
* `POST /orgs/:orgId/agents/:agentId/follow-up`

Both endpoints stream events using **Server-Sent Events (SSE)** following the AGUI protocol.

The responses are hard-coded but dynamically adapted based on the input question.

---

# Dynamic Behavior

The mock server supports simple keyword-based behavior to simulate real backend conditions.

## 1. Simulated Errors

If the question (`q` in request body) contains the word:

```
error
```

The server will:

* Emit `RUN_STARTED`
* Emit `header`
* Emit `RUN_ERROR`
* End the stream

This allows QA to validate error states and UI error handling.

---

## 2. Disabling Follow-Up (Answer Endpoint Only)

If the question contains the word:

```
disabled
```

The `/answer` endpoint will send:

```json
{
  "followUpEnabled": false
}
```

inside the `header` custom event.

Otherwise, `followUpEnabled` defaults to `true`.

This allows QA to verify UI behavior when follow-up functionality is disabled.

---

## 3. Realistic Answer Simulation

The generated response:

* Is hard-coded
* Streams content in small chunks
* Simulates step progression (`searching`, `thinking`)

This makes the UI behave as if it is connected to a real AI backend.

---

# Endpoint Details

## 1. `/answer`

### Purpose

Generates the initial (head) answer.

### Behavior

* Creates a new `threadId`
* Sends:

  * `RUN_STARTED`
  * `header` (with `followUpEnabled`)
  * `STEP_STARTED` / `STEP_FINISHED` (searching, thinking)
  * `TEXT_MESSAGE_CHUNK` (streamed answer)
  * `RUN_FINISHED`

---

## 2. `/follow-up`

### Purpose

Generates a follow-up answer in an existing conversation.

### Behavior

* Uses `conversationId` from request body as `threadId`
* Sends:

  * `RUN_STARTED`
  * `header`
  * `STEP_STARTED` / `STEP_FINISHED` (thinking)
  * `TEXT_MESSAGE_CHUNK`
  * `RUN_FINISHED`

This endpoint does **not** control `followUpEnabled`.


# How to Start the Server

## 1. Install dependencies

```bash
npm install
```

## 2. Start the server

```bash
node server.js
```

## 3. Server runs at

```
http://localhost:3000
```

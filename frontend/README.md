# SuchnaSetu Chatbot

A React + Vite frontend for asking questions about government policies, rules, and procedures. The interface sends each question to a FastAPI endpoint and displays the answer.

## Run locally

1. Install Node.js 18 or newer.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env` and set `VITE_API_URL` to your FastAPI URL.
4. Start the frontend with `npm run dev`.

By default, the frontend calls `http://localhost:8000/ask`.

## FastAPI request and response

The frontend sends a JSON request:

```json
{ "query": "What documents do I need to apply?" }
```

Return a JSON response containing a non-empty `answer` string:

```json
{ "answer": "You may need ..."}
```

The FastAPI server must allow the frontend's origin through CORS. Set `VITE_API_URL` to the full endpoint URL; Vite reads this variable at startup, so restart the dev server after changing it.

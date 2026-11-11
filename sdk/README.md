# 🔌 SentinelLite Universal Telemetry SDK & Active Defense Agent

Map **any** website, web application, or API server to SentinelLite in minutes.

The SentinelLite SDK acts as an **active perimeter sensor**:
1. **Real-Time Log Tracking**: Streams incoming requests, response times, and failure patterns directly into SentinelLite without writing log files.
2. **Early Fraud & Intrusion Detection**: Inspects query parameters and payloads for SQL Injection, XSS, Path Traversal, and Brute Force before execution.
3. **Active Edge Blocking**: Automatically syncs with SentinelLite's dynamic blocklist (`/api/v1/defense/blocklist`) and immediately drops malicious IP traffic with `403 Forbidden`.

---

## 🐍 Python (FastAPI / Starlette / Flask)

### Installation
Copy `sentinellite_sdk.py` into your project directory or install `httpx starlette`.

### Usage
```python
from fastapi import FastAPI
from sentinellite_sdk import SentinelLiteMiddleware

app = FastAPI(title="My Corporate Web App")

# Add SentinelLite as first middleware
app.add_middleware(
    SentinelLiteMiddleware,
    sentinellite_url="http://localhost:8000/api/v1",  # Or your Render backend URL
    enable_active_blocking=True,
    server_asset_ip="10.0.0.10"
)

@app.get("/")
def home():
    return {"message": "Protected by SentinelLite AI-SOC"}
```

---

## 🟩 Node.js & Express

### Installation
Copy `sentinellite.js` into your Express project.

### Usage
```javascript
const express = require('express');
const { sentinelLite } = require('./sentinellite');

const app = express();

// Protect with SentinelLite
app.use(sentinelLite({
  apiUrl: 'http://localhost:8000/api/v1',  // Or your Render backend URL
  enableActiveBlocking: true,
  serverAssetIp: '10.0.0.10'
}));

app.get('/', (req, res) => {
  res.json({ status: 'Online', protected: true });
});

app.listen(3001, () => console.log('Web server running on port 3001'));
```


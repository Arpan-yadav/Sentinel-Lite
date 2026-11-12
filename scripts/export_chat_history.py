"""
Export clean human-readable Markdown transcript from Antigravity conversation log.
"""

import json
from pathlib import Path
import re

LOG_PATH = Path(r"C:\Users\Arpan yadav\.gemini\antigravity\brain\1ac22dc2-fe5a-4696-a5d9-11db4dc7bf1d\.system_generated\logs\transcript.jsonl")
OUT_PATH = Path("docs/FULL_CHAT_HISTORY.md")


def clean_content(text: str) -> str:
    if not text:
        return ""
    # Strip <USER_REQUEST> tags if present
    text = re.sub(r"<\/?USER_REQUEST>", "", text)
    # Strip <CONTEXT_SUMMARY> blocks if present
    text = re.sub(r"<CONTEXT_SUMMARY>[\s\S]*?<\/CONTEXT_SUMMARY>", "", text)
    # Strip <ADDITIONAL_METADATA> blocks
    text = re.sub(r"<ADDITIONAL_METADATA>[\s\S]*?<\/ADDITIONAL_METADATA>", "", text)
    # Strip <SYSTEM_MESSAGE> blocks
    text = re.sub(r"<SYSTEM_MESSAGE>[\s\S]*?<\/SYSTEM_MESSAGE>", "", text)
    # Strip <USER_SETTINGS_CHANGE> blocks
    text = re.sub(r"<USER_SETTINGS_CHANGE>[\s\S]*?<\/USER_SETTINGS_CHANGE>", "", text)
    return text.strip()


def export_transcript():
    if not LOG_PATH.exists():
        print(f"Log path does not exist: {LOG_PATH}")
        return

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    entries = []
    with open(LOG_PATH, "r", encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            try:
                data = json.loads(line)
            except Exception:
                continue

            msg_type = data.get("type")
            source = data.get("source")
            content = data.get("content", "")

            cleaned = clean_content(content)
            if not cleaned:
                continue

            if msg_type == "USER_INPUT" and source == "USER_EXPLICIT":
                entries.append({"role": "User", "text": cleaned, "time": data.get("created_at", "")})
            elif msg_type == "PLANNER_RESPONSE" and source == "MODEL":
                # Only keep substantial responses, not micro-thoughts or tool announcements
                if len(cleaned) > 100:
                    entries.append({"role": "Assistant", "text": cleaned, "time": data.get("created_at", "")})

    with open(OUT_PATH, "w", encoding="utf-8") as out:
        out.write("# SentinelLite — Complete Conversation & Development Transcript\n\n")
        out.write("> **Project:** SentinelLite Autonomous AI-SOC Platform\n")
        out.write("> **Repository:** [https://github.com/Arpan-yadav/Sentinel-Lite.git](https://github.com/Arpan-yadav/Sentinel-Lite.git)\n")
        out.write("> **Generated for:** Team Onboarding, Context Transfer & Architectural Audit\n\n")
        out.write("---\n\n")

        exchange_count = 1
        for e in entries:
            if e["role"] == "User":
                out.write(f"\n## 👤 Prompt #{exchange_count} — Team Request\n\n")
                out.write(f"```text\n{e['text']}\n```\n\n")
                exchange_count += 1
            else:
                out.write("### 🤖 SentinelLite AI Response & Implementation\n\n")
                out.write(f"{e['text']}\n\n")
                out.write("---\n")

    print(f"[✓] Exported {len(entries)} conversation exchanges to: {OUT_PATH} ({OUT_PATH.stat().st_size:,} bytes)")


if __name__ == "__main__":
    export_transcript()

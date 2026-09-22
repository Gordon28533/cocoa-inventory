"""Separate build-time vulnerabilities from ones that reach production."""
import json, subprocess, collections, sys, pathlib

REPO = pathlib.Path(__file__).resolve().parents[2]
raw = subprocess.run(["npm", "audit", "--json"], cwd=REPO, shell=True,
                     capture_output=True, text=True).stdout
data = json.loads(raw)
vulns = data.get("vulnerabilities", {})

print("counts:", dict(collections.Counter(v["severity"] for v in vulns.values())))
print(f"total advisories: {len(vulns)}\n")

# Packages the deployed backend actually loads at runtime.
RUNTIME_BACKEND = {
    "express", "pg", "bcrypt", "jsonwebtoken", "helmet", "cors",
    "dotenv", "express-rate-limit", "body-parser", "cookie-parser",
}
# Packages that only exist to build or serve the frontend in development.
BUILD_ONLY_ROOTS = {
    "react-scripts", "webpack-dev-server", "webpack", "jest", "babel",
    "@svgr/webpack", "resolve-url-loader", "css-select", "svgo",
    "postcss", "terser", "workbox-webpack-plugin", "ws", "websocket-driver",
    "sockjs", "http-proxy-middleware",
}

print("--- CRITICAL advisories ---")
crit = [(n, v) for n, v in vulns.items() if v["severity"] == "critical"]
for n, v in crit:
    eff = v.get("effects", [])
    print(f"  {n:<26} effects: {eff[:4]}")
if not crit:
    print("  none")

print("\n--- Does any BACKEND runtime dependency appear? ---")
hits = sorted(set(vulns) & RUNTIME_BACKEND)
print("  " + (", ".join(hits) if hits else
      "NONE — express, pg, bcrypt and jsonwebtoken are all clean"))

print("\n--- Are the advisories reachable in the deployed frontend bundle? ---")
reachable, buildonly = [], []
for n, v in vulns.items():
    chain = set()
    for via in v.get("via", []):
        chain.add(via if isinstance(via, str) else via.get("name", ""))
    chain |= set(v.get("effects", []))
    chain.add(n)
    (buildonly if chain & BUILD_ONLY_ROOTS else reachable).append(n)
print(f"  build/dev tooling only : {len(buildonly)}")
print(f"  not obviously build-only: {len(reachable)}")
if reachable:
    print("     " + ", ".join(sorted(reachable)[:24]))

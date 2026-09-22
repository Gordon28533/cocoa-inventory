"""
Cross-check the ACTUAL PROJECT, not the documents.

1. Every api.X(...) called anywhere in src/ must exist in src/utils/api.js.
2. Every endpoint path api.js requests must be served by a route in Backend/.
3. Every backend route should be reachable from the frontend (dead endpoints).
4. Unreachable branches in the approval state machine.
"""
import re, pathlib, collections

REPO = pathlib.Path(r"C:\Users\PC\cocoa-inventory")
SRC = REPO / "src"
BE = REPO / "Backend"

src_files = [p for p in SRC.rglob("*.js*") if ".test." not in p.name]
api_js = (SRC / "utils" / "api.js").read_text(encoding="utf-8", errors="ignore")

# ---------------------------------------------------------------- 1. methods
defined = set(re.findall(r"^\s{2}(\w+)\s*:", api_js, re.M))
called = collections.defaultdict(list)
for p in src_files:
    if p.name == "api.js":
        continue
    for m in re.finditer(r"\bapi\.(\w+)\s*\(", p.read_text(encoding="utf-8", errors="ignore")):
        called[m.group(1)].append(p.relative_to(REPO).as_posix())

print("=" * 74)
print("1.  api.X() CALLED BUT NOT DEFINED IN utils/api.js")
print("=" * 74)
missing = {k: v for k, v in called.items() if k not in defined}
if missing:
    for k, v in sorted(missing.items()):
        print(f"  MISSING  api.{k}()   called from: {', '.join(sorted(set(v)))}")
else:
    print("  none — every api.X() call resolves")

print()
print("=" * 74)
print("2.  DEFINED IN api.js BUT NEVER CALLED (dead client methods)")
print("=" * 74)
unused = sorted(defined - set(called))
print("  " + (", ".join(unused) if unused else "none"))

# ---------------------------------------------------------------- 3. endpoints
client_paths = set()
for m in re.finditer(r"apiRequest\(\s*[`\"']([^`\"'$]*)", api_js):
    path = m.group(1).split("?")[0].rstrip("/")
    if path:
        client_paths.add(path)

route_defs = set()
for p in BE.rglob("*.js"):
    if ".test." in p.name:
        continue
    for m in re.finditer(r'router\.(get|post|put|patch|delete)\(\s*["\']([^"\']+)["\']',
                         p.read_text(encoding="utf-8", errors="ignore")):
        route_defs.add((m.group(1).upper(), m.group(2)))

print()
print("=" * 74)
print("3.  BACKEND ROUTES DEFINED")
print("=" * 74)
for verb, path in sorted(route_defs, key=lambda x: x[1]):
    print(f"  {verb:<7} {path}")

def matches(client, routepath):
    pat = "^" + re.sub(r":\w+", r"[^/]+", routepath) + "$"
    return re.match(pat, client) is not None

print()
print("=" * 74)
print("4.  CLIENT PATHS WITH NO MATCHING BACKEND ROUTE")
print("=" * 74)
orphan = [c for c in sorted(client_paths)
          if not any(matches(c, r) for _, r in route_defs)]
if orphan:
    for c in orphan:
        print(f"  NO ROUTE  {c}")
else:
    print("  none — every client path template matches a route")
print(f"\n  (client path templates seen: {len(client_paths)})")

# ---------------------------------------------------------------- 5. dead branch
print()
print("=" * 74)
print("5.  APPROVAL STATE MACHINE — reachability")
print("=" * 74)
rr = (BE / "routes" / "requisitionRoutes.js").read_text(encoding="utf-8", errors="ignore")
block = rr[rr.find("const isHO"): rr.find("await updateRequisitionBatch")]
guards = re.findall(
    r'first\.status === "(\w+)"[^}]*?user\.role === "(\w+)"([^}]*?)(?=\}\s*else|\}\s*$)',
    block, re.S)
setters = dict(re.findall(r'nextStatus\s*=\s*"(\w+)"', block).__iter__().__class__ and [])
produced = set(re.findall(r'nextStatus\s*=\s*"(\w+)"', block))
consumed = set(re.findall(r'first\.status === "(\w+)"', block))
print(f"  statuses a transition can PRODUCE : {sorted(produced)}")
print(f"  statuses a transition CONSUMES    : {sorted(consumed)}")
print(f"  consumed but never produced here  : {sorted(consumed - produced - {'pending'})}")
for st, role, tail in guards:
    ho = "isHO" in tail and "!isHO" not in tail
    nho = "!isHO" in tail
    flag = "requires isHO" if ho else ("requires !isHO" if nho else "no HO test")
    print(f"     status={st:<24} role={role:<15} {flag}")

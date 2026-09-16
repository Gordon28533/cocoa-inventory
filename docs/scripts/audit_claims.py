import re
from docx import Document
DOC = r"C:\Users\PC\cocoa-inventory\CHAPTER ONE-FIVE (CORRECTED).docx"
d = Document(DOC)
ps = d.paragraphs

TERMS = ["Petri", "van der Aalst", "Business Rules Engine", "BRE",
         "47 ", "forty-seven", "version stamping", "Optimistic Concurrency",
         "OCC", "soundness", "Soundness", "reserved_qty", "available_qty",
         "ten concurrent", "Rostami"]

print("=== CLAIM SWEEP ===")
for term in TERMS:
    hits = [i for i, p in enumerate(ps) if term in p.text]
    print(f"\n--- '{term}': {len(hits)} paragraph(s) -> {hits}")

print("\n\n=== What heading precedes the reference entries at 758? ===")
for i in range(748, 780):
    st = ps[i].style.name
    tx = ps[i].text.strip()
    if tx or st.startswith("Heading"):
        print(f"  {i} [{st}] {tx[:88]}")

print("\n\n=== All in-text citations incl. lowercase particles ===")
txt = "\n".join(p.text for p in ps)
pat = re.compile(r"\(([A-Za-z][A-Za-z&.\-'’ ]+?,\s*(?:n\.d\.|\d{4}[a-z]?))\)")
cites = sorted(set(m.group(1).strip() for m in pat.finditer(txt)))
for c in cites:
    print("   ", c)

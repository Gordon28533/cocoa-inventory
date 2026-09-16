from docx import Document
DOC = r"C:\Users\PC\cocoa-inventory\CHAPTER ONE-FIVE (CORRECTED).docx"
d = Document(DOC)
ps = d.paragraphs
txt = "\n".join(p.text for p in ps)

print(f"paragraphs: {len(ps)}   images: {len(d.inline_shapes)}")

print("\n=== corrected passages ===")
for key in ["serialising contention on an inventory row",
            "Seventy automated test cases pass",
            "formal soundness verification was not itself",
            "(Stallings & Brown, 2018)."]:
    hit = [i for i, p in enumerate(ps) if key in p.text]
    print(f"\n[{key[:44]}…] -> {hit}")
    if hit:
        print("   " + ps[hit[0]].text[:300] + "…")

print("\n=== consistency: test-count mentions ===")
import re
for i, p in enumerate(ps):
    if re.search(r"\b(37|33|70|seventy|Seventy|sixty-six|47)\b", p.text) and "test" in p.text.lower():
        print(f"  [{i}] {p.text.strip()[:170]}")

print("\n=== headings order (last 12) ===")
hs = [(i, p.text.strip()) for i, p in enumerate(ps) if p.style.name == "Heading 1"]
for i, t in hs[-12:]:
    print(f"  {i}: {t}")

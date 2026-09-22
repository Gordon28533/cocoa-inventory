"""Map Appendix E figures to their embedded images, in document order."""
import pathlib
from docx import Document
from docx.shared import Emu

DOC = r"C:\Users\PC\cocoa-inventory\CHAPTER ONE-FIVE (CORRECTED).docx"
doc = Document(DOC)
ps = doc.paragraphs

start = next(i for i, p in enumerate(ps) if p.text.strip().startswith("APPENDIX E"))
try:
    end = next(i for i, p in enumerate(ps) if i > start
               and p.style.name == "Heading 1")
except StopIteration:
    end = len(ps)

print(f"Appendix E spans paragraphs {start}..{end}")
print()

DRAW = "{http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing}inline"
EMU_PER_IN = 914400

order = []
for i in range(start, end):
    p = ps[i]
    inlines = p._p.findall(f".//{DRAW}")
    for inl in inlines:
        ext = inl.find("{http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing}extent")
        cx = int(ext.get("cx")); cy = int(ext.get("cy"))
        order.append((i, cx, cy))
        print(f"  para {i:<5} image  {cx/EMU_PER_IN:.2f} x {cy/EMU_PER_IN:.2f} in"
              f"   (aspect {cx/cy:.3f})")
    t = p.text.strip()
    if t.startswith("Figure E"):
        print(f"  para {i:<5} CAPTION: {t[:90]}")

print(f"\ntotal images inside Appendix E: {len(order)}")

sect = doc.sections[0]
text_w = (sect.page_width - sect.left_margin - sect.right_margin)
text_h = (sect.page_height - sect.top_margin - sect.bottom_margin)
print(f"page text area: {text_w/EMU_PER_IN:.2f} x {text_h/EMU_PER_IN:.2f} in")

print("\nnew captures available:")
d = pathlib.Path(r"C:\Users\PC\cocoa-inventory\docs\screenshots")
for f in sorted(d.glob("*.png")):
    print("   ", f.name)

import os, shutil, win32com.client

SRC = r"C:\Users\PC\cocoa-inventory\deck\CMC Inventory System - Defence (GCTU Template).pptx"
OUT = r"C:\Users\PC\cocoa-inventory\deck\render_gctu"

shutil.rmtree(OUT, ignore_errors=True)
os.makedirs(OUT, exist_ok=True)

app = win32com.client.Dispatch("PowerPoint.Application")
pres = app.Presentations.Open(SRC, WithWindow=False)
pres.SaveCopyAs(os.path.join(OUT, "slide.png"), 18)  # ppSaveAsPNG
pres.Close()
app.Quit()

for root, _, files in os.walk(OUT):
    for f in sorted(files):
        print(os.path.join(root, f))

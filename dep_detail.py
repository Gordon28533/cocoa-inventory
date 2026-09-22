import json,subprocess
raw=subprocess.run(['npm','audit','--json'],shell=True,capture_output=True,text=True).stdout
v=json.load(raw and __import__('io').StringIO(raw)).get('vulnerabilities',{})
for name in ['express','bcrypt','body-parser','tar','shell-quote']:
    d=v.get(name)
    if not d: continue
    print(f'--- {name} ---')
    print('  severity :', d['severity'])
    print('  range    :', d.get('range'))
    print('  installed:', d.get('nodes'))
    print('  fixAvail :', d.get('fixAvailable'))
    for via in d.get('via',[]):
        if isinstance(via,dict):
            print('   via:', via.get('title'), '|', via.get('url'))
        else:
            print('   via:', via)
    print()

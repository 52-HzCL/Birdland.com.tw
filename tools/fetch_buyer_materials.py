"""Monthly World Bank metals, stdlib only. Failure preserves the last valid series.
Keep this independent of AI-generated outlook blocks and commercial tool prices.
"""
import argparse, datetime as dt, io, json, math, pathlib, re, urllib.parse, urllib.request, zipfile
import xml.etree.ElementTree as ET

ROOT=pathlib.Path(__file__).resolve().parents[1]
PAGE='https://www.worldbank.org/en/research/commodity-markets'
NS={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

def download(url):
    if urllib.parse.urlparse(url).hostname not in ('www.worldbank.org','thedocs.worldbank.org'):
        raise ValueError('Unexpected source host')
    with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Birdland public commodity reference'}),timeout=20) as response:
        data=response.read(8*1024*1024+1)
    if len(data)>8*1024*1024:raise ValueError('Source exceeds size limit')
    return data

def parse(data,today=None):
    today=today or dt.date.today()
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        if sum(x.file_size for x in archive.infolist())>40*1024*1024:raise ValueError('Workbook exceeds size limit')
        shared=[''.join(x.itertext()) for x in ET.fromstring(archive.read('xl/sharedStrings.xml')).findall('m:si',NS)]
        book=ET.fromstring(archive.read('xl/workbook.xml'))
        sheet=next(x for x in book.findall('m:sheets/m:sheet',NS) if x.get('name')=='Monthly Prices')
        relid=sheet.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
        rels=ET.fromstring(archive.read('xl/_rels/workbook.xml.rels'))
        target=next(x.get('Target') for x in rels if x.get('Id')==relid)
        target=target.lstrip('/') if target.startswith('/') else 'xl/'+target
        rows=[]
        for row in ET.fromstring(archive.read(target)).findall('.//m:row',NS):
            values={}
            for cell in row:
                value=cell.find('m:v',NS)
                if value is None:continue
                values[re.sub(r'\d','',cell.get('r'))]=shared[int(value.text)] if cell.get('t')=='s' else value.text
            rows.append(values)
    header=next(row for row in rows if 'Aluminum' in row.values() and 'Nickel' in row.values())
    columns={name:next(k for k,v in header.items() if v==name) for name in ['Aluminum','Nickel']}
    units=rows[rows.index(header)+1]
    if any(units.get(column)!='($/mt)' for column in columns.values()):raise ValueError('Unexpected metal units')
    records=sorted([row for row in rows if re.fullmatch(r'\d{4}M\d{2}',row.get('A',''))],key=lambda row:row['A'])
    records=records[-12:]
    if len(records)!=12:raise ValueError('Insufficient monthly observations')
    dates=[row['A'].replace('M','-') for row in records]
    month_ids=[int(s[:4])*12+int(s[-2:]) for s in dates]
    if any(b-a!=1 for a,b in zip(month_ids,month_ids[1:])):raise ValueError('Monthly observation gap')
    if dates[-1]>today.strftime('%Y-%m'):raise ValueError('Future monthly observation')
    series=[]
    for name,column in columns.items():
        values=[float(row[column]) for row in records]
        if any(not math.isfinite(v) or v<=0 for v in values):raise ValueError('Invalid metal observation')
        series.append({'id':name.lower(),'label':name,'unit':'US$/metric tonne','points':[{'month':month,'value':round(value,4)} for month,value in zip(dates,values)]})
    return series

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--workbook',type=pathlib.Path);parser.add_argument('--output',type=pathlib.Path,default=ROOT/'data/buyer-materials.json');args=parser.parse_args()
    try:
        if args.workbook:data=args.workbook.read_bytes();source=PAGE
        else:
            html=download(PAGE).decode('utf-8')
            source=next(url for url in re.findall(r'href=["\']([^"\']+)["\']',html) if url.endswith('/CMO-Historical-Data-Monthly.xlsx'))
            source=urllib.parse.urljoin(PAGE,source);data=download(source)
        series=parse(data)
        result={'provider':'World Bank Commodity Price Data (Pink Sheet)','source_url':PAGE,'download_url':source,'cadence':'monthly','checked_at':dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds'),'observed_month':series[0]['points'][-1]['month'],'series':series}
        # Do not replace a newer observation with an older workbook from a stale mirror.
        if args.output.exists():
            try:old=json.loads(args.output.read_text(encoding='utf-8'))
            except (ValueError,OSError):old={}
            if old.get('observed_month','')>result['observed_month']:raise ValueError('Source would roll observations backwards')
        args.output.parent.mkdir(parents=True,exist_ok=True)
        args.output.write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
        print('Verified monthly metals through',result['observed_month'])
    except Exception as error:
        # A failed attempt must not advance the successful fetch/observation dates.
        print('Monthly metals unchanged:',type(error).__name__)

if __name__=='__main__':main()

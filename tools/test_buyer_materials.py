import datetime as dt, io, pathlib, sys, unittest, zipfile
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from fetch_buyer_materials import parse

def workbook(gap=False,future=False,unit='($/mt)',bad=False):
    strings=['Aluminum','Nickel',unit]
    dates=[f'{2025+(8+i)//12}M{(8+i)%12+1:02}' for i in range(12)]
    if gap:dates[5]='2026M03'
    if future:dates[-1]='2027M01'
    cells=['<row><c r="B5" t="s"><v>0</v></c><c r="Q5" t="s"><v>1</v></c></row>','<row><c r="B6" t="s"><v>2</v></c><c r="Q6" t="s"><v>2</v></c></row>']
    for i,date in enumerate(dates):
        strings.append(date);r=i+7;value='NaN' if bad and i==11 else str(100+i)
        cells.append(f'<row><c r="A{r}" t="s"><v>{len(strings)-1}</v></c><c r="B{r}"><v>{value}</v></c><c r="Q{r}"><v>{200+i}</v></c></row>')
    out=io.BytesIO();n='http://schemas.openxmlformats.org/spreadsheetml/2006/main'
    with zipfile.ZipFile(out,'w') as z:
        z.writestr('xl/workbook.xml',f'<workbook xmlns="{n}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Monthly Prices" r:id="prices"/></sheets></workbook>')
        z.writestr('xl/_rels/workbook.xml.rels','<Relationships><Relationship Id="prices" Target="worksheets/reordered.xml"/></Relationships>')
        z.writestr('xl/sharedStrings.xml',f'<sst xmlns="{n}">'+''.join('<si><t>'+s+'</t></si>' for s in strings)+'</sst>')
        z.writestr('xl/worksheets/reordered.xml',f'<worksheet xmlns="{n}"><sheetData>'+''.join(cells)+'</sheetData></worksheet>')
    return out.getvalue()

class Observations(unittest.TestCase):
    def test_headers_and_relationships_not_column_numbers(self):
        result=parse(workbook(),dt.date(2026,10,2))
        self.assertEqual(result[0]['points'][-1],{'month':'2026-08','value':111})
        self.assertEqual(result[1]['points'][-1]['value'],211)
    def test_invalid_observations_rejected(self):
        for kwargs in [dict(gap=True),dict(future=True),dict(unit='cents/kg'),dict(bad=True)]:
            with self.subTest(kwargs=kwargs),self.assertRaises(ValueError):parse(workbook(**kwargs),dt.date(2026,10,2))
    def test_non_workbook_rejected(self):
        with self.assertRaises(zipfile.BadZipFile):parse(b'<html>Unavailable</html>')

if __name__=='__main__':unittest.main()

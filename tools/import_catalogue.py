"""Reproduce reviewed catalogue crops. Developer-only: requires PyMuPDF.

PDFs remain outside the repository. Supply the two files as china.pdf and
taiwan.pdf in --source-dir; the manifest validates their hashes before reading.
Only product crops are exported, never whole private catalogues/share links.
"""
import argparse, hashlib, json, pathlib
import pymupdf

parser = argparse.ArgumentParser()
parser.add_argument('--source-dir', type=pathlib.Path, required=True)
parser.add_argument('--output-dir', type=pathlib.Path, required=True)
args = parser.parse_args()
root = pathlib.Path(__file__).resolve().parents[1]
manifest = json.loads((root/'data/catalogue-manifest.json').read_text(encoding='utf-8'))
docs = {}
for source in manifest['sources']:
    file = args.source_dir / (source['id']+'.pdf')
    if hashlib.sha256(file.read_bytes()).hexdigest() != source['sha256']:
        raise ValueError('Source hash mismatch: '+source['id'])
    docs[source['id']] = pymupdf.open(file)
args.output_dir.mkdir(parents=True, exist_ok=True)
for product in manifest['products']:
    if product.get('image_mode') == 'embedded':
        doc = docs[product['source']]
        pix = pymupdf.Pixmap(doc,product['image_xref'])
        smask = next(im[1] for im in doc[product['page']-1].get_images() if im[0]==product['image_xref'])
        if smask:
            mask = pymupdf.Pixmap(doc,smask)
            if (mask.width,mask.height) != (pix.width,pix.height):
                mask = pymupdf.Pixmap(mask,pix.width,pix.height,None)
            pix = pymupdf.Pixmap(pix,mask)
        pix.save(args.output_dir/(product['id']+'.png'))
        continue
    if product.get('image_mode') == 'embedded-crop':
        doc = docs[product['source']]
        image = doc.extract_image(product['image_xref'])
        scratch = pymupdf.open()
        page = scratch.new_page(width=image['width'],height=image['height'])
        page.insert_image(page.rect,stream=image['image'])
        x0,y0,x1,y1=product['image_crop']
        page.get_pixmap(clip=pymupdf.Rect(x0*page.rect.width,y0*page.rect.height,x1*page.rect.width,y1*page.rect.height)).save(args.output_dir/(product['id']+'.png'))
        continue
    page = docs[product['source']][product['page']-1]
    x0,y0,x1,y1 = product['crop']
    rect = pymupdf.Rect(x0*page.rect.width,y0*page.rect.height,x1*page.rect.width,y1*page.rect.height)
    page.get_pixmap(matrix=pymupdf.Matrix(3,3),clip=rect,alpha=False).save(args.output_dir/(product['id']+'.png'))
print('Extracted',len(manifest['products']),'reviewed product crops')

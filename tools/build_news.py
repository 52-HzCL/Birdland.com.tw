#!/usr/bin/env python3
"""Regenerate news.html (Client Desk) and partner.html (Partner Desk) from outlook-data.json."""
import os
HERE=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOOLS=os.path.dirname(os.path.abspath(__file__))
data=open(os.path.join(HERE,"outlook-data.json"),encoding="utf-8").read()
pairs=[("news_template.html","news.html"),("partner_template.html","partner.html")]
for tpl,out in pairs:
    tp=os.path.join(TOOLS,tpl)
    if not os.path.exists(tp): continue
    html=open(tp,encoding="utf-8").read().replace("__DATA__",data)
    open(os.path.join(HERE,out),"w",encoding="utf-8").write(html)
    print(out,"regenerated (",len(data),"bytes data )")

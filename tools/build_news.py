#!/usr/bin/env python3
"""Regenerate news.html (Client Desk) and partner.html (Partner Desk) from outlook-data.json."""
import os
HERE=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TD=os.path.dirname(os.path.abspath(__file__))
data=open(os.path.join(HERE,"outlook-data.json"),encoding="utf-8").read()
def build(tpl,out):
    p=os.path.join(TD,tpl)
    if not os.path.exists(p):return
    s=open(p,encoding="utf-8").read().replace("__DATA__",data)
    open(os.path.join(HERE,out),"w",encoding="utf-8").write(s)
    print("built",out,len(s),"bytes")
build("news_template.html","news.html")
build("partner_template.html","partner.html")
build("team_template.html","team.html")

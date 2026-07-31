#!/usr/bin/env python3
"""Regenerate Overview, Buyer Desk, Cost Desk, Team, and Daily Supply News pages from outlook-data.json."""
import os, subprocess, sys
HERE=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TD=os.path.dirname(os.path.abspath(__file__))
data=open(os.path.join(HERE,"outlook-data.json"),encoding="utf-8",newline="").read()
def build(tpl,out,extra=None):
    p=os.path.join(TD,tpl)
    if not os.path.exists(p):return
    s=open(p,encoding="utf-8",newline="").read().replace("__DATA__",data)
    for k,v in (extra or {}).items():
        s=s.replace(k,v)
    open(os.path.join(HERE,out),"w",encoding="utf-8",newline="").write(s)
    print("built",out,len(s),"bytes")
build("news_template.html","news.html")
# The Buyer Desk and the Cost Desk are the same template rendered twice: the
# calculators share the desk's helpers, router and rail, so each page drops the
# half that is not its own at load rather than the two being split into separate
# templates. Every output must substitute __DESKMODE__ or the token ships.
build("partner_template.html","partner.html",{"__DESKMODE__":"buyer"})
build("partner_template.html","cost-desk.html",{"__DESKMODE__":"cost"})
build("team_template.html","team.html")
build("executive_template.html","executive.html")
feeds=os.path.join(TD,"build_feeds.py")
if os.path.exists(feeds):
    result=subprocess.run([sys.executable,feeds],cwd=HERE)
    if result.returncode:
        raise SystemExit(result.returncode)

#!/usr/bin/env python3
"""Regenerate Data Desk, B2B BUY, Team, and Daily Supply News pages from outlook-data.json."""
import os, subprocess, sys
HERE=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TD=os.path.dirname(os.path.abspath(__file__))
data=open(os.path.join(HERE,"outlook-data.json"),encoding="utf-8",newline="").read()
def build(tpl,out):
    p=os.path.join(TD,tpl)
    if not os.path.exists(p):return
    s=open(p,encoding="utf-8",newline="").read().replace("__DATA__",data)
    open(os.path.join(HERE,out),"w",encoding="utf-8",newline="").write(s)
    print("built",out,len(s),"bytes")
build("news_template.html","news.html")
build("partner_template.html","partner.html")
build("team_template.html","team.html")
build("executive_template.html","executive.html")
feeds=os.path.join(TD,"build_feeds.py")
if os.path.exists(feeds):
    result=subprocess.run([sys.executable,feeds],cwd=HERE)
    if result.returncode:
        raise SystemExit(result.returncode)

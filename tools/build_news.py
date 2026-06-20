#!/usr/bin/env python3
"""Regenerate news.html from outlook-data.json. Run after updating the data file."""
import json,os
HERE=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
data=open(os.path.join(HERE,"outlook-data.json"),encoding="utf-8").read()
TPL=open(os.path.join(os.path.dirname(os.path.abspath(__file__)),"news_template.html"),encoding="utf-8").read()
open(os.path.join(HERE,"news.html"),"w",encoding="utf-8").write(TPL.replace("__DATA__",data))
print("news.html regenerated (",len(data),"bytes data )")

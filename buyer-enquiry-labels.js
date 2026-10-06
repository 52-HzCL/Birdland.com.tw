/* Existing ten-language site copy remains authoritative. Supplemental technical labels fall back to English. */
(function(){
const ids=['en','nl','de','fr','es','pt-br','pl','it','ja','zh-tw'];
const rows={
'Customise':['Customise','Aanpassen','Anpassen','Personnaliser','Personalizar','Personalizar','Dostosuj','Personalizza','カスタマイズ','客製此產品'],
'Ask Birdland':['Ask Birdland','Vraag Birdland','Birdland fragen','Demander à Birdland','Consultar a Birdland','Consultar a Birdland','Zapytaj Birdland','Chiedi a Birdland','Birdlandに相談','請 Birdland 建議'],
'To confirm':['To confirm','Te bevestigen','Zu bestätigen','À confirmer','Por confirmar','A confirmar','Do potwierdzenia','Da confermare','確認待ち','待確認'],
'Your RFQ list':['Your RFQ list','Uw aanvraaglijst','Ihre Anfrageliste','Votre liste de demandes','Su lista de consultas','Sua lista de consultas','Lista zapytania','Lista delle richieste','お問い合わせ一覧','詢價清單'],
'Add standard':['Add standard','Standaard toevoegen','Standard hinzufügen','Ajouter la référence','Añadir referencia','Adicionar referência','Dodaj standard','Aggiungi riferimento','標準品を追加','加入標準參考品'],
'Copy config':['Copy config','Configuratie kopiëren','Konfiguration kopieren','Copier la configuration','Copiar configuración','Copiar configuração','Kopiuj konfigurację','Copia configurazione','構成を複製','複製配置'],
'Cancel edit':['Cancel edit','Bewerken annuleren','Bearbeitung abbrechen','Annuler la modification','Cancelar edición','Cancelar edição','Anuluj edycję','Annulla modifica','編集を取り消す','取消編輯'],
'Resume draft':['Resume draft','Concept hervatten','Entwurf fortsetzen','Reprendre le brouillon','Retomar borrador','Retomar rascunho','Wznów szkic','Riprendi bozza','下書きを再開','繼續草稿'],
'Optional logistics requirements':['Optional logistics requirements','Optionele logistieke wensen','Optionale Logistikanforderungen','Besoins logistiques facultatifs','Necesidades logísticas opcionales','Requisitos logísticos opcionais','Opcjonalne wymagania logistyczne','Requisiti logistici facoltativi','任意の物流要件','可選物流需求'],
'Pallet preference':['Pallet preference','Palletvoorkeur','Palettenbedarf','Besoin de palette','Preferencia de palé','Preferência de palete','Wymagania paletowe','Preferenza pallet','パレットの希望','棧板需求'],
'Expected container':['Expected container','Verwachte container','Geplanter Container','Conteneur envisagé','Contenedor previsto','Contêiner previsto','Planowany kontener','Container previsto','予定コンテナ','預計櫃型'],
'Help consolidate a full container':['Help consolidate a full container','Hulp bij volle container','Hilfe zur Containerbündelung','Aide au regroupement d’un conteneur','Ayuda para completar contenedor','Ajuda para consolidar contêiner','Pomoc w kompletowaniu kontenera','Aiuto a completare un container','コンテナ混載の相談','協助湊整櫃'],
'Yes, please advise':['Yes, please advise','Ja, graag advies','Ja, bitte beraten','Oui, merci de conseiller','Sí, solicito asesoría','Sim, solicito orientação','Tak, proszę o poradę','Sì, chiedo consiglio','はい、提案を希望','是，請協助建議'],
'Review & prepare RFQ →':['Review & prepare RFQ →','Aanvraag bekijken →','Anfrage prüfen →','Vérifier la demande →','Revisar consulta →','Revisar consulta →','Sprawdź zapytanie →','Rivedi richiesta →','お問い合わせを確認 →','檢查並整理詢價 →'],
'Browse · keep draft':['Browse · keep draft','Bladeren · concept bewaren','Katalog · Entwurf behalten','Parcourir · garder le brouillon','Explorar · guardar borrador','Explorar · manter rascunho','Katalog · zachowaj szkic','Sfoglia · conserva bozza','下書きを保持して閲覧','回目錄，保留草稿'],
'Add this configuration':['Add this configuration','Configuratie toevoegen','Konfiguration hinzufügen','Ajouter cette configuration','Añadir configuración','Adicionar configuração','Dodaj konfigurację','Aggiungi configurazione','この構成を追加','加入此配置'],
'Save revised configuration':['Save revised configuration','Wijzigingen opslaan','Änderungen speichern','Enregistrer les modifications','Guardar cambios','Salvar alterações','Zapisz zmiany','Salva modifiche','変更を保存','儲存配置修訂']
};
const shared={'Customise':'custom','Close':'brClose','Edit':'brEdit','Remove':'catRemove','Compare':'snCompare','Copy RFQ text':'brCopy','Copy draft text':'brCopy','Download RFQ .txt':'brDownload','Contact routing':'contact','Clear list':'catClear','Ask Birdland':'snRecommend','To confirm':'snUndecided'};
const labels={};for(const l of window.BL_SITE.languages){const map=labels[l.id]={};for(const [word,key]of Object.entries(shared))if(l.text[key])map[word]=l.text[key];for(const [word,values]of Object.entries(rows))map[word]=values[ids.indexOf(l.id)]||word;}
Object.assign(labels['zh-tw'],{
'1 · Quantity & purpose':'1 · 數量與用途','2 · Components':'2 · 部位需求','3 · Packaging':'3 · 包裝','4 · Sample & dates':'4 · 樣品與日期','5 · Review':'5 · 檢查',
'Buyer priority':'採購優先考量','Rust resistance':'耐鏽蝕','Durability':'耐用性','Appearance':'外觀','Three quantities · three different meanings':'訂單量、年量與樣品量分開','This order request':'本次訂單需求量','Order unit':'訂單單位','Annual planning volume':'年度規劃量','Forecast year / period':'預測年度／期間','Sample request quantity':'樣品需求量','Sample unit':'樣品單位','Assembly condition':'組裝狀態','Fully assembled':'完整組裝','Knock-down':'拆裝出貨','Mixed / discuss':'混合／討論','Ask Birdland':'請 Birdland 建議','To confirm':'待確認','Why separate?':'為何分開？','Assembly ≠ packaging':'組裝與包裝分開',
'Destination market · optional':'目標市場（選填）','Reference files · optional':'參考附件（選填）','Reference attachments':'參考附件','Your component name / drawing reference':'部位名稱／圖面標記（選填）','Working part (if applicable)':'工作部位（如適用）','Handle / grip (if applicable)':'手柄／握把（如適用）','Connection / joint (if applicable)':'連接部位（如適用）','Material family':'材料類別','Requested grade / designation (optional)':'希望採用的牌號（選填）','Hardness target · not a verified result':'硬度目標，並非已驗證結果','Hardness scale':'硬度標度','Target minimum':'目標下限','Target maximum':'目標上限','Which scale?':'如何選標度？','Processing / finish request':'加工／表面處理需求','Information basis':'資料來源狀態','Reference request':'討論需求','Buyer specification supplied':'買家已提供規格，仍待評估','Carbon steel':'碳鋼','Stainless family':'不鏽鋼類','Aluminium alloy':'鋁合金','Polymer grip':'塑膠握把材料','Heat treatment':'熱處理','Surface finish':'表面處理','Forming / machining':'成形／機械加工','Injection / overmoulding':'射出／包覆成形',
'Material & process guide':'材料與加工說明','Compare two material directions':'比較兩種材料方向','Material market background':'原料市場背景','Check compatibility / missing data':'檢查配合與缺資料','Size / dimension reference (optional)':'尺寸參考（選填）','Other requirements (optional)':'其他需求（選填）','Catalogue evidence':'目錄資料出處','Undo':'復原','Standard':'標準參考','Custom':'客製需求','Keep existing':'沿用既有，待確認','Specify':'我來指定','Single-item format':'單品包裝形式','Packaging material':'包裝材料','Artwork / printing':'印刷／稿件','Barcode / EAN requirement':'條碼／EAN 需求','Retail display':'零售展示','Inner box / set':'內箱／套組','Shipping carton':'出貨外箱','Pallet arrangement':'包裝棧板安排','Supply responsibility':'包裝供料責任','Sample purpose':'樣品用途','Sample quantity (from purpose tab)':'樣品量（與第一步共用）','Requested sample arrival':'希望收到樣品的日期','Requested shipment / departure':'希望出貨日期','Requested arrival / receipt':'希望收貨日期','Planned market launch':'預計上市日期','Evaluation / decision deadline':'評選／決策期限','Email draft preview':'郵件內容預覽','Purpose / reference text':'用途／構想說明（選填）','Reference URL · optional':'參考連結（選填）','Reference images / drawings · optional':'參考圖片／圖面（選填）','Continue with these open requirements':'帶入需求，繼續配置','Required':'需要','Not required':'不需要','Not needed':'不需要','Not decided':'尚未決定'
});
const notes={
'示意需求，並非 SKU 已驗證的內部規格。未知可以留待確認。':'Buyer requirements, not confirmed internal SKU specifications. Unknowns can remain open.',
'不是完整 BOM。每一部件的材料、牌號、硬度與加工需求各自保存。':'Optional component requirements are stored separately. These fields do not define a complete SKU BOM.',
'例如畫面中的數值只代表買家希望討論的目標，沒有宣稱此 SKU 已達成。':'Hardness values are buyer targets for discussion, not verified SKU results.',
'組裝狀態不會自動決定單品包裝或外箱；兩者分開記錄。':'Assembly does not decide unit packaging or shipping cartons. Record them independently.',
'樣品用途不是量產驗收；樣品到貨也不是整批產品到貨。':'Sample use and arrival are separate from production approval and bulk delivery.',
'產品在 Catalog 選一次。Standard 與 Custom 可各自成列；部位配置仍待評估。':'Standard references and custom configurations can be separate lines. Component requirements remain subject to review.',
'檔案留在本機；文字 RFQ 只列檔名，不包含圖片。':'Files remain on your device. RFQ text lists filenames only, without attachment contents.',
'實際形式、尺寸、包裝數量、印刷與供料都待確認；示意圖不是已驗證的包裝工程圖。':'Packaging form, dimensions, counts, printing and supply require confirmation. The scope diagram is not a validated packaging drawing.',
'未決定的項目不會阻擋 RFQ；不強迫猜規格，也不把需求寫成已驗證。':'Open questions can be included in the RFQ. Buyer requests are not engineering approval.',
'參考文字、網址、圖片皆選填；不是另一個目錄，也不會憑空生成 BOM。':'Text, links and images are optional references for a new concept. No internal BOM is assumed.'
};
for(const id of ids)if(id!=='zh-tw')Object.assign(labels[id],notes);
labels['zh-tw']['示意需求，並非 SKU 已驗證的內部規格。未知可以留待確認。']='買家需求，並非已確認的型號內部規格。未知項目可留待討論。';
labels['zh-tw']["Packaging form, dimensions, counts, printing and supply need confirmation. This is not a validated packaging drawing."]="任何形式、尺寸、包裝數量、印刷與供料都需確認；示意圖不是已驗證的包裝工程圖。";
labels['zh-tw']["Local preview only. No mailbox draft is created and no email is sent. Attach drawings separately."]="原型只顯示草稿；沒有建立信箱草稿，也不寄信。圖片與工程圖請另附原檔。";
labels['zh-tw']["Text, links and images are optional concept references. No BOM is assumed."]="參考文字、網址、圖片全部選填；不是另一個入口，也不會憑空生成 BOM。";
labels['zh-tw']["Standard references and custom configurations remain separate; component requirements need review."]="型號在 Catalog 選一次。Standard 與 Custom 可各自成行；產品配置仍待評估。";
labels['zh-tw']["Open requirements do not block an RFQ. Do not guess specifications or treat requests as verified."]="未決定項目會明確進 RFQ；不強迫猜規格，也不把需求標成已驗證。";
labels['zh-tw']["Files stay on this device. RFQ text lists names only; no file is uploaded."]="檔案留在本機；文字 RFQ 只列檔名，不包含圖稿。";
labels['zh-tw']["Order quantity has no confirmed unit; annual and sample quantities are separate."]="訂單量尚未確認單位；年量與樣品量分開記錄。";
labels['zh-tw']["Minimum target exceeds maximum. This is an input check, not measured hardness."]="硬度目標下限高於上限；這是輸入檢查，不是量測硬度。";
labels['zh-tw']["Choose HRC, HB or Shore A, or request advice."]="請選 HRC、HB 或 Shore A 標度，或留待建議。";
labels['zh-tw']["Material direction selected; processing still needs advice or review."]="已選材料方向，加工仍需建議或評估。";
labels['zh-tw']["Complete the matching size, standard/counterpart and unit, or leave them pending. No compatibility verdict is made."]="請補配合尺寸、標準／對應件與單位，或留待確認；此處不判定相容性。";
labels['zh-tw']["Receipt preference is open for discussion and does not block an enquiry."]="收貨偏好尚待討論，不阻擋詢價。";
labels['zh-tw']["Order, annual plan and sample"]="訂單、年量與樣品量";
labels['zh-tw']["These quantities serve different purposes and are never added together as an order."]="三種數量用途不同，不會相加當作訂單量。";
labels['zh-tw']["This order"]="本次訂單";
labels['zh-tw']["Requested buying quantity and its pcs/sets unit."]="本次希望採購的數量，以及件／組單位。";
labels['zh-tw']["Annual plan"]="年度規劃";
labels['zh-tw']["Optional forecast for a stated period, not a committed order."]="指定年度或期間的選填預測，並非已下訂單。";
labels['zh-tw']["Sample request"]="樣品需求";
labels['zh-tw']["Separate quantity, unit, purpose and arrival date."]="獨立記錄數量、單位、用途與到樣日期。";
labels['zh-tw']["Assembly and packaging are separate"]="組裝與包裝分開";
labels['zh-tw']["Fully assembled or knock-down describes the delivery condition of the product. Carton, sleeve and shipping packs describe protection and presentation; each needs its own confirmation."]="完整組裝或拆裝出貨描述產品交付狀態；紙盒、套卡與運輸包裝描述保護和展示，各自確認。";
labels['zh-tw']["Material and process guide"]="材料與加工說明";
labels['zh-tw']["Material family is a discussion direction. Grade, properties and processing require review; choosing a family does not verify suitability for a catalogue SKU."]="材料類別是討論方向；牌號、性能與加工都待評估，選類別不代表已驗證適用於此型號。";
labels['zh-tw']["Changing a component material clears only that component’s processing preference. Other component targets remain unchanged."]="更改材料只清除該部位的加工偏好，其他部位目標保持原樣。";
labels['zh-tw']["Manufacturing: materials chapter ↗"]="Manufacturing：材料章節 ↗";
labels['zh-tw']["Manufacturing: heat-treatment chapter ↗"]="Manufacturing：熱處理章節 ↗";
labels['zh-tw']["Hardness target and scale"]="硬度目標與標度";
labels['zh-tw']["HRC, HB and Shore A are different scales and cannot be used interchangeably. Enter a desired range, or leave it for advice."]="HRC、HB 與 Shore A 是不同標度，不能混用；可填希望討論的範圍，或留待建議。";
labels['zh-tw']["Buyer specification supplied records the buyer’s information basis. It does not confirm measured hardness, material compatibility or production capability."]="「買家已提供規格」記錄資料來源，並不確認量測硬度、材料相容性或量產可行性。";
labels['zh-tw']["Two general material directions"]="兩種一般材料方向";
labels['zh-tw']["This is a predefined carbon-steel versus stainless-family discussion guide, not a validated choice list for this SKU or a comparison of every material family."]="這是預設的碳鋼與不鏽鋼類討論指南，並非此型號已驗證的選項，也不是所有材料類別的比較。";
labels['zh-tw']["Review point"]="確認重點";
labels['zh-tw']["Carbon steel"]="碳鋼";
labels['zh-tw']["Stainless family"]="不鏽鋼類";
labels['zh-tw']["To review"]="待評估";
labels['zh-tw']["To review"]="待評估";
labels['zh-tw']["No price difference, performance ranking or SKU feasibility is calculated."]="不計算價差、性能排名或型號製造可行性。";
labels['zh-tw']["Packaging scope diagram"]="包裝範圍示意";
labels['zh-tw']["This explains scope, not a verified structural drawing. Each configuration records packaging independently; keep existing packaging still requires confirmation."]="此圖解釋範圍，不是已驗證的包裝結構圖；每個配置獨立記錄，沿用既有包裝也仍待確認。";
labels['zh-tw']["Dates answer different questions"]="各日期用途不同";
labels['zh-tw']["All dates are buyer preferences; none is a Birdland delivery promise."]="全部日期皆為買家偏好，不是 Birdland 交期承諾。";
labels['zh-tw']["Missing information and compatibility"]="缺資料與配合確認";
labels['zh-tw']["A complete form is not engineering approval. Counterparts, dimensions and standards require review; no compatibility verdict is inferred."]="表單完整不代表工程確認；配合件、尺寸與標準仍待評估，不自動判定相容性。";
labels['zh-tw']["Knowledge without losing your draft"]="保留草稿，另看市場與供應";
labels['zh-tw']["Import market statistics and their actual periods."]="查看進口市場統計及實際期間。";
labels['zh-tw']["Open market comparison ↗"]="另開市場比較 ↗";
labels['zh-tw']["Dated sourcing, transport and event context."]="查看有日期的供應、運輸與事件背景。";
labels['zh-tw']["Open supply updates ↗"]="另開供應更新 ↗";
labels['zh-tw']["Return to this tab to continue the same configuration."]="回到此分頁即可繼續同一個配置。";
labels['zh-tw']["Component targets and information status"]="部位目標與資料狀態";
labels['zh-tw']["Optional component"]="選填部位";
labels['zh-tw']["Material / grade request"]="材料／牌號需求";
labels['zh-tw']["Hardness target"]="硬度目標";
labels['zh-tw']["Process / basis"]="加工／資料來源";
labels['zh-tw']["Working part"]="工作部位";
labels['zh-tw']["Handle / grip"]="手柄／握把";
labels['zh-tw']["Connection / joint"]="連接部位";
labels['zh-tw']["Engineering pending"]="待工程評估";
labels['zh-tw']["Three optional discussion references, not a complete or verified SKU parts list. Attach a drawing/BOM separately for a complete specification."]="三個選填討論部位，不是完整或已驗證的型號零件表；完整規格請另外附圖面／BOM。";
labels['zh-tw']["beforeend"]="<p role=\"status\">Browser storage unavailable. This draft lasts only until you leave or refresh; download before leaving.</p>";
window.BL_ENQUIRY_LABELS=labels;
Object.assign(labels['zh-tw'],{
'Next → Components':'下一步 → 部位需求','Next → Packaging':'下一步 → 包裝','Next → Sample & dates':'下一步 → 樣品與日期','Next → Review':'下一步 → 檢查',
'Buyer choices retained':'買家需求已保留','No engineering confirmation yet':'尚未完成工程確認','Catalogue identity identified':'已辨認目錄型號','Component specification: pending engineering review':'部位規格：待工程評估','New concept · not a verified model':'新構想，並非已驗證型號',
'Packaging belongs to this configuration':'此配置的專屬包裝','See packaging scope diagram':'查看包裝範圍示意','01 · Starting basis':'01 · 包裝需求起點','02 · Single-item form & material':'02 · 單品包裝形式與材料','03 · Printing & barcode':'03 · 印刷與條碼','04 · Display, inner box, carton & pallet':'04 · 展示、內箱、外箱與棧板','05 · Who supplies packaging?':'05 · 包裝由誰供料？',
'Samples: purpose, quantity & arrival':'樣品：用途、數量與到樣日期','Why five separate dates?':'為何分開記錄日期？','Buyer milestones · preferences, not promised dates':'買家時程偏好，並非交期承諾','Optional knowledge — opens separately, no draft loss':'參考資訊另開分頁，保留此頁草稿',
'Order / annual / sample':'訂單／年量／樣品','Assembly':'組裝','Packaging':'包裝','Sample purpose / arrival':'樣品用途／到樣日期','Ship / receive / launch / evaluate':'出貨／收貨／上市／評選','Compare material directions':'比較材料方向','Review all part targets':'查看所有部位目標','Check missing information':'檢查缺資料',
'Review each line before sharing.':'分享前，逐項檢查需求。','Files to attach separately':'原始附件請另外加入郵件','Copy / TXT download includes names only. Attach original files separately in your email.':'複製與文字下載只包含檔名，原始附件請另加在郵件中。','No files selected — you can continue.':'尚未選附件，仍可繼續。','Preview only. Copy / download text; no mail is sent.':'預覽與文字複製／下載，不會寄出郵件。','No message sent.':'尚未寄出任何訊息。',
'Return · keep choices':'返回，保留選擇','Compare saved configurations':'比較已儲存配置','First configuration':'第一個配置','Second configuration':'第二個配置','Buyer requirement':'買家需求','Previous observation':'前期觀測','Latest observation':'最近觀測','Monthly change':'月度變化','No verified observation for this material selection.':'此材料選擇尚無已核對的觀測資料。',
'Local email preview · not an Outlook draft':'本機郵件預覽，不是 Outlook 信箱草稿','Prepare the message, then send yourself.':'整理郵件內容，由你自行寄出。','Subject':'主旨','Body':'內文','Tell us the use, not an assumed structure.':'先說明用途與構想，結構留待確認。',
'Not specified; leave open for discussion or add a quantity.':'尚未填寫，可留待討論或補上數量。','This catalogue model lists multiple dimensions. Preferred size remains open.':'此目錄型號有多種尺寸，偏好尺寸尚待確認。','Sample quantity needs its own unit.':'樣品量需獨立確認單位。','Use non-negative numeric targets or leave open.':'請填非負的數字目標，或留待討論。','Use an HTTP(S) link or leave open; the link is not fetched or uploaded.':'請使用 HTTP(S) 連結或留空；此處不讀取或上傳連結內容。','Requested shipment is after requested receipt; please review.':'希望出貨日期晚於希望收貨日期，請檢查。'
});
// Reuse existing site translations, then override legacy English fallbacks.
const english=window.BL_SITE.languages.find(l=>l.id==='en').text;
for(const edition of window.BL_SITE.languages){for(const [key,value]of Object.entries(english))if(edition.text[key]&&!labels[edition.id][value])labels[edition.id][value]=edition.text[key];}
for(const [id,copy]of Object.entries(window.BL_ENQUIRY_TRANSLATIONS||{}))Object.assign(labels[id],copy);
})();

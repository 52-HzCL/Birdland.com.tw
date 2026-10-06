/* Editorial reading layer. Original controls, evidence and full reports remain wired. */
(async function () {
  'use strict';
  if (document.readyState === 'loading') await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, {once:true}));
  const main = document.getElementById('daily-main');
  if (!main) return;
  const site = window.BL_SITE;
  let language = 'en';
  try { language = localStorage.getItem('bl_lang') || language; } catch (_) {}
  const words = (site.languages.find(l => l.id === language) || site.languages[0]).text;
  const t = key => words[key] || site.languages[0].text[key] || key;
  const make = (tag, cls, text) => { const node = document.createElement(tag); if (cls) node.className = cls; if (text) node.textContent = text; return node; };
  const link = (label, href) => { const node = make('a', '', label); node.href = href; return node; };
  const data = JSON.parse(document.getElementById('outlook-data').textContent);
  document.body.classList.add('sr-reading');
  const hero = main.querySelector('.hero');
  hero.querySelector('p').textContent = t('srSubtitle');
  hero.querySelector('h1').replaceChildren(make('span', '', 'The Asia'), document.createTextNode(' '), make('span', '', 'Supply View.'));
  const edition = make('p', 'sr-edition', t('srEdition') + ' · ' + (window.__abEditionDate || ''));
  hero.prepend(edition);
  const brand = make('a', 'sr-brand', 'BIRDLAND'); brand.href = 'index.html';
  const id = document.querySelector('#app-bar .ab-id');
  if (id) { const copy = make('span', 'sr-brand-copy'); copy.append(brand, id.querySelector('b')); id.append(copy); }
  const dock = document.querySelector('#app-bar .ab-dock');
  if (dock) dock.insertBefore(dock.querySelector('[data-app="market"]'), dock.querySelector('[data-app="buyer"]'));

  // Move the existing nodes, preserving email, print, install and language listeners.
  const controls = make('div', 'sr-controls');
  const actions = make('details', 'sr-edition-actions'); actions.append(make('summary', '', t('srActions')));
  const actionBody = make('div', 'sr-action-body'); actions.append(actionBody);
  const oldActions = hero.querySelector('.hero-actions');
  const market = oldActions.querySelector('.mail-pick');
  market.querySelector('label').textContent = t('biYourMarket');
  controls.append(market, link(t('srFollow'), '#follow'), actions);
  Array.from(oldActions.children).forEach(node => { if (node !== market) actionBody.append(node); });
  const size = document.querySelector('#app-bar .bl-textsize'); if (size) actionBody.append(size);
  const version = document.querySelector('#app-bar .ab-verwrap'); if (version) actionBody.append(version);
  const install = document.querySelector('.rail .free-app'); if (install) actionBody.append(install);
  hero.after(controls); oldActions.remove();
  const strip = document.getElementById('edstrip'); controls.after(strip);
  const navigation = [['brief','srBrief'],['cost','srCosts'],['production','srLocal'],['freight','srFreight'],['policy','srPolicy'],['news','srNews'],['calendar','srCalendar'],['trust','srSources']];
  navigation.forEach(([hash, key]) => { const node = strip.querySelector('[data-seg="' + hash + '"]'); if (node) node.textContent = t(key); });
  const followTab = strip.querySelector('[data-seg="follow"]'); if (followTab) actionBody.append(followTab);
  const sourceStatus = document.getElementById('source-state'); if (sourceStatus) actionBody.append(sourceStatus);
  const hq = document.querySelector('#app-bar .hq'); if (hq) actionBody.append(hq);
  const clock = document.querySelector('#app-bar [data-taipei-time]'); if (clock) actionBody.append(clock);
  const oldDates = hero.querySelector('.editionline'); if (oldDates) actionBody.append(oldDates);
  const away = document.getElementById('wya-slot'); if (away) actionBody.append(away);

  const production = document.getElementById('production'), cost = document.getElementById('cost');
  strip.after(production); production.after(cost);
  production.querySelector('.sectionhead h2').textContent = t('srLocal');
  production.querySelectorAll('.desk h3').forEach((node, index) => { node.textContent = t(index ? 'srChina' : 'srTaiwan'); });
  const localGrid = make('div', 'sr-local-grid');
  const desks = production.querySelector('.desk-grid'); desks.before(localGrid); localGrid.append(desks);
  const review = make('aside', 'sr-review'); review.setAttribute('aria-labelledby', 'sr-review-title');
  const reviewTitle = make('h3', '', t('srReview')); reviewTitle.id = 'sr-review-title'; review.append(reviewTitle);
  [['srFreightReview','srFreightNext','#freight'],['srProductionReview','srProductionNext','#production'],['srPolicyReview','srPolicyNext','#policy']].forEach(([title, note, href]) => {
    const row = make('div', 'sr-review-row'); row.append(link(t(title), href), make('p', '', t(note))); review.append(row);
  });
  const plan = link(t('srOpenPlan') + ' →', 'buying-tools.html'); plan.className = 'sr-plan'; review.append(plan); localGrid.append(review);
  const sourceDeck = production.querySelector('.source-deck');
  if (sourceDeck) { const detail = make('details', 'sr-local-sources'); detail.append(make('summary', '', t('srLocalSources'))); sourceDeck.before(detail); detail.append(sourceDeck); }

  // Preserve the original full lead, route risks and cost-driver interpretation below the edition.
  const original = document.getElementById('brief'); original.id = 'edition-context';
  original.dataset.originalBrief = '';
  document.getElementById('news').after(original);
  const contextLabel = make('h2', 'sr-context-title', t('srFullContext')); original.prepend(contextLabel);
  // Strip the legacy @@ formatting markers without changing the source copy.
  const walker = document.createTreeWalker(original, NodeFilter.SHOW_TEXT);
  let text; while ((text = walker.nextNode())) text.nodeValue = text.nodeValue.replace(/@@([^@]+)@@/g, '$1');
  const metrics = Array.from(document.querySelectorAll('#metric-grid .metric'));
  [metrics[0], metrics[2], metrics[3], metrics[1]].filter(Boolean).forEach(node => document.getElementById('metric-grid').append(node));
  metrics.forEach(node => {
    const stamp = make('p', 'sr-observation', t('srObservationMissing'));
    const source = data.status?.sources?.twelvedata;
    stamp.append(document.createElement('br'), make('span', '', t('srChecked') + ': ' + (source?.updated || t('biUnavailable')) + ' · ' + (source?.state || 'unavailable')));
    node.append(stamp); node.dataset.observation = 'unknown';
  });
  cost.append(make('p', 'sr-benchmark-note', t('srBenchmarkNote')));
  const continuation = make('nav', 'sr-continuation'); continuation.setAttribute('aria-label', t('srContinue'));
  [['freight','srFreight'],['policy','srPolicy'],['calendar','srCalendar'],['trust','srSources']].forEach(([hash, key]) => continuation.append(link(t(key) + ' →', '#' + hash)));
  cost.after(continuation);

  // Load the existing event grouping, not a new feed or AI-generated interpretation.
  let news;
  try { const response = await fetch('buyer-intelligence.json', {cache:'no-cache'}); if (!response.ok) throw Error('feed'); news = await response.json(); }
  catch (_) { original.id = 'brief'; original.classList.add('sr-feed-fallback'); const lateSize=document.querySelector('#app-bar .bl-textsize'); if(lateSize)actionBody.append(lateSize); document.body.dataset.readingReady = 'true'; return; }
  const stories = news.stories || [];
  const groupByUrl = new Map(); stories.forEach(item => item.links.forEach(source => groupByUrl.set(source.url, item)));
  const groups = new Map();
  Array.from(document.querySelectorAll('#taiwan-stories .story, #china-stories .story, #news-grid .news-card')).forEach(article => {
    const item = Array.from(article.querySelectorAll('a[href]')).map(a => groupByUrl.get(a.href)).find(Boolean);
    if (!item) return;
    const first = groups.get(item.id);
    if (!first) { const heading=article.querySelector('h4,h3'); if(heading)heading.textContent=item.title; groups.set(item.id, article); return; }
    let more = first.querySelector(':scope > .sr-event-sources');
    if (!more) { more = make('details', 'sr-event-sources'); more.append(make('summary', '', t('srOtherReports'))); first.append(more); }
    more.append(article);
  });
  // The first column is a story, not a macroeconomic conclusion about a customer's order.
  const selected = ['shipping','taiwan','tariff'].map(topic => stories.find(item => item.topic === topic && (topic !== 'tariff' || /steel|tariff|duty|customs|regulat/i.test(item.title))) || stories.find(item => item.topic === topic)).filter(Boolean);
  const summary = make('section', 'sr-summary'); summary.id = 'brief'; summary.setAttribute('aria-labelledby', 'sr-summary-title');
  const summaryHead = make('div', 'sr-summary-head'); const title = make('h2', '', t('srThree')); title.id = 'sr-summary-title';
  const latest = stories.map(item => item.date).filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date)).sort().at(-1);
  summaryHead.append(title); if (latest) summaryHead.append(make('span', 'sr-latest', t('biLatest') + ' · ' + latest)); summary.append(summaryHead);
  const grid = make('div', 'sr-summary-grid'); summary.append(grid);
  selected.forEach(item => {
    const article = make('article', 'sr-summary-story'); article.dataset.event = item.id;
    const topic = {shipping:'srFreight',taiwan:'srTaiwan',tariff:'srPolicy'}[item.topic];
    const relevance = {shipping:'srFreightMeaning',taiwan:'srProductionMeaning',tariff:'srPolicyMeaning'}[item.topic];
    article.append(make('p', 'sr-topic', t(topic)), make('h3', '', item.topic==='tariff'&&/statement.*steel excess capacity/i.test(item.title)?t('srSteelStatement'):item.title), make('p', 'sr-source-date', (/United States Trade Representative/i.test(item.source)?'USTR':item.source) + ' · ' + item.date));
    const impact = make('div', 'sr-relevance'); impact.append(make('strong', '', t('biRelevance')), make('p', '', t(relevance))); article.append(impact);
    const detail = make('details', 'sr-summary-evidence'); detail.append(make('summary', '', t('biEvidence')));
    detail.append(make('p', 'sr-original-headline', item.title), make('p', '', t('biHeadlineNote')));
    item.links.forEach(source => { const a = link(source.source + ' ↗', source.url); a.target = '_blank'; a.rel = 'noopener'; detail.append(a); }); article.append(detail); grid.append(article);
  });
  strip.after(summary);
  const lateSize=document.querySelector('#app-bar .bl-textsize'); if(lateSize)actionBody.append(lateSize);
  const refreshNav=()=>{let active='brief',nearest=-Infinity;navigation.forEach(([hash])=>{const node=document.getElementById(hash),top=node?.getBoundingClientRect().top;if(top<120&&top>nearest){active=hash;nearest=top;}});strip.querySelectorAll('[data-seg]').forEach(a=>{const on=a.dataset.seg===active;a.classList.toggle('on',on);if(on)a.setAttribute('aria-current','true');else a.removeAttribute('aria-current');});};
  let navFrame=false;window.addEventListener('scroll',()=>{if(navFrame)return;navFrame=true;requestAnimationFrame(()=>{navFrame=false;refreshNav();});},{passive:true});refreshNav();
  document.body.dataset.readingReady = 'true';
})();

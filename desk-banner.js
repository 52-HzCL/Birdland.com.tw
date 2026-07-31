// One banner for every desk.
//
// Overview, Daily Supply News, the Buyer Desk and the Cost Desk each grew their
// own top strip: different markup, different order, different things missing.
// The Buyer Desk had the holiday but no desk switch, Daily Supply News had the
// switch but no holiday, Overview had neither. This builds one banner and puts
// it on all four, so they are identical by construction rather than by anyone
// remembering to copy an edit across.
//
// It shows only at the top of the page, which needs no mechanism: it is the
// first element in the document and it is not pinned.
//
// Team Desk is deliberately excluded. It is the internal surface and is not part
// of the News / Buyer / Cost rotation.
(function () {
  var PAGES = { 'news.html': 'overview', 'executive.html': 'news', 'partner.html': 'buyer', 'cost-desk.html': 'cost' };
  var file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  if (!file) file = 'index.html';
  // The preview server serves extensionless URLs, so /cost-desk has to resolve too.
  if (!PAGES[file] && PAGES[file + '.html']) file = file + '.html';
  var here = PAGES[file];
  if (!here) return;

  // The page's own strip would otherwise sit directly above this one saying the
  // same things twice.
  var DUPES = ['.topbar', 'header.top', '.terminal-strip'];

  // Overview keeps its site header — that one carries navigation this banner
  // does not — but it also carried its own HQ light, Taipei clock and language
  // picker, so those three appeared twice about 60px apart. Rather than name
  // another selector, take them by the attributes terminal-status.js drives:
  // whatever is outside this banner and does one of its jobs, goes.
  var CLAIMED = '[data-hq-status],[data-taipei-time],[data-language-picker]';

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function build() {
    if (document.getElementById('desk-banner')) return;
    var hidFixed = false;
    DUPES.forEach(function (sel) {
      [].forEach.call(document.querySelectorAll(sel), function (n) {
        if (getComputedStyle(n).position === 'fixed') hidFixed = true;
        n.style.display = 'none';
      });
    });
    // The desks pad the body to clear their own fixed bar. With that bar
    // hidden the padding is a 64px empty strip above this banner, which reads
    // as the page failing to start.
    if (hidFixed) document.body.style.paddingTop = '0';

    var bar = el('div', 'dbar');
    bar.id = 'desk-banner';
    bar.setAttribute('role', 'banner');

    bar.appendChild(el('a', 'dbar-brand', 'BIRDLAND<small>' +
      ({ overview: 'Overview', news: 'Daily Supply News', buyer: 'Buyer Desk', cost: 'Cost Desk' })[here] +
      '</small>'));
    bar.lastChild.setAttribute('href', 'index.html');

    var meta = el('div', 'dbar-meta');
    // terminal-status.js drives these three by attribute, so they work here
    // without any per-page wiring.
    meta.appendChild(el('span', 'dbar-hq', '<i class="dbar-led" aria-hidden="true"></i>Birdland HQ <b data-hq-label>OFFLINE</b>'));
    meta.lastChild.setAttribute('data-hq-status', '');
    // terminal-status.js writes '18:48 Taipei' in here, so a second label
    // saying Taiwan would just be the same word twice.
    var time = el('span', 'dbar-time', '<b data-taipei-time>--:--</b>');
    meta.appendChild(time);
    meta.appendChild(el('span', 'dbar-hol', '<small>Taiwan holiday</small><b>—</b>'));
    bar.appendChild(meta);

    var lang = el('details', 'dbar-lang',
      '<summary>Language</summary><div>' +
      '<select data-translate-select aria-label="Translate this page"><option>Choose language…</option></select>' +
      '<small>Opens Google Translate in a new tab. Nothing is stored.</small></div>');
    lang.setAttribute('data-language-picker', '');
    bar.appendChild(lang);

    var sw = el('nav', 'dbar-switch');
    sw.setAttribute('aria-label', 'Desk');
    [['News', 'executive.html', 'news'], ['Buyer', 'partner.html', 'buyer'], ['Cost', 'cost-desk.html', 'cost']]
      .forEach(function (p) {
        var a = el('a', here === p[2] ? 'on' : '', p[0]);
        a.href = p[1];
        if (here === p[2]) a.setAttribute('aria-current', 'page');
        sw.appendChild(a);
      });
    bar.appendChild(sw);

    document.body.insertBefore(bar, document.body.firstChild);

    [].forEach.call(document.querySelectorAll(CLAIMED), function (n) {
      if (bar.contains(n)) return;
      // Drop the whole wrapper when it holds nothing else, so an empty flex
      // row is not left behind holding the gap open.
      var box = n.parentNode;
      var only = box && box !== document.body &&
        [].every.call(box.children, function (c) { return c.matches(CLAIMED); });
      (only ? box : n).remove();
    });

    // The holiday table lives in tw-holidays.js, which may not have parsed yet.
    (function holiday(tries) {
      var f = window.__TWHOLnext, slot = bar.querySelector('.dbar-hol b');
      if (typeof f === 'function' && slot) {
        var d = new Date(), iso = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
        var next = '';
        try { next = f(iso); } catch (e) { }
        slot.textContent = next || 'none scheduled';
        return;
      }
      if (tries > 0) setTimeout(function () { holiday(tries - 1); }, 120);
      else if (slot) slot.parentNode.style.display = 'none';
    }(12));

    // "Only at the top" needs no code at all: the banner is the first element in
    // the document and is not pinned, so it scrolls away and comes back exactly
    // when the reader is at the top.
    //
    // This started as position:sticky plus a scroll listener that toggled a
    // hide class, which was two mechanisms fighting to reproduce what the
    // document already does for free — and both were broken. Worth keeping the
    // note: the listener was silently dead, so it looked like a CSS problem for
    // a while.
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
}());

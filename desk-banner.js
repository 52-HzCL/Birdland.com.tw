// One header for every desk — the same header the rest of the site uses.
//
// Overview, Daily Supply News, the Buyer Desk and the Cost Desk each grew their
// own top strip, and Overview ended up showing two of them stacked: this
// banner, and its own site header underneath repeating the HQ light, the clock
// and the language picker about 60px lower. Neither looked like the home page.
//
// So this stops being a fifth design and becomes the home page's header,
// element for element: wordmark and eyebrow, About / Factory / Desks / Contact,
// the status cluster, the language picker. The only addition is the
// News / Buyer / Cost switch, which is the one thing a desk needs and the home
// page does not.
//
// It is not pinned. It sits at the top of the document and scrolls away with
// it, which is the whole of "show it only at the top".
//
// Team Desk is deliberately excluded. It is the internal surface and is not
// part of the News / Buyer / Cost rotation.
(function () {
  // Guide is not a desk — it is the site's manual, filed under About — but it
  // still needs the same header as everything else, so it is listed here with
  // no entry in the desk switch below.
  var PAGES = { 'guide.html': 'guide', 'executive.html': 'news', 'partner.html': 'buyer', 'cost-desk.html': 'cost' };
  var file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  if (!file) file = 'index.html';
  // The preview server serves extensionless URLs, so /cost-desk has to resolve too.
  if (!PAGES[file] && PAGES[file + '.html']) file = file + '.html';
  var here = PAGES[file];
  // desk-banner.css reserves the header's height at the top of every document
  // it is loaded into, so that inserting this is not a layout shift. A page
  // that loads the stylesheet but gets no banner must reclaim that space.
  if (!here) { document.documentElement.className += ' dbar-none'; return; }

  var EYEBROW = { guide: 'Guide', news: 'Daily Supply News', buyer: 'Buyer Desk', cost: 'Cost Desk' };

  // Whatever else on the page is a top strip. .shell-header is Overview's own
  // header, which this one now replaces outright rather than sitting above.
  var DUPES = ['.topbar', 'header.top', '.terminal-strip', '.shell-header'];

  // Anything outside this banner that does one of its jobs, taken by the
  // attributes terminal-status.js drives rather than by another hard-coded
  // selector, so this holds on any page that grows a second status strip.
  var CLAIMED = '[data-hq-status],[data-taipei-time],[data-language-picker]';

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function build() {
    if (document.getElementById('desk-banner')) return;
    DUPES.forEach(function (sel) {
      [].forEach.call(document.querySelectorAll(sel), function (n) { n.style.display = 'none'; });
    });

    var bar = document.createElement('header');
    bar.id = 'desk-banner';
    bar.className = 'dbar';
    bar.setAttribute('role', 'banner');
    bar.innerHTML =
      '<div class="dbar-inner">' +
        '<a class="dbar-wordmark" href="index.html">BIRDLAND<small>' + esc(EYEBROW[here]) + '</small></a>' +
        '<nav class="dbar-nav" aria-label="Main navigation">' +
          '<details class="dbar-menu"><summary>About</summary><div class="dbar-menu-panel">' +
            '<a href="about.html">Us</a>' +
            '<a href="guide.html"' + (here === 'guide' ? ' aria-current="page"' : '') + '>Guide</a>' +
          '</div></details>' +
          '<a href="product-101.html">Factory</a>' +
          // Same trigger markup as the hand-written headers, so terminal.js
          // binds to one selector rather than knowing about two headers.
          '<button type="button" class="tm-chip" data-terminal aria-haspopup="dialog" aria-expanded="false"><i aria-hidden="true"></i>Terminal</button>' +
          '<a href="contact.html">Contact</a>' +
        '</nav>' +
        '<div class="dbar-actions">' +
          '<div class="dbar-status">' +
            // terminal-status.js drives these three by attribute, so they work
            // here without any per-page wiring.
            '<span class="dbar-online" data-hq-status><i aria-hidden="true"></i>Birdland HQ <b data-hq-label>OFFLINE</b></span>' +
            // terminal-status.js writes "18:48 Taipei" in here, so a second
            // label saying Taiwan would just be the same word twice.
            '<span class="dbar-time" data-taipei-time>--:-- Taipei</span>' +
            '<span class="dbar-hol"><small>Taiwan holiday</small><b>&mdash;</b></span>' +
          '</div>' +
          '<details class="dbar-lang" data-language-picker><summary>Language</summary>' +
            '<div><select data-translate-select aria-label="Translate this page">' +
            '<option>Choose language&hellip;</option></select>' +
            '<small>Opens Google Translate in a new tab. Nothing is stored.</small></div></details>' +
        '</div>' +
      '</div>';

    // Same synchronous block: no frame is painted with both or with neither.
    document.documentElement.className += ' dbar-ready';
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

    // Close the Desks menu on an outside click, as the home page header does.
    document.addEventListener('click', function (e) {
      var m = bar.querySelector('.dbar-menu[open]');
      if (m && !m.contains(e.target)) m.removeAttribute('open');
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
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
}());

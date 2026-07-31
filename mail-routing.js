// Market-routed contact addresses, restored after the site rebuild dropped them.
//
// Two deliberate properties, both of which had been lost:
//
// 1. Enquiries route to the regional team, not to the executive mailbox. A
//    buyer in the Americas should reach the Americas desk directly, and the
//    hunting line has its own desk regardless of region.
// 2. No address appears in page source. A plaintext mailto on a public page is
//    harvested within days, so the domain is assembled at runtime and every
//    href is built by script. Nothing here should ever be inlined back into
//    HTML as a literal address.
(function () {
  var D = ['birdland', 'com', 'tw'].join('.');

  var BY_REGION = {
    global: 'team.eur',
    europe: 'team.eur',
    uk: 'team.uk',
    americas: 'team.usa'
  };
  // A product line can override the region: the hunting desk handles its own
  // enquiries wherever they come from.
  var BY_LINE = { hunting: 'hunting' };

  var REGIONS = [
    ['global', 'Global'],
    ['europe', 'Europe'],
    ['uk', 'UK & Commonwealth'],
    ['americas', 'Americas']
  ];
  var LINES = [
    ['', 'Garden & field tools'],
    ['hunting', 'Hunting equipment']
  ];

  function addr(region, line) {
    var box = (line && BY_LINE[line]) || BY_REGION[region] || BY_REGION.global;
    return box + '@' + D;
  }

  function href(region, line, subject, body) {
    var q = [];
    if (subject) q.push('subject=' + encodeURIComponent(subject));
    if (body) q.push('body=' + encodeURIComponent(body));
    return 'mailto:' + addr(region, line) + (q.length ? '?' + q.join('&') : '');
  }

  function fill(select, pairs, selected) {
    if (!select || select.dataset.ready) return;
    select.innerHTML = pairs.map(function (p) {
      return '<option value="' + p[0] + '"' + (p[0] === selected ? ' selected' : '') + '>' + p[1] + '</option>';
    }).join('');
    select.dataset.ready = '1';
  }

  window.blMail = {
    addr: addr, href: href, regions: REGIONS, lines: LINES, fillSelect: fill,
    // Remembering the region means a returning buyer is not asked twice.
    remember: function (key, value) { try { localStorage.setItem(key, value); } catch (e) { } },
    recall: function (key, fallback) { try { return localStorage.getItem(key) || fallback; } catch (e) { return fallback; } }
  };
}());

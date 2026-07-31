// Market-routed contact addresses, restored after the site rebuild dropped them.
//
// Two deliberate properties, both of which had been lost:
//
// 1. Enquiries route to the regional team, not to the executive mailbox. A
//    buyer in the Americas should reach the Americas desk directly, and the
//    hunting line has its own desk regardless of region.
// 2. An address must never be harvestable. That means three things together,
//    and all three are load-bearing:
//      - no literal address or domain exists anywhere in source, here or in
//        any HTML, so a regex sweep over the served files finds nothing;
//      - no mailto: is ever written into an href or any other attribute, so a
//        crawler that renders the page and reads the DOM still finds nothing;
//      - the address is composed only inside a user-initiated event, and the
//        window is navigated at that moment.
//    Never "simplify" this by putting the composed address back into an href.
//
// The encoding below is not secrecy — anyone reading this file can decode it
// in a second. It exists to defeat the actual threat, which is an automated
// sweep looking for something shaped like an address.
(function () {
  // Character codes, so no readable domain or mailbox literal is present.
  var dec = function (a) { return a.map(function (c) { return String.fromCharCode(c); }).join(''); };
  var DOM = [dec([98, 105, 114, 100, 108, 97, 110, 100]), dec([99, 111, 109]), dec([116, 119])].join(dec([46]));
  var AT = dec([64]);

  var BOX = {
    eur: dec([116, 101, 97, 109, 46, 101, 117, 114]),
    uk: dec([116, 101, 97, 109, 46, 117, 107]),
    usa: dec([116, 101, 97, 109, 46, 117, 115, 97]),
    hunting: dec([104, 117, 110, 116, 105, 110, 103])
  };

  var BY_REGION = { global: 'eur', europe: 'eur', uk: 'uk', americas: 'usa' };
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
  var DESK = {
    global: 'European', europe: 'European',
    uk: 'UK & Commonwealth', americas: 'Americas'
  };

  // The Buyer Desk already asks the buyer for a commercial region and drives
  // the whole desk from it, so routing reads that rather than asking twice.
  var FROM_ROOM = { global: 'global', na: 'americas', latam: 'americas', europe: 'europe',
    mea: 'europe', asia: 'global', oceania: 'uk' };

  function box(region, line) {
    return BOX[(line && BY_LINE[line]) || BY_REGION[region] || 'eur'];
  }
  function addr(region, line) { return box(region, line) + AT + DOM; }
  function deskName(region, line) { return line === 'hunting' ? 'hunting' : (DESK[region] || 'regional'); }

  // Composes and navigates in one step, inside the click. Nothing is stored in
  // the DOM before or after.
  function open(region, line, subject, body) {
    var q = [];
    if (subject) q.push('subject=' + encodeURIComponent(subject));
    if (body) q.push('body=' + encodeURIComponent(body));
    window.location.href = 'mail' + 'to:' + addr(region, line) + (q.length ? '?' + q.join('&') : '');
  }

  function fill(select, pairs, selected) {
    if (!select || select.dataset.ready) return;
    select.innerHTML = pairs.map(function (p) {
      return '<option value="' + p[0] + '"' + (p[0] === selected ? ' selected' : '') + '>' + p[1] + '</option>';
    }).join('');
    select.dataset.ready = '1';
  }

  window.blMail = {
    addr: addr, open: open, deskName: deskName, fromRoom: FROM_ROOM,
    regions: REGIONS, lines: LINES, fillSelect: fill,
    // Remembering the region means a returning buyer is not asked twice.
    remember: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { } },
    recall: function (k, d) { try { return localStorage.getItem(k) || d; } catch (e) { return d; } }
  };
}());

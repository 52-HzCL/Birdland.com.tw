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

  // Subject line tokens for inquiry categorization and email rule matching.
  // Each token is machine-readable (unchanged by i18n) and human-readable.
  var TAGS = {
    'brief': '[BL-BRF] ', // AsiaSource Buyer Brief inquiries
    'cost': '[BL-CST] ',  // CostNow cost calculation inquiries
    'cat': '[BL-CAT] ',   // Category enquiries — was the AsiaSource demand shelf
    'mkt': '[BL-MKT] '    // My Market: a buyer asking about a market's direction
    // Reserved for future use: [BL-PGM]
  };

  function box(region, line) {
    return BOX[(line && BY_LINE[line]) || BY_REGION[region] || 'eur'];
  }
  function addr(region, line) { return box(region, line) + AT + DOM; }
  // The name is written straight into the page (contact.html's "Goes to the
  // ___ desk", AsiaSource/CostNow's brief-toolbar "Email this brief to the
  // ___ desk", ABrief's edition strip "to the ___ desk") wherever the reader
  // is mid-sentence in their own language, so the word has to come out
  // already translated.
  // i18n.js's exact-match sweep can't be trusted with the raw English here:
  // "UK & Commonwealth" and "Americas" are *also* the nominative labels on
  // the region picker, and a language that inflects (Polish genitive,
  // German weak-adjective) needs a different form in a sentence than it
  // does standing alone in a <select>. A "desk-phrase:" key keeps this
  // word's dictionary entry from ever being read — or overwritten — by
  // that other lookup. blT itself falls back to the English word when it
  // has nothing better (no i18n.js on the page, dictionary not loaded yet,
  // or simply an English page), so this never regresses to a blank or a
  // literal "desk-phrase:" key.
  // Two grammatical forms, because the languages disagree on word order.
  // 'full' returns a complete noun phrase ("desk europeo", "mesa europea",
  // "europäischen Desk") for the desk apps, whose sentence frame carries no
  // separate noun node — Romance languages put the adjective after the noun
  // and a fixed adjective-slot could never say that. The default form stays
  // an adjective for the facade sentences, which keep the noun in their own
  // translated text. blT's fallback returns the text after the colon, so a
  // missing dictionary (or English) is detected by t === raw.
  function deskName(region, line, form) {
    var raw = line === 'hunting' ? 'hunting' : (DESK[region] || 'regional');
    if (form === 'full') {
      // The full-phrase keys are plain text ("European desk") on purpose:
      // deskName can run before the dictionary has loaded, and i18n.js's
      // exact-match re-walk then finds the fallback string as a key and
      // translates it in place. A prefixed key would leave the fallback
      // stranded in English forever.
      if (window.blT) {
        var t = window.blT(raw + ' desk');
        if (t !== raw + ' desk') return t;
      }
      return raw + ' desk';
    }
    return window.blT ? window.blT('desk-phrase:' + raw) : raw;
  }

  // Composes and navigates in one step, inside the click. Nothing is stored in
  // the DOM before or after.
  function open(region, line, subject, body, tag) {
    var q = [];
    if (subject) {
      var finalSubject = subject;
      if (tag && TAGS[tag]) {
        finalSubject = TAGS[tag] + subject;
      }
      q.push('subject=' + encodeURIComponent(finalSubject));
    }
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

/* Reader text size: three steps, set from the header, remembered.
 *
 * Loaded in <head> WITHOUT defer on purpose. The stored class has to be on
 * <html> before the first paint, or a reader who chose Large gets a flash of
 * the small setting on every page. The control itself is built later, once
 * the header exists.
 *
 * The scale lives in tokens.css as --ui-scale; this file only chooses it.
 */
(function () {
  'use strict';
  var KEY = 'bl_text_size';
  var STEPS = [
    { id: 'sm', cls: '', label: 'Small text' },
    { id: 'md', cls: 'ui-md', label: 'Larger text' },
    { id: 'lg', cls: 'ui-lg', label: 'Largest text' }
  ];

  function stored() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  function apply(id) {
    var root = document.documentElement;
    STEPS.forEach(function (s) { if (s.cls) root.classList.remove(s.cls); });
    var step = STEPS.filter(function (s) { return s.id === id; })[0] || STEPS[0];
    if (step.cls) root.classList.add(step.cls);
    return step.id;
  }

  // Before paint.
  var current = apply(stored() || 'sm');

  function mark(box) {
    [].forEach.call(box.querySelectorAll('button'), function (b) {
      b.setAttribute('aria-pressed', b.dataset.size === current ? 'true' : 'false');
    });
  }

  function build() {
    if (document.querySelector('.bl-textsize')) return;      // already placed
    // The header exists in three forms across this site: the hand-written one,
    // the one desk-banner.js injects, and the Team Desk's own. All three carry
    // the language picker, so that is the anchor.
    var anchor = document.querySelector('[data-language-picker]');
    var host = anchor ? anchor.parentNode
      : document.querySelector('.bl-header-actions,.dbar-actions,.bl-status');
    if (!host) return;

    var box = document.createElement('div');
    box.className = 'bl-textsize';
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', 'Text size');
    STEPS.forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.dataset.size = s.id;
      b.textContent = 'A';
      b.setAttribute('aria-label', s.label);
      b.title = s.label;
      b.addEventListener('click', function () {
        current = apply(s.id);
        try { localStorage.setItem(KEY, current); } catch (e) {}
        mark(box);
      });
      box.appendChild(b);
    });

    if (anchor && anchor.nextSibling) host.insertBefore(box, anchor.nextSibling);
    else host.appendChild(box);
    mark(box);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
  // desk-banner.js replaces the whole header after load on four pages, which
  // would take the control with it.
  window.addEventListener('load', build);
})();

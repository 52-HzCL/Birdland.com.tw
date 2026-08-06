/* Reader text size: two steps, set from the header, remembered.
 *
 * It was three steps labelled A A A, and nobody could tell what it did — three
 * identical letters read as decoration, and the middle step was a compromise
 * no one asked for. Two named steps say it outright: Normal, or Large for a
 * buyer reading a landed-cost table without their glasses.
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
    { id: 'sm', cls: '', text: 'Normal', label: 'Normal text size' },
    { id: 'lg', cls: 'ui-lg', text: 'Large', label: 'Large text size, easier to read' }
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

  // Before paint. 'md' was the middle step that no longer exists; a reader who
  // had chosen it wanted bigger text, so they get Large rather than a silent
  // reset to Normal.
  var saved = stored();
  var current = apply(saved === 'md' ? 'lg' : saved || 'sm');

  function mark(box) {
    [].forEach.call(box.querySelectorAll('button'), function (b) {
      b.setAttribute('aria-pressed', b.dataset.size === current ? 'true' : 'false');
    });
  }

  function build() {
    if (document.querySelector('.bl-textsize')) return;      // already placed
    // Most headers carry the language picker, so that is the anchor. On the
    // pages whose picker is built by script — the desks and the Guide — there
    // is no picker yet at DOMContentLoaded, so the fallback hosts are named
    // here and the second pass on load finds the real anchor.
    var anchor = document.querySelector('[data-language-picker]');
    var host = anchor ? anchor.parentNode
      : document.querySelector('.bl-header-actions,.dbar-actions,.bl-status,.topbar .tb-right');
    if (!host) return;

    var box = document.createElement('div');
    box.className = 'bl-textsize';
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', 'Text size');

    // The two words say what the choice is; this says what the choice is
    // about. Decorative, so it stays out of the accessible name.
    var tag = document.createElement('span');
    tag.className = 'bl-textsize-tag';
    tag.setAttribute('aria-hidden', 'true');
    tag.textContent = 'Aa';
    box.appendChild(tag);

    STEPS.forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.dataset.size = s.id;
      b.textContent = s.text;
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

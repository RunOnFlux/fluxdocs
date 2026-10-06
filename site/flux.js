// Page glue between the Flux header, Scalar and the Flux AI widget.

// Below 1000px Scalar draws its own bar under the Flux header: a menu button
// and the title of the section in view. Two bars cost a phone a tenth of its
// screen, so the Flux header takes both over: its menu button drives Scalar's,
// and the section title is mirrored next to the logo. flux.css hides Scalar's
// bar only once this has connected (body.flux-merged), so if Scalar's markup
// ever changes the page falls back to two bars instead of losing navigation.
(function () {
  var body = document.body;
  var menu = document.querySelector('.flux-menu');
  var context = document.querySelector('.flux-context');

  function connect() {
    var root = document.querySelector('.scalar-api-reference');
    var bar = root && root.querySelector('.t-doc__header > header');
    var toggle = bar && bar.querySelector(':scope > button');
    if (!toggle) return false;
    var title = bar.querySelector(':scope > span');

    function sync() {
      var open = root.classList.contains('references-sidebar-mobile-open');
      menu.setAttribute('aria-expanded', String(open));
      menu.setAttribute(
        'aria-label',
        open ? 'Close navigation' : 'Open navigation',
      );
      body.classList.toggle('flux-menu-open', open);
      var text = title ? title.textContent.trim() : '';
      if (context.textContent !== text) context.textContent = text;
      body.classList.toggle('flux-has-context', text !== '');
    }

    menu.addEventListener('click', function () {
      toggle.click();
    });
    // Following a link in the open menu closes it, as Scalar's own links do.
    document.querySelector('.flux-nav').addEventListener('click', function () {
      if (root.classList.contains('references-sidebar-mobile-open'))
        toggle.click();
    });
    new MutationObserver(sync).observe(root, {
      attributes: true,
      attributeFilter: ['class'],
    });
    if (title) {
      new MutationObserver(sync).observe(title, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    }
    body.classList.add('flux-merged');
    menu.hidden = false;
    sync();
    return true;
  }

  if (!connect()) {
    var waiting = new MutationObserver(function () {
      if (connect()) waiting.disconnect();
    });
    waiting.observe(document.getElementById('app'), {
      childList: true,
      subtree: true,
    });
  }
})();

// The Flux AI widget (ownllm) is opened from the header's Ask AI button, which
// only appears once the widget has mounted. Scalar marks the colour mode on
// <body>; the widget would read it from <html>, so it is passed on explicitly.
window.addEventListener('ownllm-ready', function () {
  var ask = document.querySelector('.flux-ask');
  ask.hidden = false;
  ask.addEventListener('click', function () {
    window.ownllm.open();
  });

  function syncTheme() {
    window.ownllm.setTheme(
      document.body.classList.contains('dark-mode') ? 'dark' : 'light',
    );
  }
  syncTheme();
  new MutationObserver(syncTheme).observe(document.body, {
    attributes: true,
    attributeFilter: ['class'],
  });
});

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

  // Cmd+I (Ctrl+I elsewhere) opens and closes the assistant from anywhere.
  var mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  document.querySelector('.flux-ask-key').textContent = mac ? '⌘I' : 'Ctrl I';
  document.addEventListener('keydown', function (event) {
    var modifier = mac ? event.metaKey : event.ctrlKey;
    if (modifier && !event.shiftKey && !event.altKey && event.key === 'i') {
      event.preventDefault();
      window.ownllm.toggle();
    }
  });

  askAboutEndpoints();
});

// "Ask AI" on every endpoint, next to "Copy as Markdown": asks the assistant
// about that endpoint by method and path, so the answer starts from the
// right page of the reference. Scalar renders endpoints as they scroll into
// view, so new ones are decorated as they appear.
function askAboutEndpoints() {
  var slug = function (text) {
    return text
      .trim()
      .normalize('NFC')
      .toLowerCase()
      .replace(/[^\p{L}\p{M}\p{N}\s_-]/gu, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };
  var endpoints = {};
  var pending = false;

  function decorate() {
    pending = false;
    document
      .querySelectorAll('section[id^="fluxapi/tag/"]')
      .forEach(function (section) {
        var endpoint = endpoints[section.id];
        if (!endpoint || section.querySelector('.flux-ask-endpoint')) return;
        var copy = Array.prototype.find.call(
          section.querySelectorAll('button'),
          function (button) {
            return /Copy as Markdown/.test(button.textContent);
          },
        );
        if (!copy) return;
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'flux-ask-endpoint';
        button.innerHTML =
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/></svg>Ask AI';
        button.setAttribute(
          'aria-label',
          'Ask Flux AI about ' + endpoint.method + ' ' + endpoint.path,
        );
        button.addEventListener('click', function () {
          window.ownllm.ask(
            'How do I use ' +
              endpoint.method +
              ' ' +
              endpoint.path +
              ' (' +
              endpoint.summary +
              ')? What does it need and what does it return?',
          );
        });
        copy.parentElement.insertBefore(button, copy);
      });
  }

  fetch(window.FLUX_SPEC_URL)
    .then(function (response) {
      return response.json();
    })
    .then(function (spec) {
      Object.keys(spec.paths).forEach(function (path) {
        ['get', 'post', 'put', 'patch', 'delete'].forEach(function (method) {
          var operation = spec.paths[path][method];
          if (!operation || !operation.operationId) return;
          (operation.tags || []).forEach(function (tag) {
            endpoints[
              'fluxapi/tag/' +
                slug(tag) +
                '/' +
                operation.operationId.toLowerCase()
            ] = {
              method: method.toUpperCase(),
              path: path,
              summary: operation.summary || operation.operationId,
            };
          });
        });
      });
      decorate();
      new MutationObserver(function () {
        if (pending) return;
        pending = true;
        requestAnimationFrame(decorate);
      }).observe(document.getElementById('app'), {
        childList: true,
        subtree: true,
      });
    });
}

(() => {
  'use strict';

  const measurementId = 'G-YXQQQTREZX';
  const storageKey = 'higienizador-ia:analytics-consent:v1';
  const consentLifetime = 180 * 24 * 60 * 60 * 1000;

  // Set the opt-out guard before a Google tag can be loaded.
  window['ga-disable-' + measurementId] = true;

  function readConsent() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) || 'null');
      if (!saved || !['accepted', 'rejected'].includes(saved.choice) || !Number.isFinite(saved.savedAt)) return null;
      if (Date.now() - saved.savedAt > consentLifetime) {
        window.localStorage.removeItem(storageKey);
        return null;
      }
      return saved.choice;
    } catch {
      return null;
    }
  }

  function saveConsent(choice) {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ choice, savedAt: Date.now() }));
    } catch {
      // The current-page choice still applies if browser storage is unavailable.
    }
  }

  function enableAnalytics() {
    if (window.__higienizadorGaLoaded) return;
    window['ga-disable-' + measurementId] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', { analytics_storage: 'granted' });
    window.gtag('js', new Date());
    window.gtag('config', measurementId, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(measurementId);
    script.dataset.higienizadorAnalytics = 'true';
    document.head.appendChild(script);
    window.__higienizadorGaLoaded = true;
  }

  function removeAnalyticsCookies() {
    const names = document.cookie.split(';').map(part => part.trim().split('=')[0]);
    const domains = [null, window.location.hostname];
    if (window.location.hostname.endsWith('.ferramentasgratis.com')) {
      domains.push('ferramentasgratis.com', '.ferramentasgratis.com');
    }

    names.filter(name => name === '_ga' || name.startsWith('_ga_')).forEach(name => {
      domains.forEach(domain => {
        let cookie = name + '=; path=/; max-age=0; SameSite=Lax';
        if (domain) cookie += '; domain=' + domain;
        document.cookie = cookie;
      });
    });
  }

  function disableAnalytics() {
    window['ga-disable-' + measurementId] = true;
    removeAnalyticsCookies();
  }

  const banner = document.createElement('aside');
  banner.className = 'analytics-consent';
  banner.hidden = true;
  banner.setAttribute('aria-labelledby', 'analytics-consent-title');
  banner.setAttribute('aria-live', 'polite');
  banner.innerHTML = '<div class="analytics-consent__copy">' +
    '<span class="analytics-consent__eyebrow">PRIVACIDADE</span>' +
    '<h2 id="analytics-consent-title">Você decide sobre as estatísticas</h2>' +
    '<p>O Google Analytics ajuda a entender as visitas e o uso das páginas. A medição só começa se você aceitar. Esta escolha é separada das opções de publicidade do Google. <a href="/privacidade">Saiba mais</a>.</p>' +
    '</div><div class="analytics-consent__actions">' +
    '<button class="analytics-consent__button analytics-consent__button--quiet" type="button" data-consent-choice="rejected">Recusar estatísticas</button>' +
    '<button class="analytics-consent__button analytics-consent__button--accept" type="button" data-consent-choice="accepted">Aceitar estatísticas</button>' +
    '</div>';

  document.body.appendChild(banner);

  function showPreferences() {
    banner.hidden = false;
    requestAnimationFrame(() => banner.classList.add('is-visible'));
  }

  function hidePreferences() {
    banner.hidden = true;
    banner.classList.remove('is-visible');
  }

  banner.querySelectorAll('[data-consent-choice]').forEach(button => {
    button.addEventListener('click', () => {
      const choice = button.dataset.consentChoice;
      saveConsent(choice);
      hidePreferences();
      if (choice === 'accepted') enableAnalytics();
      else disableAnalytics();
    });
  });

  document.addEventListener('click', event => {
    const trigger = event.target.closest && event.target.closest('[data-open-privacy-settings]');
    if (!trigger) return;
    event.preventDefault();
    showPreferences();
  });

  if (readConsent() === 'accepted') enableAnalytics();
  else if (readConsent() === 'rejected') disableAnalytics();
  else showPreferences();
})();

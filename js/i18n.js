/**
 * CNC Studio i18n Engine
 * Loads language JSON files from /i18n/ directory dynamically.
 * Supports: zh-CN, en, zh-TW, ms, ar (Arabic RTL)
 */
(function () {
  'use strict';

  const I18N = {
    current: 'zh-CN',
    _cache: {},

    async _fetch(lang) {
      try {
        const resp = await fetch(`i18n/${lang}.json`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        this._cache[lang] = data;
        return data;
      } catch (e) {
        console.warn(`i18n: Could not load i18n/${lang}.json — ${e.message}`);
        return null;
      }
    },

    async _load(lang) {
      if (this._cache[lang]) return this._cache[lang];
      const data = await this._fetch(lang);
      if (data) return data;
      if (lang !== 'zh-CN') return this._load('zh-CN');
      return {};
    },

    t(key) {
      const dict = this._cache[this.current] || this._cache['zh-CN'] || {};
      return dict[key] || key;
    },

    applyToDOM() {
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (key) el.textContent = this.t(key);
      });
      document.querySelectorAll('[data-i18n-attr]').forEach(el => {
        const attrStr = el.getAttribute('data-i18n-attr');
        if (!attrStr) return;
        attrStr.split(';').forEach(pair => {
          const [attr, key] = pair.split(':').map(s => s.trim());
          if (attr && key) el.setAttribute(attr, this.t(key));
        });
      });
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', this.t('meta.desc'));
      document.title = this.t('meta.title');
      document.documentElement.lang = this.current;
    },

    setDirection() {
      const isRTL = this.current === 'ar';
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
      if (isRTL) {
        document.documentElement.style.setProperty(
          '--font-heading',
          "'Noto Sans Arabic', 'Noto Sans SC', 'Inter', system-ui, sans-serif"
        );
        document.documentElement.style.setProperty(
          '--font-body',
          "'Noto Sans Arabic', 'Noto Sans SC', 'Inter', system-ui, sans-serif"
        );
        this._loadArabicFont();
      }
    },

    _loadArabicFont() {
      if (document.querySelector('link[data-font="arabic"]')) return;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.setAttribute('data-font', 'arabic');
      link.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap';
      document.head.appendChild(link);
    },

    persist(lang) {
      try { localStorage.setItem('cnc-lang', lang); } catch (e) { /* not available */ }
    },

    detect() {
      const urlParams = new URLSearchParams(window.location.search);
      const urlLang = urlParams.get('lang');
      if (urlLang && this._isSupported(urlLang)) return urlLang;
      try {
        const stored = localStorage.getItem('cnc-lang');
        if (stored && this._isSupported(stored)) return stored;
      } catch (e) { /* not available */ }
      const browserLang = navigator.language || navigator.userLanguage;
      if (browserLang) {
        if (this._isSupported(browserLang)) return browserLang;
        const prefix = browserLang.split('-')[0];
        const match = this._supported().find(k => k.startsWith(prefix));
        if (match) return match;
      }
      return 'zh-CN';
    },

    _supported() { return ['zh-CN', 'en', 'zh-TW', 'ms', 'ar']; },
    _isSupported(lang) { return this._supported().includes(lang); },

    async setLang(lang) {
      if (!this._isSupported(lang)) return;
      if (lang === this.current) return;
      const data = await this._load(lang);
      if (!data) return;
      this.current = lang;
      this._cache[lang] = data;
      this.setDirection();
      this.applyToDOM();
      this.persist(lang);
      this._updateSwitchers(lang);
    },

    _updateSwitchers(lang) {
      [document.getElementById('langSwitcher'), document.getElementById('langSwitcherMobile')]
        .filter(Boolean)
        .forEach(select => { select.value = lang; });
    },

    async init() {
      const detected = this.detect();
      const data = await this._load(detected);
      if (!data) { console.error('i18n: Failed to load any translations.'); return; }
      this.current = detected;
      this._cache[detected] = data;
      if (detected !== 'zh-CN') {
        this._fetch('zh-CN').then(d => { if (d) this._cache['zh-CN'] = d; });
      }
      this.setDirection();
      this.applyToDOM();
      this._updateSwitchers(detected);
    },
  };

  window.I18N = I18N;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => I18N.init());
  } else {
    I18N.init();
  }
})();

/* ==========================================================================
   پاسخ‌بان — main.js
   اسکریپت مشترک صفحهٔ محصول و صفحهٔ راهنما. بدون کتابخانه، بدون وابستگی.
   همهٔ قابلیت‌ها Progressive Enhancement هستند: بدون جاوااسکریپت هم صفحه کار می‌کند.
   ========================================================================== */
(function () {
  "use strict";

  var doc = document;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* تغییر رسانه‌ای، با پشتیبانی از مرورگرهای قدیمی‌تر */
  function onMediaChange(query, handler) {
    var mq = window.matchMedia(query);
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", handler);
    } else if (typeof mq.addListener === "function") {
      mq.addListener(handler);
    }
  }

  /* ---------------------------------------------------------------- 01 · سال شمسی */
  function initYear() {
    var slots = doc.querySelectorAll("[data-year]");
    if (!slots.length) return;
    var faYear = "۱۴۰۵";
    try {
      var formatted = new Intl.DateTimeFormat("fa-IR", { year: "numeric" }).format(new Date());
      // فقط ارقام را نگه می‌داریم تا خطای نیم‌فاصله یا نشانه‌های اضافه وارد نشود
      var digits = formatted.replace(/[^\u06F0-\u06F9\u0660-\u0669\u0030-\u0039]/g, "");
      if (digits.length === 4) faYear = digits;
    } catch (error) {
      /* در مرورگرهای قدیمی همان مقدار ثابت باقی می‌ماند */
    }
    Array.prototype.forEach.call(slots, function (slot) {
      slot.textContent = faYear;
    });
  }

  /* ------------------------------------------------------------ 02 · وضعیت هدر */
  function initHeader() {
    var header = doc.querySelector("[data-header]");
    if (!header) return;
    var ticking = false;

    function update() {
      header.classList.toggle("is-scrolled", window.scrollY > 6);
      ticking = false;
    }

    update();
    window.addEventListener(
      "scroll",
      function () {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(update);
      },
      { passive: true }
    );
  }

  /* --------------------------------------------------------- 03 · فهرست موبایل */
  function initNav() {
    var toggle = doc.querySelector("[data-nav-toggle]");
    var panel = doc.querySelector("[data-nav-panel]");
    if (!toggle || !panel) return;

    function setOpen(open) {
      panel.hidden = !open;
      panel.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      var label = toggle.querySelector(".nav-toggle__label");
      if (label) label.textContent = open ? "بستن" : "فهرست";
      var use = toggle.querySelector("use");
      if (use) use.setAttribute("href", open ? "#i-close" : "#i-menu");
    }

    toggle.addEventListener("click", function () {
      setOpen(panel.hidden);
    });

    panel.addEventListener("click", function (event) {
      if (event.target.closest("a")) setOpen(false);
    });

    doc.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !panel.hidden) {
        setOpen(false);
        toggle.focus();
      }
    });

    doc.addEventListener("click", function (event) {
      if (panel.hidden) return;
      if (panel.contains(event.target) || toggle.contains(event.target)) return;
      setOpen(false);
    });

    onMediaChange("(min-width: 60rem)", function (event) {
      if (event.matches) setOpen(false);
    });
  }

  /* ------------------------------------------------------- 04 · نمایش با اسکرول */
  function initReveal() {
    var items = doc.querySelectorAll("[data-reveal]");
    if (!items.length) return;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      Array.prototype.forEach.call(items, function (item) {
        item.classList.add("is-visible");
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    );

    Array.prototype.forEach.call(items, function (item) {
      observer.observe(item);
    });
  }

  /* ------------------------------------------- 05 · مشخص‌کردن بخش فعال (اسکرول‌سپای) */
  function initScrollSpy() {
    var links = doc.querySelectorAll('[data-toc-list] a, .site-nav a[href^="#"]');
    if (!links.length || !("IntersectionObserver" in window)) return;

    var map = {};
    Array.prototype.forEach.call(links, function (link) {
      var id = link.getAttribute("href").slice(1);
      if (!id) return;
      map[id] = map[id] || [];
      map[id].push(link);
    });

    var targets = Object.keys(map)
      .map(function (id) {
        return doc.getElementById(id);
      })
      .filter(Boolean);

    if (!targets.length) return;

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          Array.prototype.forEach.call(links, function (link) {
            link.removeAttribute("aria-current");
          });
          (map[entry.target.id] || []).forEach(function (link) {
            link.setAttribute("aria-current", "true");
          });
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );

    targets.forEach(function (target) {
      observer.observe(target);
    });
  }

  /* ------------------------------------------------------------ 06 · کپی کدها */
  function initCopy() {
    var buttons = doc.querySelectorAll("[data-copy]");
    if (!buttons.length) return;

    var status = doc.createElement("span");
    status.className = "visually-hidden";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    doc.body.appendChild(status);

    function fallbackCopy(text) {
      var area = doc.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "readonly");
      area.style.position = "fixed";
      area.style.opacity = "0";
      doc.body.appendChild(area);
      area.select();
      var ok = false;
      try {
        ok = doc.execCommand("copy");
      } catch (error) {
        ok = false;
      }
      doc.body.removeChild(area);
      return ok;
    }

    Array.prototype.forEach.call(buttons, function (button) {
      var original = button.innerHTML;

      button.addEventListener("click", function () {
        var selector = button.getAttribute("data-copy");
        var source = selector ? doc.querySelector(selector) : null;
        if (!source) return;
        var text = source.textContent.trim();

        function done(ok) {
          button.setAttribute("data-copied", ok ? "true" : "false");
          button.innerHTML = ok ? "کپی شد" : "کپی نشد";
          status.textContent = ok ? "متن کد کپی شد." : "کپی خودکار ممکن نشد.";
          window.setTimeout(function () {
            button.innerHTML = original;
            button.removeAttribute("data-copied");
          }, 1800);
        }

        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(text).then(
            function () {
              done(true);
            },
            function () {
              done(fallbackCopy(text));
            }
          );
          return;
        }
        done(fallbackCopy(text));
      });
    });
  }

  /* ------------------------------------------- 07 · دکمهٔ شناور موبایل (CTA) */
  function initMobileCta() {
    var bar = doc.querySelector("[data-mobile-cta]");
    var hero = doc.querySelector(".hero, .docs-hero");
    if (!bar || !hero) return;

    function setVisible(visible) {
      bar.classList.toggle("is-visible", visible);
      doc.body.classList.toggle("has-mobile-cta", visible);
    }

    if (!("IntersectionObserver" in window)) {
      window.addEventListener(
        "scroll",
        function () {
          setVisible(window.scrollY > window.innerHeight * 0.8);
        },
        { passive: true }
      );
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0);
        });
      },
      { threshold: 0 }
    );

    observer.observe(hero);

    // دکمهٔ شناور روی دسکتاپ معنا ندارد
    onMediaChange("(min-width: 48rem)", function (event) {
      if (event.matches) setVisible(false);
    });
  }

  /* ---------------------- 08 · فهرست راهنما و بازکردن بخش‌های بسته بر اساس لینک */
  function initDocs() {
    var toc = doc.querySelector("[data-toc]");
    if (toc && window.matchMedia("(max-width: 63.99rem)").matches) {
      toc.removeAttribute("open");
    }

    if (!window.location.hash) return;
    var target = doc.getElementById(window.location.hash.slice(1));
    if (!target) return;
    var parent = target.closest("details");
    while (parent) {
      parent.open = true;
      parent = parent.parentElement ? parent.parentElement.closest("details") : null;
    }
  }

  /* ------------------------------------------------------------------- راه‌اندازی */
  function init() {
    initYear();
    initHeader();
    initNav();
    initReveal();
    initScrollSpy();
    initCopy();
    initMobileCta();
    initDocs();
  }

  if (doc.readyState === "loading") {
    doc.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

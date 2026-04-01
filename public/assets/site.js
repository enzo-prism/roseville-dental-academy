(() => {
  const finePointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
  const mobileBreakpoint = window.matchMedia('(max-width: 1080px)');
  const compactAssistantBreakpoint = window.matchMedia('(max-width: 420px)');

  const menuToggle = document.querySelector('[data-menu-toggle]');
  const mobileNav = document.querySelector('[data-mobile-nav]');
  const desktopNavItems = Array.from(document.querySelectorAll('[data-nav-item]'));
  const mobileGroups = Array.from(document.querySelectorAll('[data-mobile-group]'));
  const closeTimers = new WeakMap();

  const clearCloseTimer = (item) => {
    const timer = closeTimers.get(item);
    if (timer) {
      window.clearTimeout(timer);
      closeTimers.delete(item);
    }
  };

  const setDesktopItemOpen = (item, open) => {
    const trigger = item.querySelector('[data-nav-trigger]');
    const menu = item.querySelector('[data-nav-menu]');
    if (!trigger) return;
    clearCloseTimer(item);
    item.classList.toggle('is-open', open);
    trigger.setAttribute('aria-expanded', String(open));
    if (menu instanceof HTMLElement) {
      menu.setAttribute('aria-hidden', String(!open));
      menu.toggleAttribute('inert', !open);
      menu.querySelectorAll('a').forEach((link) => {
        link.tabIndex = open ? 0 : -1;
      });
    }
  };

  const closeDesktopMenus = (except = null) => {
    desktopNavItems.forEach((item) => {
      if (item !== except) {
        setDesktopItemOpen(item, false);
      }
    });
  };

  const openDesktopMenu = (item) => {
    closeDesktopMenus(item);
    setDesktopItemOpen(item, true);
  };

  const scheduleDesktopClose = (item, delay = 120) => {
    clearCloseTimer(item);
    const timer = window.setTimeout(() => setDesktopItemOpen(item, false), delay);
    closeTimers.set(item, timer);
  };

  const setMobileNavOpen = (open) => {
    if (!menuToggle || !mobileNav) return;
    mobileNav.classList.toggle('is-open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('is-mobile-nav-open', open);
  };

  const setMobileGroupOpen = (group, open) => {
    const button = group.querySelector('[data-mobile-group-toggle]');
    const panel = group.querySelector('.mobile-group-panel');
    if (!button) return;
    group.classList.toggle('is-open', open);
    button.setAttribute('aria-expanded', String(open));
    if (panel instanceof HTMLElement) {
      panel.setAttribute('aria-hidden', String(!open));
      panel.toggleAttribute('inert', !open);
      panel.querySelectorAll('a').forEach((link) => {
        link.tabIndex = open ? 0 : -1;
      });
    }
  };

  const syncAssistantVisibility = () => {
    const shouldSuppressAssistant =
      compactAssistantBreakpoint.matches && window.scrollY < Math.min(window.innerHeight * 0.72, 520);
    document.body.classList.toggle('is-assistant-suppressed', shouldSuppressAssistant);
  };

  desktopNavItems.forEach((item) => {
    const trigger = item.querySelector('[data-nav-trigger]');
    const menu = item.querySelector('[data-nav-menu]');
    if (!trigger || !menu) return;

    item.addEventListener('pointerenter', (event) => {
      if (!finePointerQuery.matches || event.pointerType === 'touch') return;
      openDesktopMenu(item);
    });

    item.addEventListener('pointerleave', (event) => {
      if (!finePointerQuery.matches || event.pointerType === 'touch') return;
      scheduleDesktopClose(item);
    });

    item.addEventListener('focusin', () => {
      openDesktopMenu(item);
    });

    trigger.addEventListener('click', () => {
      const nextOpen = !item.classList.contains('is-open');
      closeDesktopMenus(nextOpen ? item : null);
      setDesktopItemOpen(item, nextOpen);
    });

    trigger.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openDesktopMenu(item);
        menu.querySelector('a')?.focus();
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        openDesktopMenu(item);
        const links = Array.from(menu.querySelectorAll('a'));
        links.at(-1)?.focus();
      }
    });

    menu.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setDesktopItemOpen(item, false);
        trigger.focus();
      }
    });
  });

  if (menuToggle && mobileNav) {
    menuToggle.addEventListener('click', () => {
      const nextOpen = menuToggle.getAttribute('aria-expanded') !== 'true';
      setMobileNavOpen(nextOpen);
    });
  }

  mobileGroups.forEach((group) => {
    const button = group.querySelector('[data-mobile-group-toggle]');
    if (!button) return;

    button.addEventListener('click', () => {
      const nextOpen = button.getAttribute('aria-expanded') !== 'true';
      mobileGroups.forEach((otherGroup) => {
        if (otherGroup !== group) {
          setMobileGroupOpen(otherGroup, false);
        }
      });
      setMobileGroupOpen(group, nextOpen);
    });
  });

  desktopNavItems.forEach((item) => {
    setDesktopItemOpen(item, item.classList.contains('is-open'));
  });

  mobileGroups.forEach((group) => {
    setMobileGroupOpen(group, group.classList.contains('is-open'));
  });

  const syncNavigationMode = () => {
    if (!mobileBreakpoint.matches) {
      setMobileNavOpen(false);
    }
    closeDesktopMenus();
  };

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (!desktopNavItems.some((item) => item.contains(target))) {
      closeDesktopMenus();
    }

    if (menuToggle && mobileNav && !menuToggle.contains(target) && !mobileNav.contains(target)) {
      setMobileNavOpen(false);
    }
  });

  document.addEventListener('focusin', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (!desktopNavItems.some((item) => item.contains(target))) {
      closeDesktopMenus();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeDesktopMenus();
      setMobileNavOpen(false);
    }
  });

  mobileBreakpoint.addEventListener?.('change', syncNavigationMode);
  finePointerQuery.addEventListener?.('change', closeDesktopMenus);
  compactAssistantBreakpoint.addEventListener?.('change', syncAssistantVisibility);
  window.addEventListener('resize', syncAssistantVisibility);
  window.addEventListener('scroll', syncAssistantVisibility, { passive: true });
  syncAssistantVisibility();

  const syncSelectableCards = (root) => {
    root.querySelectorAll('[data-choice-card]').forEach((card) => {
      const input = card.querySelector('input');
      card.classList.toggle('is-selected', Boolean(input?.checked));
    });

    root.querySelectorAll('[data-inline-option]').forEach((option) => {
      const input = option.querySelector('input');
      option.classList.toggle('is-selected', Boolean(input?.checked));
    });
  };

  document.querySelectorAll('[data-formspree-form]').forEach((form) => {
    const status = form.querySelector('[data-form-status]');
    const submitButton = form.querySelector('[data-formspree-submit]');
    const courseInputs = Array.from(form.querySelectorAll('[data-course-key]'));
    const inlineInputs = Array.from(form.querySelectorAll('[data-inline-option] input'));
    const courseError = form.querySelector('[data-course-error]');
    const params = new URLSearchParams(window.location.search);
    const requestedCourse = params.get('course');

    const setStatus = (type, message = '') => {
      if (!status) return;
      if (!type || !message) {
        status.hidden = true;
        status.textContent = '';
        status.className = 'form-status';
        return;
      }

      status.hidden = false;
      status.textContent = message;
      status.className = `form-status is-${type}`;
      status.focus();
    };

    const validateCourses = () => {
      const hasSelection = courseInputs.some((input) => input.checked);
      if (courseError) {
        courseError.hidden = hasSelection;
      }
      return hasSelection;
    };

    const prefillRequestedCourse = () => {
      if (!requestedCourse) return;
      courseInputs.forEach((input) => {
        input.checked = input.dataset.courseKey === requestedCourse;
      });
    };

    form.querySelectorAll('[data-form-context]').forEach((field) => {
      if (!(field instanceof HTMLInputElement)) return;
      if (field.dataset.formContext === 'page') {
        field.value = `${window.location.pathname}${window.location.search}`;
      }
      if (field.dataset.formContext === 'referrer') {
        field.value = document.referrer;
      }
    });

    prefillRequestedCourse();
    syncSelectableCards(form);

    courseInputs.forEach((input) => {
      input.addEventListener('change', () => {
        validateCourses();
        syncSelectableCards(form);
      });
    });

    inlineInputs.forEach((input) => {
      input.addEventListener('change', () => {
        syncSelectableCards(form);
      });
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      setStatus();

      if (!form.reportValidity()) return;

      if (courseInputs.length && !validateCourses()) {
        setStatus('error', 'Choose at least one course before sending your registration request.');
        courseInputs[0]?.focus();
        return;
      }

      const defaultLabel = submitButton?.textContent || 'Send registration request';
      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = true;
        submitButton.textContent = 'Sending request...';
      }

      try {
        const response = await fetch(form.action, {
          method: (form.method || 'POST').toUpperCase(),
          body: new FormData(form),
          headers: {
            Accept: 'application/json',
          },
        });

        const payload = await response.json().catch(() => ({}));

        if (response.ok) {
          form.reset();
          prefillRequestedCourse();
          syncSelectableCards(form);
          if (courseError) {
            courseError.hidden = true;
          }
          setStatus(
            'success',
            'Thanks. Your registration request is in. Roseville Dental Academy will follow up to confirm your course, class date, and secure payment steps.'
          );
        } else {
          const message = Array.isArray(payload.errors)
            ? payload.errors.map((error) => error.message).join(' ')
            : '';
          setStatus(
            'error',
            message || 'We could not send your request right now. Please try again or call admissions at 916-888-9821.'
          );
        }
      } catch (error) {
        setStatus(
          'error',
          'We could not reach the registration service. Please try again or call admissions at 916-888-9821.'
        );
      } finally {
        if (submitButton instanceof HTMLButtonElement) {
          submitButton.disabled = false;
          submitButton.textContent = defaultLabel;
        }
      }
    });
  });

  document.querySelectorAll('[data-mailto-form]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const subject = form.getAttribute('data-mailto-subject') || 'Roseville Dental Academy inquiry';
      const bodyParts = [];
      form.querySelectorAll('input, textarea, select').forEach((field) => {
        if (!field.name) return;
        const label = field.getAttribute('data-label') || field.name;
        const value = String(field.value || '').trim();
        if (value) {
          bodyParts.push(`${label}: ${value}`);
        }
      });
      const body = bodyParts.join('\n');
      window.location.href = `mailto:rosevilledentalacademy@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
  });

  document.querySelectorAll('[data-static-form]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
    });
  });
})();

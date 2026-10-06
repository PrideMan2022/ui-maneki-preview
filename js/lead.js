/* Заявки и цели Метрики — перенесено без изменений из script.js живого сайта
 * (строки «const ajaxForms…» — «обработчик кликов» и уведомление о Метрике).
 * Отличия от сайта два:
 * 1) вне домена ui-maneki.ru заявка не уходит — шаблон смотрят без отправки в Telegram;
 * 2) кнопки «Рассчитать» шлют цель click_calc_cta (её нужно завести в Метрике).
 * Ключи бота и EmailJS в шаблон не копируются: на сервере их файлы
 * telegram-config.js и emailjs-config.js уже лежат, код подгружает их сам.
 */
document.addEventListener("DOMContentLoaded", () => {
  const ajaxForms = Array.from(document.querySelectorAll('[data-ajax-form]'));

  // Куда браузер отправляет заявку. Дальше её разбирает api/lead.php:
  // он же хранит токен бота и адреса почты — в браузер они не попадают.
  const LEAD_ENDPOINT = 'api/lead.php';
  const MIN_LEAD_FILL_MS = 1000;

  // Заявка уходит двумя путями. Если на хостинге работает PHP — через api/lead.php,
  // и ключи остаются на сервере. Если PHP нет (сейчас именно так), браузер сам
  // обращается в Telegram Bot API и EmailJS по настройкам из двух файлов.
  //
  // Файлы подгружаются здесь, а не тегом <script> в разметке страницы. Разметка
  // хранится в data/content.json, а его правит владелец в админке на сервере, и
  // на мак он не приезжает — тег из проекта до сайта просто не дошёл бы. Код же
  // едет на сервер целиком, поэтому и настройки подтягивает код.
  const DELIVERY_CONFIG_FILES = ['telegram-config.js', 'emailjs-config.js'];

  let TELEGRAM_LEAD_CONFIG = { botToken: '', chatId: '', messageThreadId: '', enabled: false };
  let EMAILJS_LEAD_CONFIG = { publicKey: '', serviceId: '', templateId: '', toEmail: '', enabled: false };

  const readDeliveryConfigs = () => {
    TELEGRAM_LEAD_CONFIG = Object.assign(
      { botToken: '', chatId: '', messageThreadId: '', enabled: false },
      window.TELEGRAM_LEAD_CONFIG || {}
    );
    EMAILJS_LEAD_CONFIG = Object.assign(
      { publicKey: '', serviceId: '', templateId: '', toEmail: '', enabled: false },
      window.EMAILJS_LEAD_CONFIG || {}
    );
  };
  readDeliveryConfigs();

  const loadScriptOnce = (src) => new Promise((resolve) => {
    if (document.querySelector(`script[data-lead-config="${src}"]`)) {
      resolve();
      return;
    }
    const node = document.createElement('script');
    node.src = src;
    node.dataset.leadConfig = src;
    node.onload = () => resolve();
    // Нет файла — не беда: останется второй путь или серверный приёмник.
    node.onerror = () => resolve();
    document.head.appendChild(node);
  });

  let deliveryConfigPromise = null;
  const ensureDeliveryConfigs = () => {
    if (window.TELEGRAM_LEAD_CONFIG || window.EMAILJS_LEAD_CONFIG) {
      return Promise.resolve();
    }
    if (!deliveryConfigPromise) {
      deliveryConfigPromise = Promise.all(DELIVERY_CONFIG_FILES.map(loadScriptOnce))
        .then(readDeliveryConfigs);
    }
    return deliveryConfigPromise;
  };

  const staticDeliveryReady = () =>
    (TELEGRAM_LEAD_CONFIG.enabled && TELEGRAM_LEAD_CONFIG.botToken && TELEGRAM_LEAD_CONFIG.chatId)
    || (EMAILJS_LEAD_CONFIG.enabled && EMAILJS_LEAD_CONFIG.publicKey && EMAILJS_LEAD_CONFIG.serviceId && EMAILJS_LEAD_CONFIG.templateId);

  let emailJsLoaderPromise = null;

  const METRIKA_GOALS = Object.assign({
    briefOpenCta: 'click_brief_cta',
    casesOpenCta: 'click_cases_cta',
    tariffsOpenCta: 'click_tariffs_cta',
    discussProjectCta: 'click_discuss_project',
    telegramContactClick: 'click_telegram_contact',
    vkContactClick: 'click_vk_contact',
    pinterestContactClick: 'click_pinterest_contact'
  }, window.YANDEX_METRIKA_GOALS || {});

  const sendMetrikaGoal = (target, params = {}) => {
    if (!target || typeof window.yuiManekiReachGoal !== 'function') return false;
    return window.yuiManekiReachGoal(target, params);
  };

  const slugifyGoalName = (value) => String(value || '')
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '');

  const escapeHtml = (value) => String(value || '').replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char]));

  const getClosestText = (form, selector) => {
    const node = form.closest(selector);
    if (!node) return '';
    const heading = node.querySelector('h2');
    return heading ? heading.textContent.trim() : '';
  };

  const getFormTitle = (form) => {
    return form.dataset.formTitle
      || form.dataset.formName
      || getClosestText(form, '.brief-accordion')
      || getClosestText(form, '.section')
      || 'Заявка с сайта';
  };

  const getFormMetrikaGoal = (form) => {
    return form?.dataset?.metrikaGoal || slugifyGoalName(getFormTitle(form));
  };

  const getClickedGoalByElement = (element) => {
    if (!element) return '';
    const target = element.closest('a, button');
    if (!target) return '';

    const text = (target.textContent || '').trim().toLowerCase();
    const href = (target.getAttribute('href') || '').trim().toLowerCase();

    if (/обсудить проект/.test(text)) return METRIKA_GOALS.discussProjectCta;
    if (/заполнить бриф/.test(text) || href.includes('brief.html')) return METRIKA_GOALS.briefOpenCta;
    if (/кейс/.test(text) || href.includes('cases.html')) return METRIKA_GOALS.casesOpenCta;
    if (/тариф/.test(text) || href.includes('tariffs.html')) return METRIKA_GOALS.tariffsOpenCta;
    if (href.includes('t.me')) return METRIKA_GOALS.telegramContactClick;
    if (href.includes('vk.com') || href.includes('vk.ru')) return METRIKA_GOALS.vkContactClick;
    if (href.includes('pinterest.')) return METRIKA_GOALS.pinterestContactClick;
    if (href.endsWith('#calc') || /^рассчитать/.test(text)) return METRIKA_GOALS.calcOpenCta || 'click_calc_cta';

    return '';
  };

  const ensureHiddenField = (form, name, className) => {
    let field = form.querySelector(`input[name="${name}"]`);
    if (!field) {
      field = document.createElement('input');
      field.type = 'hidden';
      field.name = name;
      if (className) field.className = className;
      form.prepend(field);
    }
    return field;
  };

  const getStatusNode = (form) => {
    let node = form.querySelector('.form-status');
    if (!node) {
      node = document.createElement('p');
      node.className = 'form-status';
      node.setAttribute('aria-live', 'polite');
      form.appendChild(node);
    }
    return node;
  };

  const placeStatusNode = (form) => {
    const node = getStatusNode(form);
    const submitButton = form.querySelector('button[type="submit"]');
    const actionRow = submitButton?.closest('.btn-row, .brief-submit-row') || form.querySelector('.btn-row, .brief-submit-row');

    if (actionRow && node.parentElement !== actionRow) {
      if (submitButton && submitButton.nextSibling) {
        actionRow.insertBefore(node, submitButton.nextSibling);
      } else if (submitButton) {
        actionRow.appendChild(node);
      } else {
        form.appendChild(node);
      }
    }

    return node;
  };

  const clearFormStatus = (form) => {
    const node = getStatusNode(form);
    node.textContent = '';
    node.classList.remove('is-success', 'is-error', 'is-pending');
    node.removeAttribute('data-state');
    form.classList.remove('is-success', 'is-error', 'is-pending');
  };

  const setFormStatus = (form, message, type = '') => {
    const node = placeStatusNode(form);
    node.textContent = message || '';
    node.classList.remove('is-success', 'is-error', 'is-pending');
    node.removeAttribute('data-state');
    form.classList.remove('is-success', 'is-error', 'is-pending');

    if (type) {
      const normalizedType = type === 'pending' ? 'is-pending' : type === 'success' ? 'is-success' : 'is-error';
      node.classList.add(normalizedType);
      node.dataset.state = type;
      form.classList.add(normalizedType);
    }
  };

  const serializeForm = (form) => {
    const items = [];
    const controls = Array.from(form.querySelectorAll('input, textarea, select'));
    controls.forEach((field) => {
      const type = (field.getAttribute('type') || '').toLowerCase();
      if (['submit', 'button', 'hidden'].includes(type)) return;
      if (field.classList.contains('form-honeypot')) return;
      if (type === 'checkbox') {
        if (field.dataset.consent) {
          items.push({ label: 'Согласие на обработку персональных данных', value: field.checked ? 'Да' : 'Нет' });
        }
        return;
      }
      const value = (field.value || '').trim();
      if (!value) return;
      const label = field.closest('label')?.querySelector('span')?.textContent?.trim() || field.name || 'Поле';
      items.push({ label, value });
    });
    return items;
  };

  const getUtmSnapshot = () => {
    const params = new URLSearchParams(window.location.search);
    const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    const found = keys
      .map((key) => [key, params.get(key)])
      .filter(([, value]) => value);
    return Object.fromEntries(found);
  };

  /**
   * Отправка заявки на сервер.
   *
   * Раньше браузер сам ходил в api.telegram.org через fetch с mode:'no-cors'.
   * Такой запрос успешен всегда — даже когда Telegram отвечает ошибкой,
   * поэтому сайт показывал «Заявка отправлена», а заявки не было.
   * Теперь ответ приходит обычным JSON, и «успех» означает успех.
   */
  const findFieldValue = (fields, pattern) => {
    const item = fields.find((field) => pattern.test(field.label));
    return item ? item.value : '';
  };

  const isBriefForm = (form) => (form?.dataset?.ajaxForm || '').toLowerCase() === 'brief' || form?.classList?.contains('brief-form-grid');

  const fieldPresentation = (label, preserveLabel = false) => {
    const raw = String(label || '').trim();
    const normalized = raw.toLowerCase();

    if (/имя/.test(normalized)) return { icon: '👤', label: preserveLabel ? raw : 'Имя' };
    if (/(телеграм|telegram|телефон|контакт|whatsapp|ватсап)/.test(normalized)) return { icon: '📱', label: preserveLabel ? raw : 'Контакт' };
    if (/(бренд|магазин|проект|ниша|сфера|бизнес|площадк|маркетплейс)/.test(normalized)) return { icon: '🏷️', label: raw };
    if (/(товар|категор)/.test(normalized)) return { icon: '📦', label: raw };
    if (/(колич|сколько|хронометраж)/.test(normalized)) return { icon: '🔢', label: raw };
    if (/(ссылк|url|сайт|аккаунт|исходник|референс)/.test(normalized)) return { icon: '🔗', label: raw };
    if (/(срок|дата|когда)/.test(normalized)) return { icon: '⏱️', label: raw };
    if (/(бюджет|стоим)/.test(normalized)) return { icon: '💰', label: raw };
    if (/(тз|сценар|комментар|описан|что нужно|стиль|сцены|кадр|образ|локац|фон|детали|происход|преимущ|нельзя|содержан|материал|ориентац|формат|использоват|важно|публиковаться)/.test(normalized)) {
      return { icon: '📝', label: preserveLabel ? raw : 'Запрос' };
    }
    if (/(да|нет|нужно ли|есть ли)/.test(normalized)) return { icon: '✅', label: raw };
    return { icon: '▫️', label: raw };
  };

  const shouldShowPageUrl = () => {
    try {
      return !/^file:/i.test(window.location.protocol);
    } catch (error) {
      return true;
    }
  };

  const buildLeadPresentation = (form, fields) => {
    const formName = getFormTitle(form);
    const sentAtValue = new Date().toLocaleString('ru-RU');
    const pageUrl = shouldShowPageUrl() ? window.location.href : '';
    const briefMode = isBriefForm(form);
    const primaryRows = [];
    const extraRows = [];

    fields.forEach((field) => {
      if (!field || !field.label || !field.value) return;
      if (/согласие на обработку/i.test(field.label)) return;
      const present = fieldPresentation(field.label, briefMode);
      const row = { icon: present.icon, label: present.label, value: String(field.value).trim() };

      if (!briefMode && ['Имя', 'Контакт', 'Запрос'].includes(present.label) && !primaryRows.find((item) => item.label === present.label)) {
        primaryRows.push(row);
      } else {
        extraRows.push(row);
      }
    });

    const orderedRows = briefMode ? extraRows : [...primaryRows, ...extraRows];

    return {
      title: '💌 Новая заявка с сайта ЮИ Манэки',
      formName,
      pageUrl,
      sentAtValue,
      rows: [
        ...orderedRows,
        { icon: '📍', label: 'Форма', value: formName },
        ...(pageUrl ? [{ icon: '🔗', label: 'Страница', value: pageUrl }] : []),
        { icon: '🕒', label: 'Дата', value: sentAtValue }
      ]
    };
  };

  const buildTelegramApiMessage = (form, fields) => {
    const lead = buildLeadPresentation(form, fields);
    const valueLines = lead.rows.map((row) => `${row.icon} <b>${escapeHtml(row.label)}:</b> ${escapeHtml(row.value)}`);
    return [lead.title, '', ...valueLines].join('\n');
  };

  const buildEmailTemplateParams = (form, fields) => {
    const lead = buildLeadPresentation(form, fields);
    const utm = getUtmSnapshot();
    const leadName = findFieldValue(fields, /имя/i);
    const leadContact = findFieldValue(fields, /(телеграм|telegram|телефон|контакт|whatsapp|ватсап)/i);
    const leadComment = findFieldValue(fields, /(задач|запрос|комментар|описан|что нужно|референс|стиль|сцены|товар|формат|срок|бюджет|использоват)/i);
    const fieldsText = [lead.title, '', ...lead.rows.map((row) => `${row.icon} ${row.label}: ${row.value}`)].join('\n');
    const fieldsHtml = lead.rows.map((row) => `<div style="margin:0 0 10px;font-size:16px;line-height:1.55;"><span style="display:inline-block;min-width:28px;">${row.icon}</span><strong>${escapeHtml(row.label)}:</strong> ${escapeHtml(row.value).replace(/\n/g, '<br>')}</div>`).join('');
    const emailHtml = `<!doctype html><html lang="ru"><head><meta charset="UTF-8"><title>${escapeHtml(lead.title)}</title></head><body style="margin:0;padding:24px;background:#f6eef1;font-family:Arial,Helvetica,sans-serif;color:#1f1015;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:720px;margin:0 auto;border-collapse:collapse;background:#ffffff;border:1px solid #ead4db;border-radius:18px;overflow:hidden;"><tr><td style="padding:24px 28px;background:linear-gradient(135deg,#8a0124 0%,#b00631 52%,#6a001c 100%);color:#ffffff;"><div style="font-size:26px;line-height:1.25;font-weight:700;">${escapeHtml(lead.title)}</div></td></tr><tr><td style="padding:22px 28px 18px;">${fieldsHtml}</td></tr></table></body></html>`;

    return {
      to_email: EMAILJS_LEAD_CONFIG.toEmail || 'seoinfolab@yandex.ru',
      receiver_email: EMAILJS_LEAD_CONFIG.toEmail || 'seoinfolab@yandex.ru',
      site_name: 'ЮИ Манэки',
      form_name: lead.formName,
      page_title: document.title,
      page_url: lead.pageUrl,
      sent_at: lead.sentAtValue,
      lead_name: leadName,
      name: leadName,
      phone: leadContact,
      contact: leadContact,
      comment: leadComment,
      request: leadComment,
      message: fieldsText,
      fields_text: fieldsText,
      fields_html: fieldsHtml,
      email_html: emailHtml,
      subject: lead.title,
      utm_source: utm.utm_source || '',
      utm_medium: utm.utm_medium || '',
      utm_campaign: utm.utm_campaign || '',
      utm_term: utm.utm_term || '',
      utm_content: utm.utm_content || ''
    };
  };

  const loadEmailJsSdk = () => {
    if (!EMAILJS_LEAD_CONFIG.enabled || !EMAILJS_LEAD_CONFIG.publicKey || !EMAILJS_LEAD_CONFIG.serviceId || !EMAILJS_LEAD_CONFIG.templateId) {
      return Promise.reject(new Error('EmailJS is not configured'));
    }

    if (window.emailjs && typeof window.emailjs.send === 'function') {
      return Promise.resolve(window.emailjs);
    }

    if (emailJsLoaderPromise) return emailJsLoaderPromise;

    emailJsLoaderPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-emailjs-sdk="true"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.emailjs), { once: true });
        existing.addEventListener('error', () => reject(new Error('Failed to load EmailJS SDK')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
      script.async = true;
      script.dataset.emailjsSdk = 'true';
      script.onload = () => {
        if (!window.emailjs) {
          reject(new Error('EmailJS SDK is unavailable'));
          return;
        }
        window.emailjs.init(EMAILJS_LEAD_CONFIG.publicKey);
        resolve(window.emailjs);
      };
      script.onerror = () => reject(new Error('Failed to load EmailJS SDK'));
      document.head.appendChild(script);
    });

    return emailJsLoaderPromise;
  };

  const withTimeout = (promise, timeoutMs, errorMessage) => Promise.race([
    promise,
    new Promise((_, reject) => window.setTimeout(() => reject(new Error(errorMessage)), timeoutMs))
  ]);

  const sendLeadToTelegram = async (form, fields) => {
    const { botToken, chatId, messageThreadId, enabled } = TELEGRAM_LEAD_CONFIG;
    if (!enabled || !botToken || !chatId) {
      throw new Error('Telegram bot is not configured');
    }

    const payload = new URLSearchParams({
      chat_id: chatId,
      text: buildTelegramApiMessage(form, fields),
      parse_mode: 'HTML',
      disable_web_page_preview: 'true'
    });
    if (messageThreadId) {
      payload.set('message_thread_id', String(Number(messageThreadId)));
    }

    // Bot API отдаёт CORS-заголовки, поэтому ответ читается обычным запросом.
    // Раньше здесь стоял mode:'no-cors' — такой запрос успешен всегда, и ошибки
    // Telegram проходили молча. Теперь «успех» означает успех.
    const response = await withTimeout(fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: payload.toString()
    }), 10000, 'Telegram send timeout');

    let data = null;
    try { data = await response.json(); } catch (error) { data = null; }
    if (response.ok && data && data.ok) return data;
    throw new Error(`Telegram refused the lead: ${data && data.description ? data.description : response.status}`);
  };

  const sendLeadToEmail = async (form, fields) => {
    const emailjs = await loadEmailJsSdk();
    return withTimeout(
      emailjs.send(
        EMAILJS_LEAD_CONFIG.serviceId,
        EMAILJS_LEAD_CONFIG.templateId,
        buildEmailTemplateParams(form, fields)
      ),
      10000,
      'Email send timeout'
    );
  };

  // Отправка без сервера: заявка идёт разом в Telegram и на почту.
  // Успехом считается доставка хотя бы одним путём — но настоящая,
  // подтверждённая ответом сервиса, а не сам факт отправки запроса.
  const sendLeadStatic = async (form, fields) => {
    const results = await Promise.allSettled([
      sendLeadToTelegram(form, fields),
      sendLeadToEmail(form, fields)
    ]);

    if (results.some((result) => result.status === 'fulfilled')) {
      return { ok: true };
    }

    results.forEach((result) => console.warn('Lead delivery failed', result.reason));
    const error = new Error('lead_failed');
    error.userMessage = '';
    throw error;
  };

  const sendLead = async (form, fields) => {
    await ensureDeliveryConfigs();
    if (staticDeliveryReady()) {
      return sendLeadStatic(form, fields);
    }

    const startedAt = Number(form.querySelector('input[name="lead_created_at"]')?.value || 0);
    const response = await fetch(LEAD_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      body: JSON.stringify({
        formTitle: getFormTitle(form),
        page: window.location.href,
        utm: getUtmSnapshot(),
        startedAt,
        hp: form.querySelector('input[name="company_website"]')?.value || '',
        fields
      })
    });

    let data = null;
    try {
      data = await response.json();
    } catch (error) {
      data = null;
    }

    if (response.ok && data && data.ok) return data;

    const error = new Error(data?.error || 'lead_failed');
    error.userMessage = data?.message || '';
    throw error;
  };

  const primeLeadForms = () => {
    ajaxForms.forEach((form) => {
      const honeypot = ensureHiddenField(form, 'company_website', 'form-honeypot');
      honeypot.autocomplete = 'off';
      honeypot.tabIndex = -1;
      honeypot.setAttribute('aria-hidden', 'true');
      honeypot.style.position = 'absolute';
      honeypot.style.left = '-9999px';
      honeypot.style.width = '1px';
      honeypot.style.height = '1px';
      honeypot.style.opacity = '0';
      ensureHiddenField(form, 'lead_created_at').value = String(Date.now());
      form.setAttribute('action', '#');
      form.classList.add('tg-form');
      if (!form.dataset.formName) form.dataset.formName = getFormTitle(form);
      placeStatusNode(form);
      ['input', 'change'].forEach((eventName) => {
        form.addEventListener(eventName, () => {
          if (form.classList.contains('is-success') || form.classList.contains('is-error')) {
            clearFormStatus(form);
          }
        });
      });
    });
  };

  const handleAjaxSubmit = async (form) => {
    const consent = form.querySelector('[data-consent="true"]');
    const submitButton = form.querySelector('button[type="submit"]');
    const defaultButtonText = submitButton ? submitButton.textContent : '';
    const honeypot = form.querySelector('input[name="company_website"]');
    const startedAt = Number(form.querySelector('input[name="lead_created_at"]')?.value || 0);

    if (honeypot && honeypot.value.trim()) return;

    if (startedAt && Date.now() - startedAt < MIN_LEAD_FILL_MS) {
      setFormStatus(form, 'Пожалуйста, заполните форму чуть внимательнее и отправьте ещё раз.', 'error');
      return;
    }

    if (consent && !consent.checked) {
      setFormStatus(form, 'Пожалуйста, подтвердите согласие на обработку персональных данных.', 'error');
      consent.focus();
      return;
    }

    const requiredInputs = Array.from(
      form.querySelectorAll('input[required], textarea[required]')
    ).filter((el) => el.type !== 'checkbox');
    const missing = requiredInputs.find((el) => !el.value.trim());
    if (missing) {
      setFormStatus(form, 'Заполните имя, контакт и описание задачи — иначе мы не сможем ответить.', 'error');
      missing.focus();
      return;
    }

    const contactField = form.querySelector('input[name="contact"]');
    if (contactField && contactField.value.trim().length < 4) {
      setFormStatus(form, 'Укажите телеграм, телефон или почту, чтобы мы могли связаться.', 'error');
      contactField.focus();
      return;
    }

    const fields = serializeForm(form);
    if (!fields.length) {
      setFormStatus(form, 'Заполните хотя бы основные поля формы.', 'error');
      return;
    }

    if (!/(^|\.)ui-maneki\.ru$/.test(window.location.hostname)) {
      setFormStatus(form, 'Это шаблон: заявка не отправлена. На сайте она уйдёт в Telegram бюро и на почту.', 'success');
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
    }
    clearFormStatus(form);

    try {
      await sendLead(form, fields);
      form.reset();
      const stamp = form.querySelector('input[name="lead_created_at"]');
      if (stamp) stamp.value = String(Date.now());
      setFormStatus(form, 'Заявка отправлена. Скоро с вами свяжутся.', 'success');
      // Цель уходит в Метрику только после подтверждения сервера,
      // иначе в статистике копятся конверсии, которых не было.
      sendMetrikaGoal(getFormMetrikaGoal(form), {
        form_name: getFormTitle(form),
        page: window.location.pathname
      });
    } catch (error) {
      setFormStatus(
        form,
        error.userMessage || 'Не удалось отправить заявку. Попробуйте ещё раз или напишите нам в Telegram.',
        'error'
      );
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = defaultButtonText;
      }
    }
  };

  primeLeadForms();
  ajaxForms.forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      handleAjaxSubmit(form);
    });
  });

  document.addEventListener('click', (event) => {
    const goal = getClickedGoalByElement(event.target);
    if (!goal) return;

    const target = event.target.closest('a, button');
    sendMetrikaGoal(goal, {
      text: (target?.textContent || '').trim(),
      href: (target?.getAttribute('href') || '').trim(),
      page: window.location.pathname
    });
  }, { passive: true });
});

// Yandex Metrika analytics notice
(() => {
  const storageKey = 'uiManekiAnalyticsNoticeAcceptedV3';
  const init = () => {
    try {
      if (localStorage.getItem(storageKey) === 'yes') return;
    } catch (e) {}
    if (document.querySelector('.analytics-consent')) return;
    const banner = document.createElement('div');
    banner.className = 'analytics-consent';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-live', 'polite');
    banner.setAttribute('aria-label', 'Уведомление об использовании Яндекс Метрики');
    banner.innerHTML = '<p>Продолжая использовать сайт, вы соглашаетесь с обработкой данных, собираемых посредством сервиса «Яндекс Метрика», в целях анализа посещаемости и улучшения сайта. Подробнее — в <a href="documents.html#doc-privacy">политике конфиденциальности</a>.</p><button class="analytics-consent-button" type="button">Понятно</button>';
    document.body.appendChild(banner);
    requestAnimationFrame(() => banner.classList.add('is-visible'));
    banner.querySelector('button').addEventListener('click', () => {
      try { localStorage.setItem(storageKey, 'yes'); } catch (e) {}
      banner.classList.remove('is-visible');
      setTimeout(() => banner.remove(), 260);
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

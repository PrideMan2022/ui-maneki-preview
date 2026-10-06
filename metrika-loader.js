(function () {
  const config = window.YANDEX_METRIKA_CONFIG || {};
  const counterId = Number(config.counterId || 108579712);
  window.__YUI_MANEKI_METRIKA_COUNTER_ID__ = counterId;

  window.yuiManekiReachGoal = function (target, params) {
    if (!target || !window.ym || !window.__YUI_MANEKI_METRIKA_COUNTER_ID__) return false;
    try {
      window.ym(window.__YUI_MANEKI_METRIKA_COUNTER_ID__, 'reachGoal', String(target), params || {});
      return true;
    } catch (error) {
      return false;
    }
  };
})();

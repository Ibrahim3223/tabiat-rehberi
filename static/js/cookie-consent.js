/* Cookie Consent Banner — Tabiat Rehberi */
(function () {
    'use strict';

    var STORAGE_KEY = 'tr_cerez_onay';
    var banner      = document.getElementById('cookieBanner');
    var acceptBtn   = document.getElementById('cookieAccept');

    if (!banner) return;

    function hideBanner() {
        banner.style.opacity = '0';
        banner.style.transform = 'translateY(100%)';
        setTimeout(function () { banner.style.display = 'none'; }, 350);
    }

    /* Already accepted — hide immediately */
    if (localStorage.getItem(STORAGE_KEY) === 'accepted') {
        banner.style.display = 'none';
        return;
    }

    /* Show banner with slight delay so page renders first */
    setTimeout(function () {
        banner.style.display = 'block';
        /* Trigger CSS transition */
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                banner.classList.add('cookie-banner--visible');
            });
        });
    }, 1200);

    if (acceptBtn) {
        acceptBtn.addEventListener('click', function () {
            localStorage.setItem(STORAGE_KEY, 'accepted');
            hideBanner();
        });
    }
}());

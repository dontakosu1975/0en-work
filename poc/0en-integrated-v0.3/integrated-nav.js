// Public and company pages share one service origin in the v0.3 PoC.
if (document.querySelector('.company-link')) document.querySelector('.company-link').removeAttribute('target');
if (location.pathname === '/' || location.pathname === '/jobs') document.title = '仕事を探す | 0EN WORK 統合PoC';

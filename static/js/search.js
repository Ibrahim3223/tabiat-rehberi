// Arama fonksiyonu
document.addEventListener('DOMContentLoaded', function() {
    const heroSearchInput = document.getElementById('heroSearch');
    const headerSearchInput = document.getElementById('headerSearch');
    const searchOverlay = document.querySelector('.search-overlay');
    const searchSuggestions = document.querySelector('.search-suggestions');
    const searchClose = document.querySelector('.search-close');

    // Tüm alanları yükle
    let allAreas = [];

    // Arama verilerini fetch et
    async function loadSearchData() {
        try {
            // Hugo'nun oluşturduğu JSON index dosyasını kullanacağız
            // Şimdilik basit bir arama yapıyoruz, daha sonra index.json oluşturabiliriz
            const response = await fetch('/index.json');
            if (response.ok) {
                allAreas = await response.json();
            }
        } catch (error) {
            console.log('Arama verisi yüklenemedi, sayfa içi arama kullanılacak');
        }
    }

    // Sayfa yüklendiğinde arama verilerini yükle
    loadSearchData();

    // Hero arama
    if (heroSearchInput) {
        const searchButton = heroSearchInput.parentElement.querySelector('button');

        heroSearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch(this.value);
            }
        });

        if (searchButton) {
            searchButton.addEventListener('click', function() {
                performSearch(heroSearchInput.value);
            });
        }
    }

    // Header arama açma
    const searchTrigger = document.querySelector('.header-search-btn');
    if (searchTrigger) {
        searchTrigger.addEventListener('click', function(e) {
            e.preventDefault();
            if (searchOverlay) {
                searchOverlay.classList.add('active');
                setTimeout(() => {
                    if (headerSearchInput) {
                        headerSearchInput.focus();
                    }
                }, 100);
            }
        });
    }

    // Header arama kapatma
    if (searchClose) {
        searchClose.addEventListener('click', function() {
            if (searchOverlay) {
                searchOverlay.classList.remove('active');
                if (headerSearchInput) {
                    headerSearchInput.value = '';
                }
                if (searchSuggestions) {
                    searchSuggestions.innerHTML = '';
                }
            }
        });
    }

    // Overlay dışına tıklanınca kapat
    if (searchOverlay) {
        searchOverlay.addEventListener('click', function(e) {
            if (e.target === searchOverlay) {
                searchOverlay.classList.remove('active');
                if (headerSearchInput) {
                    headerSearchInput.value = '';
                }
                if (searchSuggestions) {
                    searchSuggestions.innerHTML = '';
                }
            }
        });
    }

    // Header arama - canlı öneriler
    if (headerSearchInput) {
        let searchTimeout;

        headerSearchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            const query = this.value.trim();

            if (query.length < 2) {
                if (searchSuggestions) {
                    searchSuggestions.innerHTML = '';
                }
                return;
            }

            searchTimeout = setTimeout(() => {
                showSearchSuggestions(query);
            }, 300);
        });

        headerSearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch(this.value);
            }
        });
    }

    // Arama önerileri göster
    function showSearchSuggestions(query) {
        if (!searchSuggestions) return;

        const lowerQuery = query.toLowerCase();
        const turkishMap = {
            'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
            'Ç': 'c', 'Ğ': 'g', 'İ': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u'
        };

        function normalizeText(text) {
            return text.toLowerCase().split('').map(char => turkishMap[char] || char).join('');
        }

        const normalizedQuery = normalizeText(query);

        // Örnek veriler - gerçekte Hugo'dan gelecek
        const suggestions = [
            { title: 'Köprülü Kanyon', type: 'Kanyon', province: 'Antalya', url: '/alanlar/koprulu-kanyon/' },
            { title: 'Saklıkent Kanyonu', type: 'Kanyon', province: 'Antalya', url: '/alanlar/saklikent-kanyonu/' },
            { title: 'Manavgat Şelalesi', type: 'Şelale', province: 'Antalya', url: '/alanlar/manavgat-selalesi/' },
            { title: 'Düden Şelalesi', type: 'Şelale', province: 'Antalya', url: '/alanlar/duden-selalesi/' },
            { title: 'Kaputaş Plajı', type: 'Plaj', province: 'Antalya', url: '/alanlar/kaputas-plaji/' }
        ];

        // Filtreleme yap
        const filtered = suggestions.filter(item => {
            const normalizedTitle = normalizeText(item.title);
            const normalizedType = normalizeText(item.type);
            const normalizedProvince = normalizeText(item.province);

            return normalizedTitle.includes(normalizedQuery) ||
                   normalizedType.includes(normalizedQuery) ||
                   normalizedProvince.includes(normalizedQuery);
        }).slice(0, 5);

        if (filtered.length === 0) {
            searchSuggestions.innerHTML = `
                <div class="no-results">
                    <i data-lucide="search-x"></i>
                    <p>Sonuç bulunamadı</p>
                    <small>"${query}" için eşleşme bulunamadı</small>
                </div>
            `;
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            return;
        }

        // Önerileri göster
        let html = '<div class="suggestions-list">';
        filtered.forEach(item => {
            html += `
                <a href="${item.url}" class="suggestion-item">
                    <div class="suggestion-icon">
                        <i data-lucide="map-pin"></i>
                    </div>
                    <div class="suggestion-content">
                        <div class="suggestion-title">${highlightMatch(item.title, query)}</div>
                        <div class="suggestion-meta">
                            <span>${item.type}</span>
                            <span>•</span>
                            <span>${item.province}</span>
                        </div>
                    </div>
                    <div class="suggestion-arrow">
                        <i data-lucide="arrow-right"></i>
                    </div>
                </a>
            `;
        });
        html += '</div>';

        searchSuggestions.innerHTML = html;

        // Lucide ikonlarını yeniden başlat
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    // Eşleşen metni vurgula
    function highlightMatch(text, query) {
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    // Arama yap
    function performSearch(query) {
        if (!query || query.trim().length < 2) {
            alert('Lütfen en az 2 karakter girin');
            return;
        }

        // Arama sayfasına yönlendir
        window.location.href = `/arama/?q=${encodeURIComponent(query.trim())}`;
    }

    // ESC tuşu ile kapat
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && searchOverlay && searchOverlay.classList.contains('active')) {
            searchOverlay.classList.remove('active');
            if (headerSearchInput) {
                headerSearchInput.value = '';
            }
            if (searchSuggestions) {
                searchSuggestions.innerHTML = '';
            }
        }
    });
});

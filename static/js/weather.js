// Hava Durumu Widget - Open-Meteo API (ÜCRETSİZ)
document.addEventListener('DOMContentLoaded', function() {
    const weatherWidget = document.getElementById('weatherData');

    if (!weatherWidget) return;

    const lat = weatherWidget.dataset.lat;
    const lon = weatherWidget.dataset.lon;

    if (!lat || !lon) return;

    // Open-Meteo API - Tamamen ücretsiz, API key gerektirmez
    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weathercode,windspeed_10m&timezone=Europe%2FIstanbul`;

    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            if (data && data.current) {
                const current = data.current;
                const temp = Math.round(current.temperature_2m);
                const feelsLike = Math.round(current.apparent_temperature);
                const humidity = current.relative_humidity_2m;
                const windSpeed = Math.round(current.windspeed_10m);
                const weatherCode = current.weathercode;

                // Hava durumu açıklaması
                const weatherDesc = getWeatherDescription(weatherCode);
                const weatherIcon = getWeatherIcon(weatherCode);

                weatherWidget.innerHTML = `
                    <div class="weather-info">
                        <div class="weather-main">
                            <div class="weather-icon">${weatherIcon}</div>
                            <div>
                                <div class="weather-temp">${temp}°C</div>
                                <div class="weather-desc">${weatherDesc}</div>
                            </div>
                        </div>
                        <div class="weather-details">
                            <span>Hissedilen: ${feelsLike}°C</span>
                        </div>
                    </div>
                    <div class="weather-extra">
                        <div class="weather-item">
                            <i data-lucide="droplets"></i>
                            <span>Nem: ${humidity}%</span>
                        </div>
                        <div class="weather-item">
                            <i data-lucide="wind"></i>
                            <span>Rüzgar: ${windSpeed} km/s</span>
                        </div>
                    </div>
                `;

                // Lucide ikonlarını yenile
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            } else {
                showWeatherError();
            }
        })
        .catch(error => {
            console.error('Hava durumu yüklenemedi:', error);
            showWeatherError();
        });

    function showWeatherError() {
        weatherWidget.innerHTML = `
            <div class="weather-error">
                <i data-lucide="cloud-off"></i>
                <p>Hava durumu bilgisi yüklenemedi</p>
            </div>
        `;
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    function getWeatherDescription(code) {
        const descriptions = {
            0: 'Açık',
            1: 'Çoğunlukla Açık',
            2: 'Parçalı Bulutlu',
            3: 'Bulutlu',
            45: 'Sisli',
            48: 'Dondurucu Sis',
            51: 'Hafif Çisenti',
            53: 'Çisentili',
            55: 'Yoğun Çisenti',
            61: 'Hafif Yağmur',
            63: 'Yağmurlu',
            65: 'Şiddetli Yağmur',
            71: 'Hafif Kar',
            73: 'Karlı',
            75: 'Yoğun Kar',
            77: 'Dolu',
            80: 'Sağanak Yağmur',
            81: 'Şiddetli Sağanak',
            82: 'Çok Şiddetli Sağanak',
            85: 'Kar Yağışı',
            86: 'Yoğun Kar Yağışı',
            95: 'Fırtına',
            96: 'Dolulu Fırtına',
            99: 'Şiddetli Dolulu Fırtına'
        };
        return descriptions[code] || 'Bilinmiyor';
    }

    function getWeatherIcon(code) {
        if (code === 0 || code === 1) return '☀️';
        if (code === 2) return '⛅';
        if (code === 3) return '☁️';
        if (code >= 45 && code <= 48) return '🌫️';
        if (code >= 51 && code <= 67) return '🌧️';
        if (code >= 71 && code <= 77) return '❄️';
        if (code >= 80 && code <= 82) return '🌦️';
        if (code >= 85 && code <= 86) return '🌨️';
        if (code >= 95) return '⛈️';
        return '🌤️';
    }
});

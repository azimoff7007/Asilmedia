// Asilmedia плагин для Lampa - ФИНАЛЬНАЯ ВЕРСИЯ 2.0
// Версия 15.0 - правильная фильтрация ссылок

(function() {
    console.log('🚀 Asilmedia: Запуск финальной версии 2.0');
    
    const proxies = [
        'https://corsproxy.io/?http://asilmedia.org',
        'https://api.allorigins.win/raw?url=http://asilmedia.org'
    ];
    
    let currentProxyIndex = 0;
    let currentNetwork = null;
    let currentActivity = null;
    let currentMovieData = null;
    
    function getSearchTitle(movieData) {
        // Используем английское название
        if (movieData.original_title) {
            console.log('📝 Оригинальное название:', movieData.original_title);
            return movieData.original_title;
        }
        return movieData.title;
    }
    
    function tryNextProxy() {
        if (currentProxyIndex >= proxies.length) {
            console.log('❌ Все прокси перепробованы');
            if (currentActivity && currentActivity.loader) currentActivity.loader(false);
            Lampa.Noty.show('Не удалось подключиться к Asilmedia');
            return;
        }
        
        let proxy = proxies[currentProxyIndex];
        currentProxyIndex++;
        
        let searchTitle = getSearchTitle(currentMovieData);
        let searchUrl = proxy + '/?do=search&subaction=search&story=' + encodeURIComponent(searchTitle);
        
        console.log(`📡 Пробуем прокси ${currentProxyIndex}:`, proxy);
        
        currentNetwork = new Lampa.Reguest();
        
        currentNetwork.silent(searchUrl, function(html) {
            console.log(`✅ Прокси ${currentProxyIndex} ответил, длина:`, html ? html.length : 0);
            
            if (html && html.length > 1000) {
                // Ищем ВСЕ ссылки на странице
                let allLinks = [];
                let linkMatches = html.match(/<a[^>]+href="([^"]+)"[^>]*>/gi);
                
                if (linkMatches) {
                    linkMatches.forEach(function(match) {
                        let urlMatch = match.match(/href="([^"]+)"/i);
                        if (urlMatch && urlMatch[1]) {
                            let url = urlMatch[1];
                            if (!allLinks.includes(url)) allLinks.push(url);
                        }
                    });
                }
                
                console.log('🔗 Всего ссылок на странице:', allLinks.length);
                
                // ФИЛЬТРУЕМ ТОЛЬКО ССЫЛКИ НА КОНКРЕТНЫЕ ФИЛЬМЫ
                let filmLinks = allLinks.filter(function(url) {
                    // Исключаем все служебные ссылки
                    if (url.includes('facebook.com')) return false;
                    if (url.includes('twitter.com')) return false;
                    if (url.includes('pinterest.com')) return false;
                    if (url.includes('vk.com')) return false;
                    if (url.includes('oauth')) return false;
                    if (url.includes('do=')) return false;
                    if (url.includes('#')) return false;
                    if (url.includes('javascript')) return false;
                    if (url === '/whatchnow.html') return false;
                    if (url === '/popular.html') return false;
                    
                    // Исключаем ссылки на разделы (категории)
                    if (url.includes('/films/')) return false;
                    if (url.includes('/category/')) return false;
                    
                    // Оставляем только ссылки, которые выглядят как страницы фильмов:
                    // 1. Содержат .html в конце
                    // 2. Не являются корневыми страницами
                    // 3. Имеют ID в URL (цифры)
                    if (url.includes('.html') && 
                        !url.endsWith('.html') && 
                        url.match(/\d+-[a-z-]+\.html/)) {
                        return true;
                    }
                    
                    return false;
                });
                
                console.log('🎬 Найдено ссылок на фильмы:', filmLinks.length);
                console.log('📋 Ссылки на фильмы:', filmLinks);
                
                if (filmLinks.length > 0) {
                    // Берем первую ссылку на фильм
                    let filmPath = filmLinks[0];
                    if (!filmPath.startsWith('http')) {
                        filmPath = (filmPath.startsWith('/') ? '' : '/') + filmPath;
                    }
                    
                    let baseProxy = proxy.split('?')[0];
                    // Исправляем возможные двойные слеши
                    baseProxy = baseProxy.replace(/\/$/, '');
                    filmPath = filmPath.replace(/^\//, '');
                    
                    let filmUrl = baseProxy + '/' + filmPath;
                    console.log('📄 Загружаем страницу фильма:', filmUrl);
                    Lampa.Noty.show('Фильм найден! Загружаем...');
                    loadFilmPage(filmUrl, currentMovieData, currentNetwork, baseProxy, currentActivity);
                } else {
                    console.log('❌ Ссылки на фильмы не найдены, пробуем следующий прокси');
                    tryNextProxy();
                }
            } else {
                console.log('❌ Пустой ответ, пробуем следующий прокси');
                tryNextProxy();
            }
        }, function(error) {
            console.log(`❌ Прокси ${currentProxyIndex} не работает:`, error);
            tryNextProxy();
        }, false, { dataType: 'text' });
    }
    
    function loadFilmPage(url, movieData, network, baseProxy, activity) {
        console.log('📄 Загрузка страницы фильма:', url);
        
        network.silent(url, function(html) {
            console.log('✅ Страница фильма загружена, длина:', html.length);
            
            if (html && html.length > 1000) {
                // Ищем URL плеера
                let playerMatch = html.match(/<iframe[^>]+src="([^"]+player[^"]*)"[^>]*>/i) ||
                                 html.match(/player\.php[^"'\s]+/i) ||
                                 html.match(/src="([^"]*\/player\/player\.html\?[^"]*)"/i);
                
                if (playerMatch) {
                    let playerPath = playerMatch[1] || playerMatch[0];
                    if (!playerPath.startsWith('http')) {
                        playerPath = (playerPath.startsWith('/') ? '' : '/') + playerPath;
                    }
                    
                    playerPath = playerPath.replace(/^\//, '');
                    let playerUrl = baseProxy + '/' + playerPath;
                    console.log('🎮 Найден плеер:', playerUrl);
                    loadPlayerPage(playerUrl, movieData, network, activity);
                    return;
                }
                
                // Ищем прямую ссылку на видео в JavaScript конфигурации
                let videoConfigMatch = html.match(/file["']?\s*:\s*["']([^"']+\.(mp4|m3u8)[^"']*)["']/i);
                
                if (videoConfigMatch && videoConfigMatch[1]) {
                    console.log('🎥 Найдено видео в конфигурации:', videoConfigMatch[1]);
                    playVideo(videoConfigMatch[1], movieData.title);
                    if (activity && activity.loader) activity.loader(false);
                    return;
                }
                
                // Ищем прямую ссылку на видео в HTML
                let videoSourceMatch = html.match(/<source[^>]+src="([^"]+\.(mp4|m3u8)[^"]*)"[^>]*>/i);
                
                if (videoSourceMatch && videoSourceMatch[1]) {
                    console.log('🎥 Найдено видео в HTML:', videoSourceMatch[1]);
                    playVideo(videoSourceMatch[1], movieData.title);
                    if (activity && activity.loader) activity.loader(false);
                    return;
                }
                
                console.log('❌ Плеер не найден на странице');
                if (activity && activity.loader) activity.loader(false);
                Lampa.Noty.show('Плеер не найден');
            }
        }, function(error) {
            console.log('❌ Ошибка загрузки страницы');
            if (activity && activity.loader) activity.loader(false);
            Lampa.Noty.show('Ошибка загрузки страницы');
        }, false, { dataType: 'text' });
    }
    
    function loadPlayerPage(url, movieData, network, activity) {
        console.log('🎬 Загрузка плеера:', url);
        
        network.silent(url, function(html) {
            console.log('✅ Плеер загружен, длина:', html.length);
            
            if (html && html.length > 100) {
                // Ищем видео в конфигурации плеера
                let videoMatch = html.match(/file["']?\s*:\s*["']([^"']+\.(mp4|m3u8)[^"']*)["']/i) ||
                                html.match(/<source[^>]+src="([^"]+\.(mp4|m3u8)[^"]*)"[^>]*>/i);
                
                if (videoMatch && videoMatch[1]) {
                    console.log('✅ Видео найдено в плеере!');
                    playVideo(videoMatch[1], movieData.title);
                } else {
                    console.log('❌ Видео не найдено в плеере');
                    Lampa.Noty.show('Видео не найдено');
                }
            } else {
                console.log('❌ Пустой ответ от плеера');
                Lampa.Noty.show('Плеер пустой');
            }
            if (activity && activity.loader) activity.loader(false);
        }, function(error) {
            console.log('❌ Ошибка загрузки плеера');
            if (activity && activity.loader) activity.loader(false);
            Lampa.Noty.show('Ошибка загрузки плеера');
        }, false, { dataType: 'text' });
    }
    
    function playVideo(url, title) {
        console.log('▶️ Запуск видео:', url);
        
        Lampa.Player.play({
            url: url,
            title: title
        });
    }

    function searchOnAsilmedia(movieData) {
        console.log('🔍 Поиск на Asilmedia для:', movieData.title);
        
        currentActivity = Lampa.Activity.active();
        if (currentActivity && currentActivity.loader) currentActivity.loader(true);
        
        currentMovieData = movieData;
        currentProxyIndex = 0;
        
        Lampa.Noty.show('Ищем на Asilmedia...');
        tryNextProxy();
    }

    function addButton() {
        Lampa.Listener.follow('full', function(event) {
            if (event.type === 'complite' && event.data && event.data.movie) {
                let movie = event.data.movie;
                
                setTimeout(function() {
                    let buttonsContainer = event.object.activity.render().find('.full-start-new__buttons');
                    
                    if (buttonsContainer.length && !buttonsContainer.find('.view--asilmedia').length) {
                        let button = $(`
                            <div class="full-start__button selector view--asilmedia">
                                <svg width="24" height="24" viewBox="0 0 24 24">
                                    <path d="M4 4H20V20H4V4Z" stroke="currentColor" stroke-width="2"/>
                                    <circle cx="12" cy="12" r="4" fill="currentColor"/>
                                </svg>
                                <span>Asilmedia</span>
                            </div>
                        `);
                        
                        button.on('hover:enter', function() {
                            searchOnAsilmedia(movie);
                        });
                        
                        buttonsContainer.append(button);
                        console.log('✅ Кнопка Asilmedia добавлена');
                    }
                }, 500);
            }
        });
    }

    function init() {
        if (window.Lampa && Lampa.Listener) {
            addButton();
        } else {
            setTimeout(init, 500);
        }
    }

    init();
    console.log('📦 Asilmedia плагин загружен');
})();

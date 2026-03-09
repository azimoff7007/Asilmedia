// Asilmedia плагин для Lampa - РАБОЧАЯ ВЕРСИЯ
// Версия 11.0 - пробует все найденные ссылки

(function() {
    console.log('🚀 Asilmedia: Запуск плагина');
    
    const proxies = [
        'https://corsproxy.io/?http://asilmedia.org',
        'https://api.allorigins.win/raw?url=http://asilmedia.org'
    ];
    
    let currentProxyIndex = 0;
    let currentNetwork = null;
    let currentActivity = null;
    let currentMovieData = null;
    
    function getSearchTitle(movieData) {
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
                let links = [];
                let linkMatches = html.match(/<a[^>]+href="([^"]+)"[^>]*>/gi);
                
                if (linkMatches) {
                    linkMatches.forEach(function(match) {
                        let urlMatch = match.match(/href="([^"]+)"/i);
                        if (urlMatch && urlMatch[1]) {
                            let url = urlMatch[1];
                            // Исключаем служебные ссылки
                            if (!url.includes('do=') && 
                                !url.includes('#') && 
                                !url.includes('javascript') &&
                                url.length > 10) {
                                if (!links.includes(url)) links.push(url);
                            }
                        }
                    });
                }
                
                console.log('🔗 Найдено ссылок (всего):', links.length);
                console.log('📋 Первые 10 ссылок:', links.slice(0, 10));
                
                if (links.length > 0) {
                    // Пробуем каждую ссылку по очереди
                    tryNextLink(links, 0, proxy, html, currentMovieData, currentNetwork, currentActivity);
                } else {
                    console.log('❌ Ссылки не найдены');
                    tryNextProxy();
                }
            } else {
                console.log('❌ Пустой ответ');
                tryNextProxy();
            }
        }, function(error) {
            console.log(`❌ Прокси ${currentProxyIndex} не работает:`, error);
            tryNextProxy();
        }, false, { dataType: 'text' });
    }
    
    function tryNextLink(links, index, proxy, searchHtml, movieData, network, activity) {
        if (index >= links.length) {
            console.log('❌ Все ссылки перепробованы');
            if (activity && activity.loader) activity.loader(false);
            Lampa.Noty.show('Не удалось найти страницу с видео');
            return;
        }
        
        let link = links[index];
        console.log(`🔗 Пробуем ссылку ${index + 1}/${links.length}:`, link);
        
        let filmPath = link;
        if (!filmPath.startsWith('http')) {
            filmPath = (filmPath.startsWith('/') ? '' : '/') + filmPath;
        }
        
        // Извлекаем базовый прокси (без параметров)
        let baseProxy = proxy.split('?')[0];
        if (baseProxy.includes('allorigins')) {
            baseProxy = 'https://api.allorigins.win/raw?url=http://asilmedia.org';
        }
        
        let filmUrl = baseProxy + filmPath;
        console.log('🎬 Загружаем страницу:', filmUrl);
        
        network.silent(filmUrl, function(html) {
            console.log(`✅ Страница загружена, длина:`, html.length);
            
            // Ищем плеер на странице
            let playerMatch = html.match(/<iframe[^>]+src="([^"]+player[^"]*)"[^>]*>/i) ||
                             html.match(/player\.php[^"'\s]+/i) ||
                             html.match(/data-player="([^"]+)"/i) ||
                             html.match(/data-url="([^"]+)"/i);
            
            if (playerMatch) {
                let playerPath = playerMatch[1] || playerMatch[0];
                if (!playerPath.startsWith('http')) {
                    playerPath = (playerPath.startsWith('/') ? '' : '/') + playerPath;
                }
                
                let playerUrl = baseProxy + playerPath;
                console.log('🎮 Найден плеер!');
                loadPlayerPage(playerUrl, movieData, network, activity);
                return;
            }
            
            // Ищем прямую ссылку на видео
            let videoMatch = html.match(/<source[^>]+src="([^"]+\.(mp4|m3u8)[^"]*)"[^>]*>/i) ||
                            html.match(/file:\s*["']([^"']+\.(mp4|m3u8)[^"']*)["']/i) ||
                            html.match(/video[^>]+src="([^"]+\.(mp4|m3u8)[^"]*)"[^>]*>/i);
            
            if (videoMatch && videoMatch[1]) {
                console.log('🎥 Найдено видео!');
                playVideo(videoMatch[1], movieData.title);
                if (activity && activity.loader) activity.loader(false);
                return;
            }
            
            console.log('❌ Плеер не найден на этой странице, пробуем следующую');
            tryNextLink(links, index + 1, proxy, searchHtml, movieData, network, activity);
            
        }, function(error) {
            console.log('❌ Ошибка загрузки страницы, пробуем следующую');
            tryNextLink(links, index + 1, proxy, searchHtml, movieData, network, activity);
        }, false, { dataType: 'text' });
    }
    
    function loadPlayerPage(url, movieData, network, activity) {
        console.log('🎬 Загрузка плеера:', url);
        
        network.silent(url, function(html) {
            console.log('✅ Плеер загружен, длина:', html.length);
            
            if (html && html.length > 100) {
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
        
        if (!url.startsWith('http')) {
            url = 'http://asilmedia.org' + (url.startsWith('/') ? '' : '/') + url;
        }
        
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

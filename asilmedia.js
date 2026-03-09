// Asilmedia плагин для Lampa - РАБОЧАЯ ВЕРСИЯ
// Версия 7.0 - использует cors.byskaz.ru

(function() {
    console.log('🚀 Asilmedia: Запуск плагина');
    
    // Функция для получения названия для поиска
    function getSearchTitle(movieData) {
        // Пробуем оригинальное название (английское) - на сайте много английских названий
        if (movieData.original_title) {
            console.log('📝 Оригинальное название:', movieData.original_title);
            return movieData.original_title;
        }
        
        // В крайнем случае - русское
        console.log('⚠️ Русское название:', movieData.title);
        return movieData.title;
    }
    
    function searchOnAsilmedia(movieData) {
        console.log('🔍 Поиск на Asilmedia для:', movieData.title);
        
        let activity = Lampa.Activity.active();
        if (activity && activity.loader) {
            activity.loader(true);
        }
        
        // ИСПОЛЬЗУЕМ РАБОЧИЙ ПРОКСИ
        let baseProxy = 'http://cors.byskaz.ru/';
        let baseUrl = 'http://asilmedia.org';
        let searchTitle = getSearchTitle(movieData);
        
        console.log('🔎 Ищем как:', searchTitle);
        
        // Формируем URL для поиска
        let searchPath = '/?do=search&subaction=search&story=' + encodeURIComponent(searchTitle);
        let fullUrl = baseProxy + baseUrl + searchPath;
        
        console.log('📡 Запрос через прокси:', fullUrl);
        Lampa.Noty.show('Ищем на Asilmedia...');
        
        let network = new Lampa.Reguest();
        
        network.silent(fullUrl, function(html) {
            console.log('✅ Получен ответ, длина:', html ? html.length : 0);
            
            if (html && html.length > 1000) {
                // Сохраняем часть HTML для отладки
                console.log('📄 Первые 500 символов:', html.substring(0, 500));
                
                // Ищем ссылки на фильмы в результатах поиска
                let links = [];
                
                // Паттерны для поиска ссылок на asilmedia.org
                let patterns = [
                    /<a[^>]+href="([^"]+)"[^>]*class="[^"]*title[^"]*"[^>]*>/gi,
                    /<h2[^>]*><a[^>]+href="([^"]+)"[^>]*>/gi,
                    /<div[^>]*class="[^"]*short-story[^"]*"[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>/gi
                ];
                
                for (let pattern of patterns) {
                    let matches = html.matchAll(pattern);
                    for (let match of matches) {
                        if (match[1] && !links.includes(match[1])) {
                            // Фильтруем только ссылки на фильмы (не на страницы типа "do=search")
                            if (!match[1].includes('do=') && match[1].length > 10) {
                                links.push(match[1]);
                            }
                        }
                    }
                }
                
                console.log('🔗 Найдено ссылок на фильмы:', links.length);
                
                if (links.length > 0) {
                    // Берем первую ссылку
                    let filmPath = links[0];
                    if (!filmPath.startsWith('http')) {
                        filmPath = (filmPath.startsWith('/') ? '' : '/') + filmPath;
                    }
                    
                    let filmUrl = baseProxy + baseUrl + filmPath;
                    console.log('🎬 Переходим по ссылке:', filmUrl);
                    Lampa.Noty.show('Фильм найден! Загружаем...');
                    loadFilmPage(filmUrl, movieData, network, baseProxy, baseUrl, activity);
                } else {
                    console.log('❌ Фильм не найден');
                    if (activity && activity.loader) activity.loader(false);
                    Lampa.Noty.show('Фильм не найден на Asilmedia');
                }
            } else {
                console.log('❌ Пустой ответ');
                if (activity && activity.loader) activity.loader(false);
                Lampa.Noty.show('Сайт не отвечает');
            }
        }, function(error) {
            console.log('❌ Ошибка:', error);
            if (activity && activity.loader) activity.loader(false);
            Lampa.Noty.show('Ошибка соединения');
        }, false, { dataType: 'text' });
    }
    
    function loadFilmPage(url, movieData, network, proxy, baseUrl, activity) {
        console.log('📄 Загрузка страницы фильма:', url);
        
        network.silent(url, function(html) {
            console.log('✅ Страница загружена, длина:', html.length);
            
            if (html && html.length > 1000) {
                // Ищем плеер
                let playerMatch = html.match(/<iframe[^>]+src="([^"]+player[^"]*)"[^>]*>/i) ||
                                 html.match(/player\.php[^"'\s]+/i) ||
                                 html.match(/src="([^"]*\/engine\/player\/[^"]*)"/i);
                
                if (playerMatch) {
                    let playerPath = playerMatch[1] || playerMatch[0];
                    if (!playerPath.startsWith('http')) {
                        playerPath = (playerPath.startsWith('/') ? '' : '/') + playerPath;
                    }
                    
                    let playerUrl = proxy + baseUrl + playerPath;
                    console.log('🎮 Загружаем плеер:', playerUrl);
                    loadPlayerPage(playerUrl, movieData, network, activity);
                    return;
                }
                
                // Ищем прямую ссылку на видео
                let directMatch = html.match(/<source[^>]+src="([^"]+\.(mp4|m3u8)[^"]*)"[^>]*>/i) ||
                                html.match(/<video[^>]+src="([^"]+\.(mp4|m3u8)[^"]*)"[^>]*>/i) ||
                                html.match(/file:\s*["']([^"']+\.(mp4|m3u8)[^"']*)["']/i);
                
                if (directMatch && directMatch[1]) {
                    console.log('🎥 Найдено видео:', directMatch[1]);
                    playVideo(directMatch[1], movieData.title);
                    if (activity && activity.loader) activity.loader(false);
                } else {
                    console.log('❌ Плеер не найден на странице');
                    if (activity && activity.loader) activity.loader(false);
                    Lampa.Noty.show('Плеер не найден');
                }
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
                // Ищем видео в коде плеера
                let videoMatch = html.match(/file["']?\s*:\s*["']([^"']+\.(mp4|m3u8)[^"']*)["']/i) ||
                                html.match(/<source[^>]+src="([^"]+\.(mp4|m3u8)[^"]*)"[^>]*>/i) ||
                                html.match(/src:\s*['"]([^'"]+\.(mp4|m3u8)[^'"]*)['"]/i);
                
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
        
        // Проверяем, нужно ли добавить прокси к видео URL
        if (!url.startsWith('http')) {
            url = 'https://asilmedia.org' + (url.startsWith('/') ? '' : '/') + url;
        }
        
        Lampa.Player.play({
            url: url,
            title: title
        });
    }

    // Функция добавления кнопки
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

    // Запуск
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

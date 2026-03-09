// Asilmedia плагин для Lampa - СТАБИЛЬНАЯ ВЕРСИЯ
// Версия 19.0 - кнопка появляется гарантированно

(function() {
    console.log('🚀 Asilmedia: Запуск стабильной версии');

    // ========== ФУНКЦИЯ ДОБАВЛЕНИЯ КНОПКИ (ПРОВЕРЕННАЯ) ==========
    function addAsilmediaButton() {
        console.log('🔘 Добавляем кнопку Asilmedia...');

        Lampa.Listener.follow('full', function(event) {
            if (event.type === 'complite' && event.data && event.data.movie) {
                let movie = event.data.movie;

                // Ждем появления контейнера с кнопками
                setTimeout(function() {
                    let buttonsContainer = event.object.activity.render().find('.full-start-new__buttons');
                    
                    if (buttonsContainer.length) {
                        // Проверяем, нет ли уже такой кнопки
                        if (buttonsContainer.find('.view--asilmedia').length) {
                            console.log('⏭️ Кнопка Asilmedia уже существует');
                            return;
                        }

                        // Создаем кнопку
                        let button = $(`
                            <div class="full-start__button selector view--asilmedia">
                                <svg width="24" height="24" viewBox="0 0 24 24">
                                    <path d="M4 4H20V20H4V4Z" stroke="currentColor" stroke-width="2"/>
                                    <circle cx="12" cy="12" r="4" fill="currentColor"/>
                                </svg>
                                <span>Asilmedia</span>
                            </div>
                        `);

                        // Добавляем обработчик нажатия
                        button.on('hover:enter', function() {
                            console.log('🎬 Нажата кнопка Asilmedia для:', movie.title);
                            searchOnAsilmedia(movie);
                        });

                        // Добавляем кнопку в конец контейнера
                        buttonsContainer.append(button);
                        console.log('✅ Кнопка Asilmedia добавлена');
                    } else {
                        console.log('⚠️ Контейнер кнопок не найден');
                    }
                }, 500);
            }
        });
    }

    // ========== ФУНКЦИИ ПОИСКА (ПОСЛЕДНЯЯ РАБОЧАЯ ВЕРСИЯ) ==========

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
                // Ищем все ссылки
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
                
                // Ищем ссылки на фильмы (формат из HAR)
                let filmLinks = allLinks.filter(function(url) {
                    return url.includes('.html') && url.match(/\d+-[a-z-]+-tarjima/);
                });
                
                console.log('🎬 Найдено ссылок на фильмы:', filmLinks.length);
                console.log('📋 Ссылки на фильмы:', filmLinks);
                
                if (filmLinks.length > 0) {
                    let filmPath = filmLinks[0];
                    console.log('✅ Выбрана ссылка:', filmPath);
                    
                    if (!filmPath.startsWith('http')) {
                        filmPath = (filmPath.startsWith('/') ? '' : '/') + filmPath;
                    }
                    
                    let baseProxy = proxy.split('?')[0];
                    baseProxy = baseProxy.replace(/\/$/, '');
                    filmPath = filmPath.replace(/^\//, '');
                    
                    let filmUrl = baseProxy + '/' + filmPath;
                    console.log('📄 Загружаем страницу фильма:', filmUrl);
                    Lampa.Noty.show('Фильм найден! Загружаем...');
                    loadFilmPage(filmUrl, currentMovieData, currentNetwork, baseProxy, currentActivity);
                } else {
                    console.log('❌ Ссылки на фильмы не найдены');
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
    
    function loadFilmPage(url, movieData, network, baseProxy, activity) {
        console.log('📄 Загрузка страницы фильма:', url);
        
        network.silent(url, function(html) {
            console.log('✅ Страница фильма загружена, длина:', html.length);
            
            if (html && html.length > 1000) {
                // Ищем плеер
                let playerMatch = html.match(/<iframe[^>]+src="([^"]+player[^"]*)"[^>]*>/i) ||
                                 html.match(/src="([^"]*\/player\/player\.html\?[^"]*)"/i);
                
                if (playerMatch) {
                    let playerPath = playerMatch[1] || playerMatch[0];
                    console.log('🎮 Найден плеер:', playerPath);
                    
                    // Проксируем запрос к плееру
                    let playerUrl = baseProxy + '/' + playerPath.replace(/^\//, '');
                    console.log('🎮 Загружаем плеер через прокси:', playerUrl);
                    loadPlayerPage(playerUrl, movieData, network, activity);
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
                let videoMatch = html.match(/file["']?\s*:\s*["']([^"']+\.(mp4|m3u8)[^"']*)["']/i);
                
                if (videoMatch && videoMatch[1]) {
                    let videoUrl = videoMatch[1];
                    console.log('✅ Видео найдено в плеере:', videoUrl);
                    playVideo(videoUrl, movieData.title);
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
        Lampa.Player.play({ url: url, title: title });
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

    // ========== ЗАПУСК ==========
    function init() {
        if (window.Lampa && Lampa.Listener) {
            console.log('✅ Lampa готова');
            addAsilmediaButton();
        } else {
            console.log('⏳ Ожидание Lampa...');
            setTimeout(init, 500);
        }
    }

    init();
    console.log('📦 Asilmedia плагин инициализирован');
})();

// Asilmedia плагин для Lampa - отдельная кнопка
// Версия 1.0
// GitHub: https://github.com/asilmedia/lampa-asilmedia-plugin

(function() {
    // Проверяем загрузку Lampa
    if (!window.Lampa) {
        setTimeout(arguments.callee, 100);
        return;
    }

    console.log('📦 Загрузка Asilmedia плагина...');

    // Функция поиска на Asilmedia
    function searchOnAsilmedia(movieData) {
        console.log('🔍 Поиск на Asilmedia:', movieData.title);
        
        let activity = Lampa.Activity.active();
        activity.loader(true);
        
        // Используем прокси
        let proxy = 'https://cors.byskazu.workers.dev/?';
        let baseUrl = 'https://asilmedia.org';
        let searchUrl = proxy + baseUrl + '/?do=search&subaction=search&story=' + encodeURIComponent(movieData.title);
        
        let network = new Lampa.Reguest();
        
        network.silent(searchUrl, function(html) {
            if (html && html.length > 0) {
                // Ищем ссылку на фильм
                let linkMatch = html.match(/<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi);
                let foundUrl = null;
                
                if (linkMatch) {
                    for (let link of linkMatch) {
                        if (link.includes('class="title"') || link.includes('/film/') || link.includes('/movie/')) {
                            let urlMatch = link.match(/href="([^"]+)"/i);
                            if (urlMatch) {
                                foundUrl = urlMatch[1];
                                break;
                            }
                        }
                    }
                }
                
                if (foundUrl) {
                    if (!foundUrl.startsWith('http')) {
                        foundUrl = baseUrl + (foundUrl.startsWith('/') ? '' : '/') + foundUrl;
                    }
                    loadFilmPage(foundUrl, movieData, network, proxy);
                } else {
                    showError('Фильм не найден на Asilmedia');
                    activity.loader(false);
                }
            } else {
                showError('Сайт Asilmedia недоступен');
                activity.loader(false);
            }
        }, function() {
            showError('Ошибка соединения');
            activity.loader(false);
        }, false, { dataType: 'text' });
    }
    
    function loadFilmPage(url, movieData, network, proxy) {
        network.silent(proxy + url, function(html) {
            if (html) {
                // Ищем плеер
                let playerMatch = html.match(/<iframe[^>]+src="([^"]+player[^"]*)"[^>]*>/i) ||
                                 html.match(/player\.php[^"'\s]+/i);
                
                if (playerMatch) {
                    let playerUrl = playerMatch[1] || playerMatch[0];
                    if (!playerUrl.startsWith('http')) {
                        playerUrl = 'https://asilmedia.org' + (playerUrl.startsWith('/') ? '' : '/') + playerUrl;
                    }
                    loadPlayerPage(playerUrl, movieData, network, proxy);
                } else {
                    // Прямая ссылка
                    let directMatch = html.match(/href="([^"]+\.(mp4|m3u8)[^"]*)"/i) ||
                                    html.match(/source src="([^"]+\.(mp4|m3u8)[^"]*)"/i);
                    
                    if (directMatch) {
                        playVideo(directMatch[1], movieData.title);
                        Lampa.Activity.active().loader(false);
                    } else {
                        showError('Плеер не найден');
                        Lampa.Activity.active().loader(false);
                    }
                }
            }
        }, function() {
            showError('Ошибка загрузки страницы');
            Lampa.Activity.active().loader(false);
        }, false, { dataType: 'text' });
    }
    
    function loadPlayerPage(url, movieData, network, proxy) {
        network.silent(proxy + url, function(html) {
            if (html) {
                let videoMatch = html.match(/file["']?\s*:\s*["']([^"']+\.(mp4|m3u8)[^"']*)["']/i) ||
                                html.match(/<source[^>]+src="([^"]+\.(mp4|m3u8)[^"]*)"[^>]*>/i);
                
                if (videoMatch) {
                    playVideo(videoMatch[1], movieData.title);
                } else {
                    showError('Видео не найдено');
                }
            }
            Lampa.Activity.active().loader(false);
        }, function() {
            showError('Ошибка загрузки плеера');
            Lampa.Activity.active().loader(false);
        }, false, { dataType: 'text' });
    }
    
    function playVideo(url, title) {
        Lampa.Player.play({
            url: url,
            title: title
        });
    }
    
    function showError(text) {
        Lampa.Noty.show(text);
    }

    // Функция создания кнопки
    function addAsilmediaButton() {
        console.log('🔘 Добавляем кнопку Asilmedia...');
        
        Lampa.Listener.follow('full', function(event) {
            if (event.type === 'complite' && event.data && event.data.movie) {
                let movie = event.data.movie;
                
                // Создаем кнопку
                let button = $(`
                    <div class="full-start__button selector view--asilmedia">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
                
                // Добавляем кнопку после существующей кнопки "Онлайн"
                let onlineButton = event.object.activity.render().find('.view--online');
                if (onlineButton.length) {
                    onlineButton.after(button);
                } else {
                    // Если нет кнопки онлайн, добавляем в начало
                    event.object.activity.render().find('.full-start__buttons').prepend(button);
                }
                
                console.log('✅ Кнопка Asilmedia добавлена');
            }
        });
    }

    // Ждем полной загрузки Lampa
    function init() {
        if (window.Lampa && Lampa.Listener && Lampa.Listener.follow) {
            console.log('✅ Lampa готова, добавляем кнопку');
            addAsilmediaButton();
        } else {
            console.log('⏳ Ожидание Lampa...');
            setTimeout(init, 200);
        }
    }

    init();
    console.log('📦 Asilmedia плагин инициализирован');
})();

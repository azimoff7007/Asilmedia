// Asilmedia плагин для Lampa - отдельная кнопка
// Версия 1.1
// GitHub: https://github.com/asilmedia/lampa-asilmedia-plugin

(function() {
    // Проверяем загрузку Lampa
    if (!window.Lampa) {
        console.log('⏳ Ожидание Lampa...');
        setTimeout(arguments.callee, 500);
        return;
    }

    console.log('📦 Загрузка Asilmedia плагина...');

    // Функция поиска на Asilmedia
    function searchOnAsilmedia(movieData) {
        console.log('🔍 Поиск на Asilmedia:', movieData.title);
        
        let activity = Lampa.Activity.active();
        if (activity && activity.loader) {
            activity.loader(true);
        }
        
        // Используем прокси
        let proxy = 'https://cors.byskazu.workers.dev/?';
        let baseUrl = 'https://asilmedia.org';
        let searchUrl = proxy + baseUrl + '/?do=search&subaction=search&story=' + encodeURIComponent(movieData.title);
        
        let network = new Lampa.Reguest();
        
        network.silent(searchUrl, function(html) {
            if (html && html.length > 0) {
                console.log('✅ Получен ответ от Asilmedia');
                
                // Ищем ссылку на фильм
                let linkMatch = html.match(/<a[^>]+href="([^"]+)"[^>]*class="[^"]*title[^"]*"[^>]*>/i) ||
                               html.match(/<h2[^>]*><a[^>]+href="([^"]+)"[^>]*>/i) ||
                               html.match(/<a[^>]+href="([^"]+)"[^>]*>[^<]*фильм[^<]*<\/a>/i);
                
                if (linkMatch && linkMatch[1]) {
                    let filmUrl = linkMatch[1];
                    if (!filmUrl.startsWith('http')) {
                        filmUrl = baseUrl + (filmUrl.startsWith('/') ? '' : '/') + filmUrl;
                    }
                    console.log('📺 Найдена страница фильма:', filmUrl);
                    loadFilmPage(filmUrl, movieData, network, proxy);
                } else {
                    console.log('❌ Фильм не найден');
                    if (activity && activity.loader) activity.loader(false);
                    Lampa.Noty.show('Фильм не найден на Asilmedia');
                }
            } else {
                console.log('❌ Нет ответа от Asilmedia');
                if (activity && activity.loader) activity.loader(false);
                Lampa.Noty.show('Сайт Asilmedia недоступен');
            }
        }, function(error) {
            console.log('❌ Ошибка соединения:', error);
            if (activity && activity.loader) activity.loader(false);
            Lampa.Noty.show('Ошибка соединения с Asilmedia');
        }, false, { dataType: 'text' });
    }
    
    function loadFilmPage(url, movieData, network, proxy) {
        network.silent(proxy + url, function(html) {
            if (html) {
                console.log('📄 Загружена страница фильма');
                
                // Ищем плеер
                let playerMatch = html.match(/<iframe[^>]+src="([^"]+player[^"]*)"[^>]*>/i) ||
                                 html.match(/player\.php[^"'\s]+/i);
                
                if (playerMatch) {
                    let playerUrl = playerMatch[1] || playerMatch[0];
                    if (!playerUrl.startsWith('http')) {
                        playerUrl = 'https://asilmedia.org' + (playerUrl.startsWith('/') ? '' : '/') + playerUrl;
                    }
                    console.log('🎮 Найден плеер:', playerUrl);
                    loadPlayerPage(playerUrl, movieData, network, proxy);
                    return;
                }
                
                // Ищем прямую ссылку
                let directMatch = html.match(/href="([^"]+\.(mp4|m3u8)[^"]*)"[^>]*>Смотреть/i) ||
                                html.match(/source src="([^"]+\.(mp4|m3u8)[^"]*)"/i) ||
                                html.match(/video[^>]+src="([^"]+\.(mp4|m3u8)[^"]*)"[^>]*>/i);
                
                if (directMatch && directMatch[1]) {
                    console.log('🎥 Найдено видео:', directMatch[1]);
                    playVideo(directMatch[1], movieData.title);
                    if (Lampa.Activity.active().loader) Lampa.Activity.active().loader(false);
                } else {
                    console.log('❌ Плеер не найден');
                    if (Lampa.Activity.active().loader) Lampa.Activity.active().loader(false);
                    Lampa.Noty.show('Плеер не найден на странице');
                }
            }
        }, function(error) {
            console.log('❌ Ошибка загрузки страницы:', error);
            if (Lampa.Activity.active().loader) Lampa.Activity.active().loader(false);
            Lampa.Noty.show('Ошибка загрузки страницы фильма');
        }, false, { dataType: 'text' });
    }
    
    function loadPlayerPage(url, movieData, network, proxy) {
        network.silent(proxy + url, function(html) {
            if (html) {
                console.log('🎬 Загружена страница плеера');
                
                // Ищем видео в разных форматах
                let videoMatch = html.match(/file["']?\s*:\s*["']([^"']+\.(mp4|m3u8)[^"']*)["']/i) ||
                                html.match(/<source[^>]+src="([^"]+\.(mp4|m3u8)[^"]*)"[^>]*>/i) ||
                                html.match(/video[^>]+src="([^"]+\.(mp4|m3u8)[^"]*)"[^>]*>/i) ||
                                html.match(/src:\s*['"]([^'"]+\.(mp4|m3u8)[^'"]*)['"]/i);
                
                if (videoMatch && videoMatch[1]) {
                    console.log('✅ Видео найдено:', videoMatch[1]);
                    playVideo(videoMatch[1], movieData.title);
                } else {
                    console.log('❌ Видео не найдено в плеере');
                    Lampa.Noty.show('Видео не найдено');
                }
            } else {
                console.log('❌ Пустой ответ от плеера');
                Lampa.Noty.show('Не удалось загрузить плеер');
            }
            if (Lampa.Activity.active().loader) Lampa.Activity.active().loader(false);
        }, function(error) {
            console.log('❌ Ошибка загрузки плеера:', error);
            if (Lampa.Activity.active().loader) Lampa.Activity.active().loader(false);
            Lampa.Noty.show('Ошибка загрузки плеера');
        }, false, { dataType: 'text' });
    }
    
    function playVideo(url, title) {
        console.log('▶️ Запуск видео:', url);
        Lampa.Player.play({
            url: url,
            title: title,
            subtitles: false
        });
    }

    // Функция создания кнопки
    function addAsilmediaButton() {
        console.log('🔘 Добавляем кнопку Asilmedia...');
        
        // Ждем появления кнопок на странице фильма
        Lampa.Listener.follow('full', function(event) {
            if (event.type === 'complite' && event.data && event.data.movie) {
                let movie = event.data.movie;
                
                // Немного ждем, чтобы DOM обновился
                setTimeout(function() {
                    // Ищем контейнер с кнопками
                    let buttonsContainer = event.object.activity.render().find('.full-start__buttons');
                    
                    if (buttonsContainer.length) {
                        // Проверяем, нет ли уже такой кнопки
                        if (buttonsContainer.find('.view--asilmedia').length) {
                            console.log('⏭️ Кнопка Asilmedia уже существует');
                            return;
                        }
                        
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
                        
                        // Добавляем кнопку после кнопки "Онлайн"
                        let onlineButton = buttonsContainer.find('.view--online');
                        if (onlineButton.length) {
                            onlineButton.after(button);
                        } else {
                            buttonsContainer.prepend(button);
                        }
                        
                        console.log('✅ Кнопка Asilmedia добавлена');
                    } else {
                        console.log('⚠️ Контейнер с кнопками не найден');
                    }
                }, 500);
            }
        });
        
        // Добавляем пункт в настройки
        setTimeout(function() {
            if (Lampa.Settings && Lampa.Settings.main) {
                console.log('⚙️ Добавляем настройки Asilmedia');
                // Здесь можно добавить настройки плагина
            }
        }, 2000);
    }

    // Ждем полной загрузки Lampa
    function init() {
        if (window.Lampa && Lampa.Listener && Lampa.Listener.follow) {
            console.log('✅ Lampa готова, добавляем кнопку');
            addAsilmediaButton();
        } else {
            console.log('⏳ Ожидание Lampa...');
            setTimeout(init, 500);
        }
    }

    // Запускаем инициализацию
    init();
    console.log('📦 Asilmedia плагин инициализирован');
})();

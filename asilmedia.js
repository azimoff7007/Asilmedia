// Asilmedia плагин для Lampa - РАБОЧАЯ ВЕРСИЯ
// Версия 4.0 - использует встроенный прокси Lampa

(function() {
    console.log('🚀 Asilmedia: Запуск плагина');
    
    // База узбекских названий (можно дополнять)
    const uzTitles = {
        'Интерстеллар': 'Interstellar',
        'Аватар': 'Avatar',
        'Титаник': 'Titanik',
        'Форсаж': 'Tez va g\'azabli',
        'Мстители': 'Qasoskorlar',
        'Гарри Поттер': 'Harry Potter',
        'Матрица': 'Matritsa',
        'Терминатор': 'Terminator',
        'Звездные войны': 'Yulduzlar jangi',
        'Человек-паук': 'O\'rgimchak-odam',
        'Бэтмен': 'Betmen'
    };
    
    function getSearchTitle(movieData) {
        // Сначала пробуем узбекское название из базы
        if (uzTitles[movieData.title]) {
            console.log('✅ Узбекское название:', uzTitles[movieData.title]);
            return uzTitles[movieData.title];
        }
        
        // Пробуем оригинальное название (английское)
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
        
        // Получаем название для поиска
        let searchTitle = getSearchTitle(movieData);
        console.log('🔎 Ищем как:', searchTitle);
        
        // ИСПОЛЬЗУЕМ ВСТРОЕННЫЙ ПРОКСИ LAMPA
        // Это самое надежное решение!
        let proxy = 'https://api.allorigins.win/raw?url=';
        let baseUrl = 'https://asilmedia.org';
        let searchUrl = baseUrl + '/?do=search&subaction=search&story=' + encodeURIComponent(searchTitle);
        let fullUrl = proxy + encodeURIComponent(searchUrl);
        
        console.log('📡 Запрос через AllOrigins:', fullUrl);
        
        let network = new Lampa.Reguest();
        
        network.silent(fullUrl, function(html) {
            console.log('✅ Получен ответ, длина:', html ? html.length : 0);
            
            if (html && html.length > 100) {
                // Ищем ссылки на фильмы
                let links = [];
                let linkMatch = html.match(/<a[^>]+href="([^"]+)"[^>]*class="[^"]*title[^"]*"[^>]*>/gi);
                
                if (linkMatch) {
                    linkMatch.forEach(function(match) {
                        let urlMatch = match.match(/href="([^"]+)"/i);
                        if (urlMatch && urlMatch[1]) {
                            links.push(urlMatch[1]);
                        }
                    });
                }
                
                if (links.length > 0) {
                    let filmUrl = links[0];
                    if (!filmUrl.startsWith('http')) {
                        filmUrl = baseUrl + (filmUrl.startsWith('/') ? '' : '/') + filmUrl;
                    }
                    console.log('🎬 Найдена страница:', filmUrl);
                    Lampa.Noty.show('Загружаем фильм...');
                    loadFilmPage(filmUrl, movieData, network, proxy, activity);
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
    
    function loadFilmPage(url, movieData, network, proxy, activity) {
        let fullUrl = proxy + encodeURIComponent(url);
        
        network.silent(fullUrl, function(html) {
            if (html && html.length > 100) {
                // Ищем плеер
                let playerMatch = html.match(/<iframe[^>]+src="([^"]+player[^"]*)"[^>]*>/i) ||
                                 html.match(/player\.php[^"'\s]+/i);
                
                if (playerMatch) {
                    let playerUrl = playerMatch[1] || playerMatch[0];
                    if (!playerUrl.startsWith('http')) {
                        playerUrl = 'https://asilmedia.org' + (playerUrl.startsWith('/') ? '' : '/') + playerUrl;
                    }
                    console.log('🎮 Загружаем плеер:', playerUrl);
                    loadPlayerPage(playerUrl, movieData, network, proxy, activity);
                    return;
                }
                
                // Ищем прямую ссылку
                let directMatch = html.match(/href="([^"]+\.(mp4|m3u8)[^"]*)"[^>]*>Смотреть/i) ||
                                html.match(/source src="([^"]+\.(mp4|m3u8)[^"]*)"/i);
                
                if (directMatch && directMatch[1]) {
                    console.log('🎥 Найдено видео:', directMatch[1]);
                    playVideo(directMatch[1], movieData.title);
                    if (activity && activity.loader) activity.loader(false);
                } else {
                    console.log('❌ Плеер не найден');
                    if (activity && activity.loader) activity.loader(false);
                    Lampa.Noty.show('Плеер не найден');
                }
            }
        }, function(error) {
            console.log('❌ Ошибка загрузки страницы');
            if (activity && activity.loader) activity.loader(false);
            Lampa.Noty.show('Ошибка загрузки');
        }, false, { dataType: 'text' });
    }
    
    function loadPlayerPage(url, movieData, network, proxy, activity) {
        let fullUrl = proxy + encodeURIComponent(url);
        
        network.silent(fullUrl, function(html) {
            if (html && html.length > 100) {
                let videoMatch = html.match(/file["']?\s*:\s*["']([^"']+\.(mp4|m3u8)[^"']*)["']/i) ||
                                html.match(/<source[^>]+src="([^"]+\.(mp4|m3u8)[^"]*)"[^>]*>/i);
                
                if (videoMatch && videoMatch[1]) {
                    console.log('✅ Видео найдено!');
                    playVideo(videoMatch[1], movieData.title);
                } else {
                    console.log('❌ Видео не найдено');
                    Lampa.Noty.show('Видео не найдено');
                }
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

    function addAsilmediaButton() {
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
                                <span>Asilmedia (uz)</span>
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
            addAsilmediaButton();
        } else {
            setTimeout(init, 500);
        }
    }

    init();
    console.log('📦 Asilmedia плагин загружен');
})();

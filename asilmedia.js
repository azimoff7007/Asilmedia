// Asilmedia плагин для Lampa - УЗБЕКСКАЯ ВЕРСИЯ
// Версия 3.0 - с поддержкой узбекского языка

(function() {
    console.log('🚀 Asilmedia: Запуск плагина (узбекская версия)');
    
    // База данных узбекских названий популярных фильмов
    // (можно расширять)
    const uzTitles = {
        // Русское название: Узбекское название
        'Интерстеллар': 'Interstellar',
        'Аватар': 'Avatar',
        'Титаник': 'Titanik',
        'Форсаж': 'Tez va g\'azabli',
        'Мстители': 'Qasoskorlar',
        'Хоббит': 'Xobbit',
        'Властелин колец': 'Uzuklar hukmdori',
        'Гарри Поттер': 'Harry Potter',
        'Пираты карибского моря': 'Karib dengizi qaroqchilari',
        'Трансформеры': 'Transformers',
        'Матрица': 'Matritsa',
        'Терминатор': 'Terminator',
        'Рэмбо': 'Rembo',
        'Рокки': 'Rokki',
        'Звездные войны': 'Yulduzlar jangi',
        'Человек-паук': 'O\'rgimchak-odam',
        'Бэтмен': 'Betmen',
        'Супермен': 'Supermen',
        'Люди Икс': 'Iks odamlar',
        'Шрек': 'Shrek',
        'Мадагаскар': 'Madagaskar',
        'Ледниковый период': 'Muzlik davri',
        'Король лев': 'Qirol sher',
        'Аладдин': 'Aladdin',
        'Золушка': 'Zolushka',
        'Белоснежка': 'Qorqiz',
        'Рапунцель': 'Rapunzel',
        'Холодное сердце': 'Sovuq qalb',
        'Моана': 'Moana',
        'Головоломка': 'Bosh qotirma',
        'Тайна Коко': 'Koko siri',
        'Душа': 'Jon',
        'Лука': 'Luka',
        'Энканто': 'Enkanto'
    };
    
    function getUzbekTitle(russianTitle) {
        // Ищем в базе данных
        if (uzTitles[russianTitle]) {
            console.log('✅ Найдено узбекское название:', uzTitles[russianTitle]);
            return uzTitles[russianTitle];
        }
        
        // Если не нашли, используем оригинальное название (на английском)
        let movie = Lampa.Activity.active().movie;
        if (movie && movie.original_title) {
            console.log('📝 Используем оригинальное название:', movie.original_title);
            return movie.original_title;
        }
        
        // В крайнем случае - русское название
        console.log('⚠️ Используем русское название (может не найтись)');
        return russianTitle;
    }
    
    function searchOnAsilmedia(movieData) {
        console.log('🔍 Поиск на Asilmedia:', movieData.title);
        
        let activity = Lampa.Activity.active();
        if (activity && activity.loader) {
            activity.loader(true);
        }
        
        // Получаем название для поиска
        let searchTitle = getUzbekTitle(movieData.title);
        console.log('🔎 Ищем как:', searchTitle);
        
        Lampa.Noty.show('Ищем: ' + searchTitle);
        
        // СПИСОК РАБОЧИХ ПРОКСИ
        let proxies = [
            'https://api.allorigins.win/raw?url=',
            'https://cors-anywhere.herokuapp.com/',
            'https://proxy.cors.sh/',
            'https://cors.eu.org/',
            'https://thingproxy.freeboard.io/fetch/'
        ];
        
        // Пробуем первый прокси
        tryProxy(0, searchTitle, movieData, activity);
    }
    
    function tryProxy(index, searchTitle, movieData, activity) {
        let proxies = [
            'https://api.allorigins.win/raw?url=',
            'https://cors-anywhere.herokuapp.com/',
            'https://proxy.cors.sh/',
            'https://cors.eu.org/',
            'https://thingproxy.freeboard.io/fetch/'
        ];
        
        if (index >= proxies.length) {
            console.log('❌ Все прокси перепробованы');
            if (activity && activity.loader) activity.loader(false);
            Lampa.Noty.show('Не удалось подключиться к Asilmedia');
            return;
        }
        
        let proxy = proxies[index];
        let baseUrl = 'https://asilmedia.org';
        let searchUrl = proxy + encodeURIComponent(baseUrl + '/?do=search&subaction=search&story=' + encodeURIComponent(searchTitle));
        
        console.log(`📡 Пробуем прокси ${index + 1}:`, proxy);
        console.log('📡 URL:', searchUrl);
        
        let network = new Lampa.Reguest();
        
        network.silent(searchUrl, function(html) {
            console.log(`✅ Прокси ${index + 1} ответил, длина:`, html ? html.length : 0);
            
            if (html && html.length > 100) {
                // Сохраняем HTML для отладки
                console.log('📄 Первые 500 символов ответа:', html.substring(0, 500));
                
                // Ищем ссылки на фильмы
                let links = [];
                
                // Паттерны для поиска ссылок
                let patterns = [
                    /<a[^>]+href="([^"]+)"[^>]*class="[^"]*title[^"]*"[^>]*>/gi,
                    /<h2[^>]*><a[^>]+href="([^"]+)"[^>]*>/gi,
                    /<div[^>]*class="[^"]*shortstory[^"]*"[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>/gi
                ];
                
                for (let pattern of patterns) {
                    let matches = html.matchAll(pattern);
                    for (let match of matches) {
                        if (match[1] && !links.includes(match[1])) {
                            links.push(match[1]);
                        }
                    }
                }
                
                console.log('📺 Найдено ссылок:', links.length);
                
                if (links.length > 0) {
                    // Берем первую ссылку
                    let filmUrl = links[0];
                    if (!filmUrl.startsWith('http')) {
                        filmUrl = baseUrl + (filmUrl.startsWith('/') ? '' : '/') + filmUrl;
                    }
                    console.log('🎬 Переходим по ссылке:', filmUrl);
                    Lampa.Noty.show('Найдено! Загружаем страницу...');
                    loadFilmPage(filmUrl, movieData, network, proxy, activity);
                } else {
                    console.log('❌ Ссылки не найдены');
                    if (activity && activity.loader) activity.loader(false);
                    Lampa.Noty.show('Фильм не найден на Asilmedia');
                }
            } else {
                console.log('❌ Пустой ответ');
                tryProxy(index + 1, searchTitle, movieData, activity);
            }
        }, function(error) {
            console.log(`❌ Прокси ${index + 1} не работает:`, error);
            tryProxy(index + 1, searchTitle, movieData, activity);
        }, false, { dataType: 'text' });
    }
    
    function loadFilmPage(url, movieData, network, proxy, activity) {
        console.log('📄 Загрузка страницы фильма:', url);
        
        network.silent(proxy + encodeURIComponent(url), function(html) {
            console.log('✅ Страница фильма загружена, длина:', html.length);
            
            if (html && html.length > 100) {
                // Ищем плеер
                let playerMatch = html.match(/<iframe[^>]+src="([^"]+player[^"]*)"[^>]*>/i) ||
                                 html.match(/player\.php[^"'\s]+/i) ||
                                 html.match(/src="([^"]*\/player\/[^"]*)"/i);
                
                if (playerMatch) {
                    let playerUrl = playerMatch[1] || playerMatch[0];
                    if (!playerUrl.startsWith('http')) {
                        playerUrl = 'https://asilmedia.org' + (playerUrl.startsWith('/') ? '' : '/') + playerUrl;
                    }
                    console.log('🎮 Найден плеер:', playerUrl);
                    Lampa.Noty.show('Загружаем плеер...');
                    loadPlayerPage(playerUrl, movieData, network, proxy, activity);
                    return;
                }
                
                // Ищем прямую ссылку на видео
                let directMatch = html.match(/href="([^"]+\.(mp4|m3u8)[^"]*)"[^>]*>/i) ||
                                html.match(/source src="([^"]+\.(mp4|m3u8)[^"]*)"/i) ||
                                html.match(/file:\s*["']([^"']+\.(mp4|m3u8)[^"']*)["']/i);
                
                if (directMatch && directMatch[1]) {
                    console.log('🎥 Найдено видео:', directMatch[1]);
                    playVideo(directMatch[1], movieData.title);
                    if (activity && activity.loader) activity.loader(false);
                } else {
                    console.log('❌ Плеер не найден');
                    if (activity && activity.loader) activity.loader(false);
                    Lampa.Noty.show('Плеер не найден на странице');
                }
            }
        }, function(error) {
            console.log('❌ Ошибка загрузки страницы:', error);
            if (activity && activity.loader) activity.loader(false);
            Lampa.Noty.show('Ошибка загрузки страницы фильма');
        }, false, { dataType: 'text' });
    }
    
    function loadPlayerPage(url, movieData, network, proxy, activity) {
        console.log('🎬 Загрузка плеера:', url);
        
        network.silent(proxy + encodeURIComponent(url), function(html) {
            console.log('✅ Плеер загружен, длина:', html.length);
            
            if (html && html.length > 100) {
                // Ищем видео
                let videoMatch = html.match(/file["']?\s*:\s*["']([^"']+\.(mp4|m3u8)[^"']*)["']/i) ||
                                html.match(/<source[^>]+src="([^"]+\.(mp4|m3u8)[^"]*)"[^>]*>/i) ||
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
            if (activity && activity.loader) activity.loader(false);
        }, function(error) {
            console.log('❌ Ошибка загрузки плеера:', error);
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
        console.log('🔘 Добавляем кнопку Asilmedia...');
        
        Lampa.Listener.follow('full', function(event) {
            if (event.type === 'complite' && event.data && event.data.movie) {
                let movie = event.data.movie;
                
                setTimeout(function() {
                    let buttonsContainer = event.object.activity.render().find('.full-start-new__buttons');
                    
                    if (buttonsContainer.length) {
                        if (buttonsContainer.find('.view--asilmedia').length) {
                            return;
                        }
                        
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
                            console.log('🎬 Нажата кнопка Asilmedia для:', movie.title);
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

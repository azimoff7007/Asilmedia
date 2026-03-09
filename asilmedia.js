// Asilmedia плагин для Lampa - ПРАВИЛЬНЫЙ ПАРСИНГ
// Версия 5.0 - с анализом реальной структуры сайта

(function() {
    console.log('🚀 Asilmedia: Запуск плагина');
    
    // Функция для получения названия для поиска
    function getSearchTitle(movieData) {
        // Для теста используем Interstellar
        if (movieData.title === 'Интерстеллар' || movieData.original_title === 'Interstellar') {
            return 'Interstellar';
        }
        
        // Для других фильмов пробуем оригинальное название
        if (movieData.original_title) {
            return movieData.original_title;
        }
        
        return movieData.title;
    }
    
    function searchOnAsilmedia(movieData) {
        console.log('🔍 Поиск на Asilmedia для:', movieData.title);
        
        let activity = Lampa.Activity.active();
        if (activity && activity.loader) {
            activity.loader(true);
        }
        
        let searchTitle = getSearchTitle(movieData);
        console.log('🔎 Ищем как:', searchTitle);
        
        // Используем AllOrigins (он работает лучше всех)
        let proxy = 'https://api.allorigins.win/raw?url=';
        let baseUrl = 'https://asilmedia.org';
        
        // Формируем URL поиска
        let searchUrl = baseUrl + '/?do=search&subaction=search&story=' + encodeURIComponent(searchTitle);
        let fullUrl = proxy + encodeURIComponent(searchUrl);
        
        console.log('📡 Запрос:', fullUrl);
        
        let network = new Lampa.Reguest();
        
        network.silent(fullUrl, function(html) {
            console.log('✅ Получен ответ, длина:', html ? html.length : 0);
            
            if (html && html.length > 1000) {
                // Сохраняем HTML для анализа
                console.log('📄 Первые 1000 символов:', html.substring(0, 1000));
                
                // РАСШИРЕННЫЙ ПОИСК ССЫЛОК
                let links = [];
                
                // 1. Ищем все ссылки на странице
                let allLinks = html.match(/<a[^>]+href="([^"]+)"[^>]*>/gi);
                if (allLinks) {
                    console.log('🔗 Всего ссылок на странице:', allLinks.length);
                    
                    allLinks.forEach(function(link) {
                        let hrefMatch = link.match(/href="([^"]+)"/i);
                        if (hrefMatch && hrefMatch[1]) {
                            let url = hrefMatch[1];
                            
                            // Фильтруем только ссылки на фильмы
                            if (url.includes('/film/') || 
                                url.includes('/movie/') || 
                                url.includes('/kino/') ||
                                url.includes('.html') ||
                                !url.includes('do=') && !url.includes('#')) {
                                
                                if (!links.includes(url)) {
                                    links.push(url);
                                }
                            }
                        }
                    });
                }
                
                // 2. Ищем заголовки фильмов
                let titleMatches = html.match(/<h2[^>]*>(.*?)<\/h2>/gi);
                if (titleMatches) {
                    console.log('📌 Заголовки найдены:', titleMatches.length);
                    
                    titleMatches.forEach(function(title) {
                        let linkMatch = title.match(/<a[^>]+href="([^"]+)"[^>]*>/i);
                        if (linkMatch && linkMatch[1]) {
                            let url = linkMatch[1];
                            if (!links.includes(url)) {
                                links.push(url);
                            }
                        }
                    });
                }
                
                // 3. Ищем div'ы с контентом
                let contentDivs = html.match(/<div[^>]*class="[^"]*(short|story|movie|film)[^"]*"[^>]*>[\s\S]*?<\/div>/gi);
                if (contentDivs) {
                    console.log('📦 Блоки контента:', contentDivs.length);
                    
                    contentDivs.forEach(function(div) {
                        let linkMatch = div.match(/<a[^>]+href="([^"]+)"[^>]*>/i);
                        if (linkMatch && linkMatch[1]) {
                            let url = linkMatch[1];
                            if (!links.includes(url) && 
                                !url.includes('do=') && 
                                url.length > 10) {
                                links.push(url);
                            }
                        }
                    });
                }
                
                console.log('🎯 Найдено ссылок на фильмы:', links.length);
                console.log('📋 Первые 5 ссылок:', links.slice(0, 5));
                
                if (links.length > 0) {
                    // Берем первую подходящую ссылку
                    let filmUrl = links[0];
                    if (!filmUrl.startsWith('http')) {
                        filmUrl = baseUrl + (filmUrl.startsWith('/') ? '' : '/') + filmUrl;
                    }
                    console.log('🎬 Переходим по ссылке:', filmUrl);
                    Lampa.Noty.show('Фильм найден! Загружаем...');
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
        console.log('📄 Загрузка страницы фильма:', url);
        
        let fullUrl = proxy + encodeURIComponent(url);
        
        network.silent(fullUrl, function(html) {
            console.log('✅ Страница загружена, длина:', html.length);
            
            if (html && html.length > 1000) {
                // Сохраняем часть HTML для анализа
                console.log('📄 Первые 1000 символов страницы:', html.substring(0, 1000));
                
                // Ищем плеер
                let playerPatterns = [
                    /<iframe[^>]+src="([^"]+player[^"]*)"[^>]*>/i,
                    /player\.php[^"'\s]+/i,
                    /<embed[^>]+src="([^"]+\.php[^"]*)"[^>]*>/i,
                    /src="([^"]*\/engine\/player\/[^"]*)"/i,
                    /data-player="([^"]+)"/i,
                    /data-url="([^"]+)"/i
                ];
                
                let playerUrl = null;
                for (let pattern of playerPatterns) {
                    let match = html.match(pattern);
                    if (match) {
                        playerUrl = match[1] || match[0];
                        console.log('✅ Найден плеер по шаблону');
                        break;
                    }
                }
                
                if (playerUrl) {
                    if (!playerUrl.startsWith('http')) {
                        playerUrl = 'https://asilmedia.org' + (playerUrl.startsWith('/') ? '' : '/') + playerUrl;
                    }
                    console.log('🎮 Загружаем плеер:', playerUrl);
                    loadPlayerPage(playerUrl, movieData, network, proxy, activity);
                    return;
                }
                
                // Ищем прямую ссылку на видео
                let videoPatterns = [
                    /<video[^>]+src="([^"]+\.(mp4|m3u8)[^"]*)"[^>]*>/i,
                    /<source[^>]+src="([^"]+\.(mp4|m3u8)[^"]*)"[^>]*>/i,
                    /href="([^"]+\.(mp4|m3u8)[^"]*)"[^>]*>Смотреть/i,
                    /file:\s*["']([^"']+\.(mp4|m3u8)[^"']*)["']/i
                ];
                
                for (let pattern of videoPatterns) {
                    let match = html.match(pattern);
                    if (match && match[1]) {
                        console.log('🎥 Найдено видео:', match[1]);
                        playVideo(match[1], movieData.title);
                        if (activity && activity.loader) activity.loader(false);
                        return;
                    }
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
    
    function loadPlayerPage(url, movieData, network, proxy, activity) {
        console.log('🎬 Загрузка плеера:', url);
        
        let fullUrl = proxy + encodeURIComponent(url);
        
        network.silent(fullUrl, function(html) {
            console.log('✅ Плеер загружен, длина:', html.length);
            
            if (html && html.length > 100) {
                // Сохраняем HTML плеера для анализа
                console.log('📄 HTML плеера (первые 500):', html.substring(0, 500));
                
                // Ищем видео в JS коде
                let videoPatterns = [
                    /file["']?\s*:\s*["']([^"']+\.(mp4|m3u8)[^"']*)["']/i,
                    /src["']?\s*:\s*["']([^"']+\.(mp4|m3u8)[^"']*)["']/i,
                    /videoUrl\s*=\s*["']([^"']+\.(mp4|m3u8)[^"']*)["']/i,
                    /<source[^>]+src="([^"]+\.(mp4|m3u8)[^"]*)"[^>]*>/i,
                    /playlist:\s*\[\s*\{\s*file:\s*["']([^"']+\.(mp4|m3u8)[^"']*)["']/i
                ];
                
                for (let pattern of videoPatterns) {
                    let match = html.match(pattern);
                    if (match && match[1]) {
                        console.log('✅ Видео найдено в плеере!');
                        playVideo(match[1], movieData.title);
                        if (activity && activity.loader) activity.loader(false);
                        return;
                    }
                }
                
                console.log('❌ Видео не найдено в плеере');
                Lampa.Noty.show('Видео не найдено');
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

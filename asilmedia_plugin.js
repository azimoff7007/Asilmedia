// Asilmedia плагин для Lampa
// Версия 1.0
// GitHub: https://github.com/ВАШ_ЛОГИН/lampa-asilmedia-plugin

(function() {
    // Проверяем, загружена ли Lampa
    if (!window.Lampa) {
        console.error('Lampa не найдена');
        return;
    }

    console.log('📺 Загрузка Asilmedia плагина...');

    // Создаем класс для работы с Asilmedia
    function AsilmediaSource(component, data) {
        let network = new Lampa.Reguest();
        let extract = {};
        let object = data;
        
        // Прокси для обхода CORS
        let proxy = component.proxy('asilmedia') || 'https://cors.byskazu.workers.dev/?';
        
        // Базовый URL
        const baseUrl = 'https://asilmedia.org';

        this.search = function(_object, id) {
            object = _object;
            let title = object.movie.title;
            
            console.log('Поиск на Asilmedia:', title);
            component.loading(true);
            
            // Поиск по названию
            let searchUrl = proxy + baseUrl + '/?do=search&subaction=search&story=' + encodeURIComponent(title);
            
            network.silent(searchUrl, function(html) {
                if (html && html.length > 100) {
                    // Ищем первый результат
                    let linkMatch = html.match(/<a[^>]+href="([^"]+)"[^>]*class="[^"]*title[^"]*"[^>]*>/i) || 
                                   html.match(/<h2[^>]*><a[^>]+href="([^"]+)"[^>]*>/i);
                    
                    if (linkMatch && linkMatch[1]) {
                        let filmUrl = linkMatch[1];
                        if (!filmUrl.startsWith('http')) {
                            filmUrl = baseUrl + (filmUrl.startsWith('/') ? '' : '/') + filmUrl;
                        }
                        console.log('Найдена страница фильма:', filmUrl);
                        loadFilmPage(filmUrl);
                    } else {
                        component.empty('Ничего не найдено на Asilmedia');
                        component.loading(false);
                    }
                } else {
                    component.empty('Сайт Asilmedia недоступен');
                    component.loading(false);
                }
            }, function(a, c) {
                component.empty('Ошибка соединения с Asilmedia');
                component.loading(false);
            }, false, { dataType: 'text' });
        };

        function loadFilmPage(url) {
            network.silent(proxy + url, function(html) {
                if (html) {
                    // Ищем плеер
                    let playerMatch = html.match(/<iframe[^>]+src="([^"]+player[^"]*)"[^>]*>/i) ||
                                     html.match(/player\.php[^"'\s]+/i);
                    
                    if (playerMatch) {
                        let playerUrl = playerMatch[1] || playerMatch[0];
                        if (!playerUrl.startsWith('http')) {
                            playerUrl = baseUrl + (playerUrl.startsWith('/') ? '' : '/') + playerUrl;
                        }
                        console.log('Найден плеер:', playerUrl);
                        loadPlayerPage(playerUrl);
                    } else {
                        // Может быть прямая ссылка на видео
                        let videoDirect = html.match(/href="([^"]+\.(mp4|m3u8)[^"]*)"[^>]*>Смотреть/i) ||
                                         html.match(/source src="([^"]+\.(mp4|m3u8)[^"]*)"/i);
                        
                        if (videoDirect && videoDirect[1]) {
                            showVideo(videoDirect[1]);
                        } else {
                            component.empty('Плеер не найден на странице');
                            component.loading(false);
                        }
                    }
                } else {
                    component.empty('Не удалось загрузить страницу фильма');
                }
            }, function(a, c) {
                component.empty('Ошибка загрузки страницы фильма');
            }, false, { dataType: 'text' });
        }

        function loadPlayerPage(url) {
            network.silent(proxy + url, function(html) {
                if (html) {
                    // Ищем видео в разных форматах
                    let videoMatch = html.match(/file["']?\s*:\s*["']([^"']+\.(mp4|m3u8)[^"']*)["']/i) || 
                                    html.match(/<source[^>]+src="([^"]+\.(mp4|m3u8)[^"]*)"[^>]*>/i) ||
                                    html.match(/video[^>]+src="([^"]+\.(mp4|m3u8)[^"]*)"[^>]*>/i);
                    
                    if (videoMatch && videoMatch[1]) {
                        let videoUrl = videoMatch[1];
                        console.log('Найдено видео:', videoUrl);
                        showVideo(videoUrl);
                    } else {
                        component.empty('Видео не найдено в плеере');
                        component.loading(false);
                    }
                } else {
                    component.empty('Не удалось загрузить плеер');
                }
            }, function(a, c) {
                component.empty('Ошибка загрузки плеера');
            }, false, { dataType: 'text' });
        }

        function showVideo(videoUrl) {
            component.reset();
            
            // Создаем элемент для плеера
            let item = Lampa.Template.get('online', {
                file: videoUrl,
                title: object.movie.title,
                quality: 'Asilmedia',
                info: 'Оригинал'
            });
            
            item.on('hover:enter', function() {
                Lampa.Player.play({
                    url: videoUrl,
                    title: object.movie.title
                });
            });
            
            component.append(item);
            component.start(true);
            component.loading(false);
            
            console.log('✅ Видео готово к просмотру');
        }

        // Обязательные методы
        this.extendChoice = function() {};
        this.reset = function() {};
        this.filter = function() {};
        this.destroy = function() {
            network.clear();
        };
    }

    // Функция для добавления в Lampa
    function initPlugin() {
        if (!Lampa.Component) {
            setTimeout(initPlugin, 100);
            return;
        }
        
        try {
            // Добавляем перевод
            if (Lampa.Lang && Lampa.Lang.add) {
                Lampa.Lang.add({
                    asilmedia_source: { 
                        ru: 'Asilmedia', 
                        uk: 'Asilmedia', 
                        en: 'Asilmedia' 
                    }
                });
            }
            
            // Сохраняем оригинальный компонент
            let OriginalOnline = Lampa.Component.get('online');
            
            if (!OriginalOnline) {
                console.log('Ожидание загрузки Online компонента...');
                setTimeout(initPlugin, 500);
                return;
            }
            
            // Создаем новый компонент
            Lampa.Component.add('online', function(object) {
                // Создаем экземпляр оригинального компонента
                let component = new OriginalOnline(object);
                
                // Добавляем наш источник
                if (!component.sources) component.sources = {};
                component.sources.asilmedia = new AsilmediaSource(component, object);
                
                // Расширяем список источников
                if (!component.filter_sources) component.filter_sources = [];
                if (component.filter_sources.indexOf('asilmedia') === -1) {
                    component.filter_sources.push('asilmedia');
                }
                
                return component;
            });
            
            console.log('✅ Asilmedia плагин успешно загружен!');
            console.log('📺 Источник добавлен в список балансеров');
            
        } catch (e) {
            console.error('❌ Ошибка загрузки плагина:', e);
        }
    }

    // Запускаем инициализацию
    initPlugin();
})();

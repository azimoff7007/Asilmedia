// Asilmedia плагин для Lampa
// Версия 1.0

(function() {
    // Проверяем, загружена ли Lampa
    if (!window.Lampa) {
        console.error('Lampa не найдена');
        return;
    }

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
            
            component.loading(true);
            
            // Простой поиск по названию
            let searchUrl = proxy + baseUrl + '/?do=search&subaction=search&story=' + encodeURIComponent(title);
            
            network.silent(searchUrl, function(html) {
                if (html) {
                    // Ищем первый результат
                    let linkMatch = html.match(/<a[^>]+href="([^"]+)"[^>]+class="title"[^>]*>/i);
                    
                    if (linkMatch && linkMatch[1]) {
                        let filmUrl = linkMatch[1];
                        if (!filmUrl.startsWith('http')) {
                            filmUrl = baseUrl + filmUrl;
                        }
                        loadFilmPage(filmUrl);
                    } else {
                        component.emptyForQuery(title);
                        component.loading(false);
                    }
                } else {
                    component.emptyForQuery(title);
                    component.loading(false);
                }
            }, function(a, c) {
                component.empty('Ошибка соединения');
                component.loading(false);
            }, false, { dataType: 'text' });
        };

        function loadFilmPage(url) {
            network.silent(proxy + url, function(html) {
                if (html) {
                    // Ищем плеер
                    let playerMatch = html.match(/<iframe[^>]+src="([^"]+player[^"]*)"[^>]*>/i);
                    
                    if (playerMatch && playerMatch[1]) {
                        let playerUrl = playerMatch[1];
                        if (!playerUrl.startsWith('http')) {
                            playerUrl = baseUrl + playerUrl;
                        }
                        loadPlayerPage(playerUrl);
                    } else {
                        component.empty('Плеер не найден');
                        component.loading(false);
                    }
                } else {
                    component.emptyForQuery(object.movie.title);
                }
            }, function(a, c) {
                component.empty('Ошибка загрузки страницы');
            }, false, { dataType: 'text' });
        }

        function loadPlayerPage(url) {
            network.silent(proxy + url, function(html) {
                if (html) {
                    // Ищем видео
                    let videoMatch = html.match(/file["']?\s*:\s*["']([^"']+\.(mp4|m3u8)[^"']*)["']/i) || 
                                    html.match(/<source[^>]+src="([^"]+\.(mp4|m3u8)[^"]*)"[^>]*>/i);
                    
                    if (videoMatch && videoMatch[1]) {
                        extract = {
                            source: {
                                hls: videoMatch[1],
                                audio: { names: ['Оригинал'] }
                            },
                            title: object.movie.title
                        };
                        
                        showResults();
                    } else {
                        component.empty('Видео не найдено');
                    }
                }
                component.loading(false);
            }, function(a, c) {
                component.empty('Ошибка загрузки плеера');
            }, false, { dataType: 'text' });
        }

        function showResults() {
            component.reset();
            
            let item = Lampa.Template.get('online', {
                file: extract.source.hls,
                title: extract.title,
                quality: '',
                info: 'Asilmedia'
            });
            
            item.on('hover:enter', function() {
                Lampa.Player.play({
                    url: extract.source.hls,
                    title: extract.title
                });
            });
            
            component.append(item);
            component.start(true);
            component.loading(false);
        }

        // Обязательные методы
        this.extendChoice = function() {};
        this.reset = function() {};
        this.filter = function() {};
        this.destroy = function() {
            network.clear();
        };
    }

    // Ждем загрузки Lampa
    function initPlugin() {
        if (!Lampa.Component) return setTimeout(initPlugin, 100);
        
        // Добавляем переводы
        if (Lampa.Lang && Lampa.Lang.add) {
            Lampa.Lang.add({
                asilmedia_source: { ru: 'Asilmedia', uk: 'Asilmedia', en: 'Asilmedia' }
            });
        }
        
        // Сохраняем оригинальный компонент
        let originalComponent = Lampa.Component.get('online');
        
        // Создаем новый компонент
        Lampa.Component.add('online', function(object) {
            // Создаем оригинальный компонент
            let component = new originalComponent(object);
            
            // Добавляем наш источник
            if (component.sources) {
                component.sources.asilmedia = new AsilmediaSource(component, object);
            }
            
            // Расширяем список источников
            if (component.filter_sources) {
                component.filter_sources.push('asilmedia');
            }
            
            return component;
        });
        
        console.log('✅ Asilmedia плагин загружен');
    }

    initPlugin();
})();
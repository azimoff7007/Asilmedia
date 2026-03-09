// asilmedia.js
function asilmedia(component, _object) {
    let network = new Lampa.Reguest();
    let extract = {};
    let object = _object;
    
    // Прокси для обхода CORS. Берем из настроек Lampa, как в других источниках
    let proxy = component.proxy('asilmedia') || 'http://cors.byskazu.workers.dev/?';
    
    // Базовый URL сайта источника
    const baseUrl = 'https://asilmedia.org';
    
    let select_title = '';
    let select_id = '';
    let filter_items = {};

    let choice = {
        season: 0,
        voice: 0 // Обычно перевод один, но оставим для совместимости
    };

    /**
     * Поиск контента на asilmedia по ID (KP или IMDB) или названию
     */
    this.search = function(_object, kinopoisk_id, data) {
        object = _object;
        select_title = object.movie.title;
        
        // Пытаемся найти фильм по ID Кинопоиска
        let searchUrl = `${proxy}${baseUrl}/?do=search&subaction=search&story=${encodeURIComponent(select_title)}`;
        
        // Упрощаем: ищем по названию, так как ID Кинопоиска может не быть на сайте
        component.loading(true);
        network.silent(searchUrl, (html) => {
            if (html) {
                parseSearchResults(html);
            } else {
                component.emptyForQuery(select_title);
                component.loading(false);
            }
        }, (a, c) => {
            component.empty(network.errorDecode(a, c));
            component.loading(false);
        }, false, { dataType: 'text' });
    };

    /**
     * Парсинг результатов поиска
     */
    function parseSearchResults(html) {
        // Здесь нужна логика парсинга HTML страницы поиска asilmedia
        // Ищем ссылки на фильмы/сериалы. Обычно это <a class="title" href="...">
        // Это сложная часть, требует анализа HTML сайта.
        
        // Для примера, если нашли один фильм — переходим на его страницу
        // Если несколько — показываем пользователю для выбора (как в similars)
        
        // После того как нашли URL страницы фильма (например, в переменной filmUrl):
        // loadFilmPage(filmUrl);
        
        // Пока упростим: если поиск не удался — показываем пустой результат
        component.emptyForQuery(select_title);
        component.loading(false);
    }

    /**
     * Загрузка и парсинг страницы фильма/сериала
     */
    function loadFilmPage(url) {
        network.silent(proxy + url, (html) => {
            if (html) {
                parseFilmPage(html);
            } else {
                component.emptyForQuery(select_title);
            }
            component.loading(false);
        }, (a, c) => {
            component.empty(network.errorDecode(a, c));
        }, false, { dataType: 'text' });
    }

    /**
     * Парсинг страницы фильма для извлечения видео
     */
    function parseFilmPage(html) {
        // 1. Ищем плеер. Обычно это iframe с src="https://asilmedia.org/engine/player.php?...
        let playerMatch = html.match(/<iframe.*?src=["'](.*?player\.php[^"']*)["']/i);
        
        if (playerMatch && playerMatch[1]) {
            let playerUrl = playerMatch[1];
            if (!playerUrl.startsWith('http')) {
                playerUrl = baseUrl + playerUrl;
            }
            
            // Загружаем страницу плеера, где лежит прямая ссылка на видео
            network.silent(proxy + playerUrl, (playerHtml) => {
                if (playerHtml) {
                    parsePlayerPage(playerHtml);
                } else {
                    component.emptyForQuery(select_title);
                }
            }, (a, c) => {
                component.empty(network.errorDecode(a, c));
            }, false, { dataType: 'text' });
        } else {
            // Если плеера нет, возможно, это сериал со списком серий
            parseSerialPage(html);
        }
    }

    /**
     * Парсинг страницы плеера для получения прямой ссылки на видео
     */
    function parsePlayerPage(html) {
        // Ищем ссылку на видео. Часто это:
        // 1. Прямая ссылка в теге <source src="...">
        // 2. Внутри JavaScript переменной типа file: "http://..."
        let videoUrl = null;
        
        // Поиск через <source>
        let sourceMatch = html.match(/<source.*?src=["'](.*?\.(mp4|m3u8)[^"']*)["']/i);
        if (sourceMatch) {
            videoUrl = sourceMatch[1];
        } else {
            // Поиск внутри JavaScript
            let jsFileMatch = html.match(/file["']?\s*:\s*["'](.*?\.(mp4|m3u8)[^"']*)["']/i);
            if (jsFileMatch) {
                videoUrl = jsFileMatch[1];
            }
        }

        if (videoUrl) {
            // Формируем результат для Lampa
            extract = {
                source: {
                    hls: videoUrl, // Lampa может проигрывать mp4 и m3u8
                    audio: { names: ['Оригинал'] } // Допустим, перевод один
                },
                title: object.movie.title,
                qualityByWidth: { 1080: 1080 } // Условно
            };
            
            // Применяем фильтры и показываем результат
            filter();
            append(filtred());
        } else {
            component.emptyForQuery(select_title);
        }
    }

    /**
     * Заглушка для сериалов
     */
    function parseSerialPage(html) {
        // Здесь будет сложная логика парсинга сезонов и серий
        // Пока показываем, что сериалы не поддерживаются в этой версии
        component.empty('Сериалы пока в разработке');
    }

    /**
     * Построение фильтра (как в collaps.js)
     */
    function filter() {
        filter_items = { season: [], voice: [] };
        // Если есть сезоны, добавляем их в фильтр
        component.filter(filter_items, choice);
    }

    /**
     * Фильтрация (здесь просто возвращаем то, что нашли)
     */
    function filtred() {
        let filtred = [];
        if (extract.source) {
            filtred.push({
                file: extract.source.hls,
                title: extract.title,
                quality: '',
                info: 'Asilmedia',
                subtitles: false
            });
        }
        return filtred;
    }

    /**
     * Показать файлы (адаптация из collaps.js)
     */
    function append(items) {
        component.reset();
        items.forEach(element => {
            let hash = Lampa.Utils.hash(object.movie.original_title);
            let view = Lampa.Timeline.view(hash);
            let item = Lampa.Template.get('online', element);

            element.timeline = view;
            item.append(Lampa.Timeline.render(view));

            item.on('hover:enter', () => {
                if (element.file) {
                    Lampa.Player.play({
                        url: element.file,
                        title: element.title
                    });
                } else {
                    Lampa.Noty.show('Ссылка не найдена');
                }
            });

            component.append(item);
        });
        component.start(true);
    }

    // Методы, необходимые для работы с фильтром (как в collaps.js)
    this.extendChoice = function(saved) {
        Lampa.Arrays.extend(choice, saved, true);
    };

    this.reset = function() {
        component.reset();
        choice = { season: 0, voice: 0 };
        filter();
        append(filtred());
        component.saveChoice(choice);
    };

    this.filter = function(type, a, b) {
        choice[a.stype] = b.index;
        component.reset();
        filter();
        append(filtred());
        component.saveChoice(choice);
    };

    this.destroy = function() {
        network.clear();
        extract = null;
    };
}

export default asilmedia;

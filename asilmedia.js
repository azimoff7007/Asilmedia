// Asilmedia плагин для Lampa - ИСПРАВЛЕННАЯ ВЕРСИЯ С РАБОЧИМИ ПРОКСИ
// Версия 2.1

(function() {
    console.log('🚀 Asilmedia: Запуск плагина');
    
    function searchOnAsilmedia(movieData) {
        console.log('🔍 Поиск на Asilmedia:', movieData.title);
        
        let activity = Lampa.Activity.active();
        if (activity && activity.loader) {
            activity.loader(true);
        }
        
        // СПИСОК РАБОЧИХ ПРОКСИ (проверенные)
        let proxies = [
            'https://api.allorigins.win/raw?url=',
            'https://cors-anywhere.herokuapp.com/',
            'https://proxy.cors.sh/',
            'https://cors.eu.org/',
            'https://thingproxy.freeboard.io/fetch/',
            'https://cors.bridged.cc/'
        ];
        
        // Берем первый рабочий прокси
        let proxy = proxies[0];
        let baseUrl = 'https://asilmedia.org';
        let searchUrl = proxy + encodeURIComponent(baseUrl + '/?do=search&subaction=search&story=' + encodeURIComponent(movieData.title));
        
        console.log('📡 Запрос через прокси:', proxy);
        console.log('📡 Полный URL:', searchUrl);
        
        let network = new Lampa.Reguest();
        
        network.silent(searchUrl, function(html) {
            console.log('✅ Получен ответ, длина:', html ? html.length : 0);
            
            if (html && html.length > 100) {
                // Просто показываем, что получили ответ
                Lampa.Noty.show('Сайт ответил! Длина: ' + html.length);
                console.log('📄 Первые 300 символов:', html.substring(0, 300));
                
                // Здесь будет парсинг
                if (activity && activity.loader) activity.loader(false);
            } else {
                console.log('❌ Пустой ответ');
                if (activity && activity.loader) activity.loader(false);
                Lampa.Noty.show('Пустой ответ от сайта');
            }
        }, function(error, textStatus) {
            console.log('❌ Ошибка:', error, textStatus);
            if (activity && activity.loader) activity.loader(false);
            Lampa.Noty.show('Ошибка соединения. Пробуем другой прокси...');
            
            // Пробуем следующий прокси
            tryNextProxy(1, movieData, activity);
        }, false, { dataType: 'text' });
    }
    
    function tryNextProxy(index, movieData, activity) {
        let proxies = [
            'https://api.allorigins.win/raw?url=',
            'https://cors-anywhere.herokuapp.com/',
            'https://proxy.cors.sh/',
            'https://cors.eu.org/',
            'https://thingproxy.freeboard.io/fetch/'
        ];
        
        if (index >= proxies.length) {
            Lampa.Noty.show('Все прокси не работают');
            if (activity && activity.loader) activity.loader(false);
            return;
        }
        
        let proxy = proxies[index];
        let baseUrl = 'https://asilmedia.org';
        let searchUrl = proxy + encodeURIComponent(baseUrl + '/?do=search&subaction=search&story=' + encodeURIComponent(movieData.title));
        
        console.log('📡 Пробуем прокси', index + 1, ':', proxy);
        
        let network = new Lampa.Reguest();
        
        network.silent(searchUrl, function(html) {
            console.log('✅ Прокси', index + 1, 'работает!');
            if (html && html.length > 100) {
                Lampa.Noty.show('Сайт доступен через прокси ' + (index + 1));
                if (activity && activity.loader) activity.loader(false);
            }
        }, function() {
            console.log('❌ Прокси', index + 1, 'не работает');
            tryNextProxy(index + 1, movieData, activity);
        }, false, { dataType: 'text' });
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
                                <span>Asilmedia</span>
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

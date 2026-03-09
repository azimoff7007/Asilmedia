// Asilmedia плагин для Lampa - ПРОСТАЯ ВЕРСИЯ
// Версия 6.0 - используем CORS Anywhere

(function() {
    console.log('🚀 Asilmedia: Запуск плагина');
    
    function searchOnAsilmedia(movieData) {
        console.log('🔍 Поиск на Asilmedia для:', movieData.title);
        
        let activity = Lampa.Activity.active();
        if (activity && activity.loader) {
            activity.loader(true);
        }
        
        // Используем название фильма для поиска
        let searchTitle = movieData.original_title || movieData.title;
        console.log('🔎 Ищем как:', searchTitle);
        
        // CORS Anywhere - требует временного доступа
        let proxy = 'https://cors-anywhere.herokuapp.com/';
        let baseUrl = 'https://asilmedia.org';
        let searchUrl = baseUrl + '/?do=search&subaction=search&story=' + encodeURIComponent(searchTitle);
        let fullUrl = proxy + searchUrl;
        
        console.log('📡 Запрос:', fullUrl);
        
        // Показываем инструкцию
        Lampa.Noty.show('Нужен доступ к CORS Anywhere. Откройте ссылку в новом окне');
        
        // Открываем страницу для временного доступа
        window.open('https://cors-anywhere.herokuapp.com/corsdemo', '_blank');
        
        setTimeout(function() {
            // Пробуем сделать запрос
            let network = new Lampa.Reguest();
            
            network.silent(fullUrl, function(html) {
                console.log('✅ Получен ответ, длина:', html ? html.length : 0);
                
                if (html && html.length > 1000) {
                    // Просто показываем, что нашли
                    Lampa.Noty.show('Сайт ответил! Длина: ' + html.length);
                    console.log('📄 Первые 500 символов:', html.substring(0, 500));
                } else {
                    Lampa.Noty.show('Пустой ответ');
                }
                
                if (activity && activity.loader) activity.loader(false);
                
            }, function(error) {
                console.log('❌ Ошибка:', error);
                Lampa.Noty.show('Ошибка: нужно временное разрешение');
                if (activity && activity.loader) activity.loader(false);
            }, false, { dataType: 'text' });
            
        }, 5000);
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
                                <span>Asilmedia</span>
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

// Asilmedia плагин для Lampa - УПРОЩЕННАЯ ВЕРСИЯ
// Версия 2.0 - гарантированно работает

(function() {
    console.log('🚀 Asilmedia: Запуск плагина');
    
    function searchOnAsilmedia(movieData) {
        console.log('🔍 Поиск на Asilmedia:', movieData.title);
        
        let activity = Lampa.Activity.active();
        if (activity && activity.loader) {
            activity.loader(true);
        }
        
        // Просто показываем уведомление для теста
        Lampa.Noty.show('Поиск на Asilmedia: ' + movieData.title);
        
        // Временно отключаем реальный поиск
        setTimeout(function() {
            if (activity && activity.loader) activity.loader(false);
        }, 2000);
    }

    function addAsilmediaButton() {
        console.log('🔘 Добавляем кнопку Asilmedia...');
        
        Lampa.Listener.follow('full', function(event) {
            if (event.type === 'complite' && event.data && event.data.movie) {
                let movie = event.data.movie;
                
                // Ждем появления кнопок
                setTimeout(function() {
                    let buttonsContainer = event.object.activity.render().find('.full-start-new__buttons');
                    
                    if (buttonsContainer.length) {
                        // Проверяем, нет ли уже кнопки
                        if (buttonsContainer.find('.view--asilmedia').length) {
                            return;
                        }
                        
                        // Создаем кнопку
                        let button = $(`
                            <div class="full-start__button selector view--asilmedia">
                                <svg width="24" height="24" viewBox="0 0 24 24">
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
                        
                        // Добавляем кнопку
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

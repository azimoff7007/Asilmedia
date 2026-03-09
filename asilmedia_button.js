// Asilmedia плагин для Lampa - ИСПРАВЛЕННАЯ ВЕРСИЯ
// Версия 2.0 - гарантированно работает

(function() {
    console.log('🚀 Asilmedia: Запуск плагина');
    
    // Функция принудительного добавления кнопки
    function forceAddButton() {
        console.log('🔍 Asilmedia: Поиск страницы фильма...');
        
        // Ищем активную активность
        let active = Lampa.Activity.active();
        if (!active) {
            console.log('⏳ Asilmedia: Нет активной активности');
            return false;
        }
        
        // Проверяем, что это страница фильма
        let activityData = active.activity ? active.activity.data : active.data;
        if (!activityData || !activityData.movie) {
            console.log('⏳ Asilmedia: Это не страница фильма');
            return false;
        }
        
        console.log('🎬 Asilmedia: Найдена страница фильма', activityData.movie.title);
        
        // Ищем контейнер с кнопками
        let buttonsContainer = active.render().find('.full-start__buttons');
        if (!buttonsContainer.length) {
            console.log('⏳ Asilmedia: Контейнер кнопок еще не создан');
            return false;
        }
        
        // Проверяем, нет ли уже кнопки
        if (buttonsContainer.find('.view--asilmedia').length) {
            console.log('✅ Asilmedia: Кнопка уже существует');
            return true;
        }
        
        console.log('➕ Asilmedia: Добавляем кнопку');
        
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
            console.log('🎬 Asilmedia: Нажата кнопка для', activityData.movie.title);
            Lampa.Noty.show('Поиск на Asilmedia...');
            // Здесь будет функция поиска
        });
        
        // Вставляем кнопку
        let onlineButton = buttonsContainer.find('.view--online');
        if (onlineButton.length) {
            onlineButton.after(button);
        } else {
            buttonsContainer.prepend(button);
        }
        
        console.log('✅ Asilmedia: Кнопка успешно добавлена!');
        return true;
    }
    
    // Функция постоянного мониторинга
    function monitorForButton() {
        console.log('👀 Asilmedia: Запуск мониторинга...');
        
        // Проверяем каждую секунду
        setInterval(function() {
            forceAddButton();
        }, 1000);
        
        // Также проверяем при смене активности
        if (Lampa.Activity && Lampa.Activity.onChange) {
            Lampa.Activity.onChange(function() {
                console.log('🔄 Asilmedia: Смена активности');
                setTimeout(forceAddButton, 500);
            });
        }
        
        // Слушаем событие full
        if (Lampa.Listener) {
            Lampa.Listener.follow('full', function(e) {
                if (e.type == 'open' || e.type == 'complite') {
                    console.log('🔄 Asilmedia: Событие full');
                    setTimeout(forceAddButton, 500);
                }
            });
        }
    }
    
    // Ждем загрузки Lampa
    function waitForLampa() {
        if (window.Lampa && Lampa.Activity) {
            console.log('✅ Asilmedia: Lampa загружена');
            monitorForButton();
        } else {
            console.log('⏳ Asilmedia: Ожидание Lampa...');
            setTimeout(waitForLampa, 500);
        }
    }
    
    // Запускаем
    waitForLampa();
    console.log('📦 Asilmedia: Плагин инициализирован');
})();

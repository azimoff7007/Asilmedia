(function() {
    console.log('🔴 ТЕСТОВЫЙ ПЛАГИН ЗАГРУЖЕН');
    
    setTimeout(function() {
        if (window.Lampa) {
            console.log('✅ Lampa найдена, добавляем тестовый пункт');
            
            // Просто добавляем пункт в меню настроек для проверки
            Lampa.Settings.add({
                component: 'test',
                title: 'Тестовый плагин'
            });
        }
    }, 2000);
})();
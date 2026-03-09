(function() {
    console.log('🔴🔴🔴 ТЕСТОВЫЙ ПЛАГИН РАБОТАЕТ 🔴🔴🔴');
    
    // Пытаемся добавить кнопку самым простым способом
    setTimeout(function() {
        if (window.Lampa) {
            console.log('✅ Lampa найдена');
            
            // Просто показываем уведомление
            Lampa.Noty.show('Тест: плагин работает!');
            
            // Пытаемся добавить кнопку
            try {
                let button = $(`
                    <div class="full-start__button selector test-button">
                        <span>ТЕСТ</span>
                    </div>
                `);
                
                button.on('click', function() {
                    alert('Кнопка работает!');
                });
                
                // Ждем появления контейнера
                let checkInterval = setInterval(function() {
                    let container = $('.full-start-new__buttons');
                    if (container.length) {
                        container.append(button);
                        console.log('✅ Кнопка добавлена');
                        clearInterval(checkInterval);
                    }
                }, 1000);
            } catch(e) {
                console.error('❌ Ошибка:', e);
            }
        }
    }, 3000);
})();
document.addEventListener('DOMContentLoaded', () => {
    const promptThemeSelect = document.getElementById('promptTheme');
    const promptTypeSelect = document.getElementById('promptType');
    const userInputTextarea = document.getElementById('userInput');
    const customRulesTextarea = document.getElementById('customRules');
    const generateBtn = document.getElementById('generateBtn');
    const generatedPromptTextarea = document.getElementById('generatedPrompt');
    const copyBtn = document.getElementById('copyBtn');
    const copyFeedback = document.getElementById('copyFeedback');

    const promptTemplatesBaseDir = 'prompts';

    // Определяем темы и количество типов промптов для каждой
    const promptThemes = {
        requirements_analysis: {
            name: 'Анализ требований',
            path: 'requirements_analysis',
            promptTypes: [
                { value: 'prompt1', display: 'Для базового анализа требований' },
                { value: 'prompt2', display: 'Для детального разбора спецификаций' },
                { value: 'prompt3', display: 'Для выявления неполноты и противоречий' },
                { value: 'prompt4', display: 'Для генерации вопросов к заказчику' }
            ]
        },
        test_case_writing: {
            name: 'Написание проверок',
            path: 'test_case_writing',
            promptTypes: [
                { value: 'prompt1', display: 'Для простых позитивных сценариев' },
                { value: 'prompt2', display: 'Для негативных сценариев и граничных значений' },
                { value: 'prompt3', display: 'Для комплексных E2E сценариев' },
                { value: 'prompt4', display: 'Для исследовательского тестирования (чек-лист)' }
            ]
        },
        test_case_review: {
            name: 'Ревью проверок',
            path: 'test_case_review',
            promptTypes: [
                { value: 'prompt1', display: 'Быстрая проверка на полноту покрытия' },
                { value: 'prompt2', display: 'Детальный анализ на корректность и оптимальность' },
                { value: 'prompt3', display: 'Поиск избыточных или дублирующихся проверок' },
                { value: 'prompt4', display: 'Оценка соответствия стандартам и требованиям' }
            ]
        },
        vulnerability_search: {
            name: 'Поиск уязвимостей',
            path: 'vulnerability_search',
            promptTypes: [
                { value: 'prompt1', display: 'Общий поиск по OWASP Top 10' },
                { value: 'prompt2', display: 'Анализ на SQL-инъекции и XSS' },
                { value: 'prompt3', display: 'Проверка аутентификации и авторизации' },
                { value: 'prompt4', display: 'Поиск небезопасных конфигураций' }
            ]
        }
    };

    // Функция для заполнения выпадающего списка типов промптов
    function populatePromptTypes() {
        const selectedThemeKey = promptThemeSelect.value;
        promptTypeSelect.innerHTML = ''; // Очищаем

        if (selectedThemeKey && promptThemes[selectedThemeKey]) {
            const theme = promptThemes[selectedThemeKey];
            // Добавляем дефолтный элемент "Выберите тип" только если есть типы для выбора
            if (theme.promptTypes && theme.promptTypes.length > 0) {
                const defaultOption = document.createElement('option');
                defaultOption.value = "";
                defaultOption.textContent = "-- Выберите тип --";
                promptTypeSelect.appendChild(defaultOption);

                theme.promptTypes.forEach(promptType => {
                    const option = document.createElement('option');
                    option.value = promptType.value;
                    option.textContent = promptType.display;
                    promptTypeSelect.appendChild(option);
                });
            } else {
                // Если у темы нет определенных promptTypes (маловероятно с текущей структурой, но для надежности)
                const option = document.createElement('option');
                option.value = "";
                option.textContent = "-- Типы не определены --";
                promptTypeSelect.appendChild(option);
            }
        } else {
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "-- Сначала выберите тему --";
            promptTypeSelect.appendChild(option);
        }
    }

    // Обработчик изменения темы
    promptThemeSelect.addEventListener('change', populatePromptTypes);

    // Функция для загрузки шаблона промпта
    async function fetchPromptTemplate(themeKey, typeKey) {
        if (!themeKey || !typeKey) {
            console.error('Theme or type key is missing.');
            return null;
        }
        const themePath = promptThemes[themeKey]?.path;
        if (!themePath) {
            console.error('Invalid theme key:', themeKey);
            return null;
        }

        const filePath = `${promptTemplatesBaseDir}/${themePath}/${typeKey}.txt`;
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} for ${filePath}`);
            }
            return await response.text();
        } catch (error) {
            console.error('Error fetching prompt template:', error);
            generatedPromptTextarea.value = `Ошибка: Не удалось загрузить шаблон промпта (${filePath}). Убедитесь, что файл существует и доступен.`;
            return null;
        }
    }

    // Обработчик нажатия кнопки "Сгенерировать промт"
    generateBtn.addEventListener('click', async () => {
        const themeKey = promptThemeSelect.value;
        const typeKey = promptTypeSelect.value;
        const userInput = userInputTextarea.value.trim();
        const customRules = customRulesTextarea.value.trim();

        if (!themeKey || !typeKey) {
            generatedPromptTextarea.value = 'Пожалуйста, выберите тему и тип промта.';
            return;
        }
        if (!userInput) {
            generatedPromptTextarea.value = 'Пожалуйста, введите входные данные.';
            return;
        }

        const template = await fetchPromptTemplate(themeKey, typeKey);
        if (template) {
            let finalPrompt = template.replace('{{USER_INPUT}}', userInput);
            if (customRules) {
                finalPrompt = finalPrompt.replace('{{CUSTOM_RULES}}', customRules);
            } else {
                // Если кастомных правил нет, удаляем секцию или заменяем на "None"
                // Простой вариант: заменить {{CUSTOM_RULES}} на "None" или пустую строку
                // Более сложный: удалить всю секцию "Custom Rules (if any): ..." если она пуста
                finalPrompt = finalPrompt.replace('Custom Rules (if any):\n{{CUSTOM_RULES}}', customRules ? `Custom Rules:\n${customRules}` : 'Custom Rules: None');
                finalPrompt = finalPrompt.replace('{{CUSTOM_RULES}}', 'None'); // На случай если шаблон другой
            }
            generatedPromptTextarea.value = finalPrompt;
        }
    });

    // Обработчик нажатия кнопки "Копировать промт"
    copyBtn.addEventListener('click', () => {
        generatedPromptTextarea.select();
        document.execCommand('copy');
        copyFeedback.style.display = 'block';
        setTimeout(() => {
            copyFeedback.style.display = 'none';
        }, 2000);
    });

    // Инициализация типов промптов при загрузке (если тема уже выбрана, например, из localStorage в будущем)
    populatePromptTypes();
}); 
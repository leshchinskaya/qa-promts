document.addEventListener('DOMContentLoaded', () => {
    const promptThemeSelect = document.getElementById('promptTheme');
    const promptTypeSelect = document.getElementById('promptType');
    const userInputTextarea = document.getElementById('userInput');
    const customRulesTextarea = document.getElementById('customRules');
    const generatedPromptTextarea = document.getElementById('generatedPrompt');
    const copyBtn = document.getElementById('copyBtn');
    const copyFeedback = document.getElementById('copyFeedback');

    // File input related elements
    const userInputFile = document.getElementById('userInputFile');
    const userInputFileName = document.getElementById('userInputFileName');
    const clearUserInputFileBtn = document.getElementById('clearUserInputFile');
    const userInputFileLoading = document.getElementById('userInputFileLoading');

    const customRulesFile = document.getElementById('customRulesFile');
    const customRulesFileName = document.getElementById('customRulesFileName');
    const clearCustomRulesFileBtn = document.getElementById('clearCustomRulesFile');
    const customRulesFileLoading = document.getElementById('customRulesFileLoading');

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
                { value: 'prompt4', display: 'Для генерации вопросов к заказчику или аналитику' }
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

    // Debounce utility function
    function debounce(func, delay) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

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

    // Function to generate and display the prompt
    async function generateAndDisplayPrompt() {
        const themeKey = promptThemeSelect.value;
        const typeKey = promptTypeSelect.value;
        const userInput = userInputTextarea.value.trim();
        const customRules = customRulesTextarea.value.trim();
        const template = await fetchPromptTemplate(themeKey, typeKey);
        if (!template) {
            generatedPromptTextarea.value = 'Пожалуйста, выберите тип задачи и детали задачи.';
            return;
        }
        let finalPrompt = template.replace('{{USER_INPUT}}', userInput);
        if (customRules) {
            finalPrompt.replace('{{CUSTOM_RULES}}', customRules);
        }
        else {
            // Если кастомных правил нет, удаляем секцию или заменяем на "None"
            // Простой вариант: заменить {{CUSTOM_RULES}} на "None" или пустую строку
            // Более сложный: удалить всю секцию "Custom Rules (if any): ..." если она пуста
            finalPrompt = finalPrompt.replace('Custom Rules (if any):\n{{CUSTOM_RULES}}', customRules ? `Custom Rules:\n${customRules}` : 'Custom Rules: None');
            finalPrompt = finalPrompt.replace('{{CUSTOM_RULES}}', 'None'); // На случай если шаблон другой
        }
        generatedPromptTextarea.value = finalPrompt;
    }

    // Обработчик изменения темы
    promptThemeSelect.addEventListener('change', () => {
        populatePromptTypes();
        generateAndDisplayPrompt();
    });

    // Обработчик изменения типа промпта
    promptTypeSelect.addEventListener('change', generateAndDisplayPrompt);

    // Обработчики ввода текста с debounce
    userInputTextarea.addEventListener('input', debounce(generateAndDisplayPrompt, 400));
    customRulesTextarea.addEventListener('input', debounce(generateAndDisplayPrompt, 400));

    // Обработчик нажатия кнопки "Копировать промт"
    copyBtn.addEventListener('click', () => {
        generateAndDisplayPrompt();
        generatedPromptTextarea.select();
        document.execCommand('copy');
        copyFeedback.style.display = 'block';
        setTimeout(() => {
            copyFeedback.style.display = 'none';
        }, 2000);
    });

    // Инициализация типов промптов и первоначальная генерация промпта при загрузке
    populatePromptTypes();
    generateAndDisplayPrompt(); // Initial call to display prompt or placeholder

    // Setup PDF.js worker
    if (window.pdfjsLib) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';
    }

    // --- File Processing Logic ---

    function readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
        });
    }

    function readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsArrayBuffer(file);
        });
    }

    function parseCsvContent(textContent) {
        // For now, just return the text content.
        // Future: could parse CSV into a more structured format if needed.
        return textContent;
    }

    async function parsePdfContent(arrayBuffer) {
        if (!window.pdfjsLib) {
            throw new Error('PDF.js library is not loaded.');
        }
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            fullText += textContent.items.map(item => item.str).join(' ') + '\n';
        }
        return fullText.trim();
    }

    async function parseDocxContent(arrayBuffer, fileExtension) {
        if (!window.mammoth) {
            throw new Error('Mammoth.js library is not loaded.');
        }
        try {
            const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
            return result.value;
        } catch (err) {
            console.error("Mammoth.js error:", err);
            if (fileExtension === 'doc') {
                throw new Error(`Failed to parse .doc file. Mammoth.js primarily supports .docx. Consider converting to .docx. (Error: ${err.message})`);
            }
            throw new Error(`Failed to parse .docx file. (Error: ${err.message})`);
        }
    }

    async function handleFileSelect(event, targetTextarea, fileNameDisplay, clearButton, loadingIndicator) {
        const fileInput = event.target;
        const file = fileInput.files[0];

        // Reset UI elements for this input
        targetTextarea.value = '';
        fileNameDisplay.textContent = '';
        clearButton.style.display = 'none';
        loadingIndicator.textContent = '';
        loadingIndicator.style.display = 'none';
        loadingIndicator.style.color = '#007bff'; // Reset color

        if (!file) {
            generateAndDisplayPrompt();
            return;
        }

        console.log('Selected file:', { name: file.name, type: file.type, size: file.size }); // Task 1.3

        loadingIndicator.textContent = 'Processing...';
        loadingIndicator.style.display = 'inline';

        const fileName = file.name;
        const fileExtension = fileName.split('.').pop().toLowerCase();
        const supportedExtensions = ['csv', 'pdf', 'docx', 'doc'];

        if (!supportedExtensions.includes(fileExtension)) {
            loadingIndicator.textContent = `Error: Unsupported file type (.${fileExtension}). Supported: ${supportedExtensions.join(', ')}`;
            loadingIndicator.style.color = 'red';
            fileInput.value = null; // Clear the file input
            generateAndDisplayPrompt();
            return;
        }

        try {
            let content = '';
            if (fileExtension === 'csv') {
                const textContent = await readFileAsText(file);
                content = parseCsvContent(textContent);
            } else if (fileExtension === 'pdf') {
                const arrayBuffer = await readFileAsArrayBuffer(file);
                content = await parsePdfContent(arrayBuffer);
            } else if (fileExtension === 'docx' || fileExtension === 'doc') {
                const arrayBuffer = await readFileAsArrayBuffer(file);
                content = await parseDocxContent(arrayBuffer, fileExtension);
            }

            targetTextarea.value = content;
            fileNameDisplay.textContent = `Loaded: ${fileName}`;
            fileNameDisplay.style.display = 'block';
            clearButton.style.display = 'inline-block';
            loadingIndicator.textContent = '';
            loadingIndicator.style.display = 'none';
            generateAndDisplayPrompt();

        } catch (error) {
            console.error('Error processing file:', error);
            targetTextarea.value = '';
            fileNameDisplay.textContent = '';
            clearButton.style.display = 'none';
            loadingIndicator.textContent = `Error: ${error.message || 'Could not process file.'}`;
            loadingIndicator.style.color = 'red';
            fileInput.value = null; // Clear the file input
            generateAndDisplayPrompt();
        }
    }

    function setupClearButtonListener(clearButton, fileInput, targetTextarea, fileNameDisplay, loadingIndicator) {
        clearButton.addEventListener('click', () => {
            fileInput.value = null;
            targetTextarea.value = '';
            fileNameDisplay.textContent = '';
            fileNameDisplay.style.display = 'none';
            clearButton.style.display = 'none';
            loadingIndicator.textContent = '';
            loadingIndicator.style.display = 'none';
            generateAndDisplayPrompt();
        });
    }

    // Add event listeners for file inputs
    userInputFile.addEventListener('change', (event) => handleFileSelect(event, userInputTextarea, userInputFileName, clearUserInputFileBtn, userInputFileLoading));
    customRulesFile.addEventListener('change', (event) => handleFileSelect(event, customRulesTextarea, customRulesFileName, clearCustomRulesFileBtn, customRulesFileLoading));

    // Add event listeners for clear buttons
    setupClearButtonListener(clearUserInputFileBtn, userInputFile, userInputTextarea, userInputFileName, userInputFileLoading);
    setupClearButtonListener(clearCustomRulesFileBtn, customRulesFile, customRulesTextarea, customRulesFileName, customRulesFileLoading);

    // После определения функции generateAndDisplayPrompt и после загрузки DOM
    document.addEventListener('DOMContentLoaded', function() {
        var refreshBtn = document.getElementById('refreshPromptBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', generateAndDisplayPrompt);
        }
    });
});

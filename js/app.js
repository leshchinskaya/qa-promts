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

    const userInputFileListContainer = document.getElementById('userInputFileListContainer');
    let uploadedUserInputFiles = [];

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
        },
        project_test_analysis: {
            name: 'Анализ тестирования на проекте',
            path: 'project_test_analysis',
            promptTypes: [
                { value: 'prompt1', display: 'Анализ багов' },
                { value: 'prompt2', display: 'Анализ нагрузки команды' },
                { value: 'prompt3', display: 'Анализ общего качества на проекте' }
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
                defaultOption.textContent = "-- Выберите задачу --";
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
            option.textContent = "-- Сначала выберите задачу --";
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
        // if (!template) {
        //     generatedPromptTextarea.value = 'Пожалуйста, выберите тип задачи и детали задачи.';
        //     return;
        // }
        let finalPrompt = template.replace('{{USER_INPUT}}', userInput);
        if (customRules) {
            finalPrompt = finalPrompt.replace('Custom Rules (if any):\n{{CUSTOM_RULES}}', `Custom Rules:\n${customRules}`);
            finalPrompt = finalPrompt.replace('{{CUSTOM_RULES}}', customRules);
        } else {
            finalPrompt = finalPrompt.replace('Custom Rules (if any):\n{{CUSTOM_RULES}}', 'Custom Rules: None');
            finalPrompt = finalPrompt.replace('{{CUSTOM_RULES}}', 'None');
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

    function generateFileId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    function updateUserInputTextarea() {
        userInputTextarea.value = uploadedUserInputFiles.map(file => file.content).join(' ').trim();
        generateAndDisplayPrompt();
    }

    function renderUserInputFileList() {
        const contextFilesBlock = document.querySelector('.context-files-block');
        userInputFileListContainer.innerHTML = '';
        if (uploadedUserInputFiles.length === 0) {
            if (contextFilesBlock) contextFilesBlock.style.display = 'none';
            return;
        }
        if (contextFilesBlock) contextFilesBlock.style.display = '';
        const ul = document.createElement('ul');
        uploadedUserInputFiles.forEach(file => {
            const li = document.createElement('li');
            const fileNameSpan = document.createElement('span');
            fileNameSpan.textContent = file.name;
            const removeBtn = document.createElement('button');
            removeBtn.textContent = 'Удалить';
            removeBtn.dataset.fileId = file.id;
            removeBtn.className = 'remove-user-input-file-btn';
            li.appendChild(fileNameSpan);
            li.appendChild(removeBtn);
            ul.appendChild(li);
        });
        userInputFileListContainer.appendChild(ul);
    }

    async function processAndAddUserInputFile(event) {
        const fileInput = event.target;
        const file = fileInput.files[0];

        userInputFileName.textContent = ''; // Clear single file name display
        userInputFileLoading.textContent = '';
        userInputFileLoading.style.display = 'none';

        if (!file) return;

        console.log('Processing for userInput (multi-file):', { name: file.name, type: file.type, size: file.size });

        userInputFileLoading.textContent = 'Processing...';
        userInputFileLoading.style.display = 'inline';
        userInputFileLoading.style.color = '#007bff';

        const fileName = file.name;
        const fileExtension = fileName.split('.').pop().toLowerCase();
        const supportedExtensions = ['csv', 'pdf', 'docx', 'doc', 'txt'];

        if (!supportedExtensions.includes(fileExtension)) {
            userInputFileLoading.textContent = `Error: Unsupported file type (.${fileExtension}).`;
            userInputFileLoading.style.color = 'red';
            fileInput.value = null;
            return;
        }

        try {
            let content = '';
            if (fileExtension === 'txt') {
                content = await readFileAsText(file);
            } else if (fileExtension === 'csv') {
                content = parseCsvContent(await readFileAsText(file));
            } else if (fileExtension === 'pdf') {
                content = await parsePdfContent(await readFileAsArrayBuffer(file));
            } else if (fileExtension === 'docx' || fileExtension === 'doc') {
                content = await parseDocxContent(await readFileAsArrayBuffer(file), fileExtension);
            }

            uploadedUserInputFiles.push({ id: generateFileId(), name: fileName, content: content.trim() });
            updateUserInputTextarea();
            renderUserInputFileList();
            userInputFileLoading.textContent = `Added: ${fileName}`;
            setTimeout(() => { if(userInputFileLoading.textContent === `Added: ${fileName}`) { userInputFileLoading.textContent = ''; userInputFileLoading.style.display = 'none';}}, 3000);
        } catch (error) {
            console.error('Error processing file for userInput:', error);
            userInputFileLoading.textContent = `Error: ${error.message || 'Could not process file.'}`;
            userInputFileLoading.style.color = 'red';
        } finally {
            fileInput.value = null; // Allow selecting the same file again
        }
    }

    function setupClearButtonListener(clearButton, fileInput, targetTextarea, fileNameDisplay, loadingIndicator) {
        clearButton.addEventListener('click', () => {
            fileInput.value = null; 
            targetTextarea.value = '';
            fileNameDisplay.textContent = '';
            fileNameDisplay.style.display = 'none';
            loadingIndicator.textContent = '';
            loadingIndicator.style.display = 'none';
            loadingIndicator.style.color = '#007bff'; // Reset color
            generateAndDisplayPrompt();
        });
    }

    // Add event listeners for file inputs
    userInputFile.addEventListener('change', processAndAddUserInputFile);
    customRulesFile.addEventListener('change', (event) => handleSingleFileUpload(event, customRulesTextarea, customRulesFileName, clearCustomRulesFileBtn, customRulesFileLoading));

    // Specific clear listener for userInputFile (multi-file)
    clearUserInputFileBtn.addEventListener('click', () => {
        uploadedUserInputFiles = [];
        userInputFile.value = null;
        userInputFileName.textContent = ''; // Clear any residual single file name
        userInputFileLoading.textContent = '';
        userInputFileLoading.style.display = 'none';
        updateUserInputTextarea(); // Clears textarea and updates prompt
        renderUserInputFileList(); // Clears the displayed list
    });

    // Setup clear button for customRulesFile (single-file)
    setupClearButtonListener(clearCustomRulesFileBtn, customRulesFile, customRulesTextarea, customRulesFileName, customRulesFileLoading);

    // Event listener for removing files from the user input list
    userInputFileListContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('remove-user-input-file-btn')) {
            const fileIdToRemove = event.target.dataset.fileId;
            uploadedUserInputFiles = uploadedUserInputFiles.filter(file => file.id !== fileIdToRemove);
            updateUserInputTextarea();
            renderUserInputFileList();
        }
    });

    // После определения функции generateAndDisplayPrompt и после загрузки DOM
    document.addEventListener('DOMContentLoaded', function() {
        var refreshBtn = document.getElementById('refreshPromptBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', generateAndDisplayPrompt);
        }
    });

    const loadBaseRulesBtn = document.getElementById('loadBaseRulesBtn');
    // Event listener for loading base rules
    loadBaseRulesBtn.addEventListener('click', async () => {
        try {
            const response = await fetch('rules/base_rules.txt');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} for rules/base_rules.txt`);
            }
            const baseRulesText = await response.text();
            if (customRulesTextarea.value.trim()) {
                customRulesTextarea.value += '\n' + baseRulesText;
            } else {
                customRulesTextarea.value = baseRulesText;
            }
            generateAndDisplayPrompt(); // Update the main prompt
        } catch (error) {
            console.error('Error loading base rules:', error);
            // Optionally, display an error to the user in the UI
            customRulesTextarea.value = `Ошибка загрузки базовых правил: ${error.message}`;
        }
    });

    renderUserInputFileList(); // Скрыть блок при загрузке, если файлов нет
});

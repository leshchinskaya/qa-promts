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

    const generatedPromptCharCount = document.getElementById('generatedPromptCharCount');

    // Elements for "New Checks Generator" tab
    const newChecksGeneratorSection = document.getElementById('new-checks-generator-section');

    const newChecksBusinessReqTextarea = document.getElementById('newChecksBusinessReqTextarea');
    const newChecksXstateMachineTextarea = document.getElementById('newChecksXstateMachineTextarea');
    const newChecksOtherReqTextarea = document.getElementById('newChecksOtherReqTextarea');
    const newChecksCustomRulesTextarea = document.getElementById('newChecksCustomRulesTextarea'); // Renamed from newChecksCustomRulesForChecksTextarea for brevity

    const newChecksBusinessReqFile = document.getElementById('newChecksBusinessReqFile');
    const newChecksXstateMachineFile = document.getElementById('newChecksXstateMachineFile');
    const newChecksOtherReqFile = document.getElementById('newChecksOtherReqFile');
    const newChecksCustomRulesFile_newTab = document.getElementById('newChecksCustomRulesFile_newTab');

    const clearNewChecksBusinessReqBtn = document.getElementById('clearNewChecksBusinessReqBtn');
    const clearNewChecksXstateMachineBtn = document.getElementById('clearNewChecksXstateMachineBtn');
    const clearNewChecksOtherReqBtn = document.getElementById('clearNewChecksOtherReqBtn');
    const clearNewChecksCustomRulesBtn = document.getElementById('clearNewChecksCustomRulesBtn');

    const newChecksGeneratedPromptTextarea = document.getElementById('newChecksGeneratedPromptTextarea');
    const copyNewChecksBtn = document.getElementById('copyNewChecksBtn');
    const newChecksCopyFeedback = document.getElementById('newChecksCopyFeedback');

    // New elements for "Кастомные правила (опционально)" on New Checks Generator tab
    const newChecksAdditionalCustomRulesTextarea = document.getElementById('newChecksAdditionalCustomRulesTextarea');
    const newChecksAdditionalCustomRulesFile = document.getElementById('newChecksAdditionalCustomRulesFile');
    const loadBaseRulesForNewChecksBtn = document.getElementById('loadBaseRulesForNewChecksBtn');
    const clearNewChecksAdditionalCustomRulesBtn = document.getElementById('clearNewChecksAdditionalCustomRulesBtn');

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
                { value: 'prompt4', display: 'Для исследовательского тестирования (чек-лист)' },
                { value: 'prompt5', display: 'Для генерации пользовательских сценариев и проверок по тестам' }
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
        },
        ai_boost_promts: {
            name: 'Создание требований',
            path: 'ai-boost-promts',
            promptTypes: [
                { value: 'prompt2', display: 'Создание xstate - TypeScript' },
                { value: 'prompt3', display: 'Создание xstate - JSON' },
                { value: 'prompt1', display: 'Ревью xstate машины' }
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

    // Функция для обновления счетчика символов
    function updateGeneratedPromptCharCount() {
        if (generatedPromptCharCount && generatedPromptTextarea) {
            const len = generatedPromptTextarea.value.length;
            generatedPromptCharCount.textContent = len + ' символ' + (len % 10 === 1 && len % 100 !== 11 ? ' ' : (len % 10 >= 2 && len % 10 <= 4 && (len % 100 < 10 || len % 100 >= 20) ? 'а ' : 'ов '));
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
        updateGeneratedPromptCharCount();
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
    updateGeneratedPromptCharCount();

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

    // --- New Checks Generator Logic ---
    const newChecksPromptTemplatePath = 'prompts/new_check_generation/main_template.txt';

    async function generateAndDisplayNewChecksPrompt() {
        if (!newChecksGeneratorSection || newChecksGeneratorSection.style.display === 'none') return;

        const businessReq = newChecksBusinessReqTextarea.value.trim();
        const xstateMachine = newChecksXstateMachineTextarea.value.trim();
        const otherReq = newChecksOtherReqTextarea.value.trim();
        const customRulesForChecks = newChecksCustomRulesTextarea.value.trim();
        const additionalCustomRules = newChecksAdditionalCustomRulesTextarea ? newChecksAdditionalCustomRulesTextarea.value.trim() : '';

        try {
            const response = await fetch(newChecksPromptTemplatePath);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} for ${newChecksPromptTemplatePath}`);
            }
            let template = await response.text();

            template = template.replace('{{BUSINESS_REQUIREMENTS}}', businessReq || 'None');
            template = template.replace('{{XSTATE_MACHINE}}', xstateMachine || 'None');
            template = template.replace('{{CUSTOM_RULES_FOR_CHECKS}}', customRulesForChecks || 'None');
            template = template.replace('{{OTHER_REQUIREMENTS}}', otherReq || 'None');
            template = template.replace('{{ADDITIONAL_CUSTOM_RULES}}', additionalCustomRules || 'None');

            newChecksGeneratedPromptTextarea.value = template;
        } catch (error) {
            console.error('Error fetching or processing new checks prompt template:', error);
            newChecksGeneratedPromptTextarea.value = `Ошибка: Не удалось загрузить или обработать шаблон промпта (${newChecksPromptTemplatePath}). ${error.message}`;
        }
    }

    async function handleNewTabSingleFileUpload(event, targetTextarea, fileNameDisplayId, loadingIndicatorId) {
        const fileInput = event.target;
        const file = fileInput.files[0];
        const fileNameDisplay = document.getElementById(fileNameDisplayId);
        const loadingIndicator = document.getElementById(loadingIndicatorId);

        if (!file) {
            // If no file is selected (e.g., user cancels dialog), do nothing or clear previous.
            // For now, let's not clear if they cancel, only if they upload a new file or click clear.
            return;
        }

        fileNameDisplay.textContent = '';
        loadingIndicator.textContent = 'Загрузка...';
        loadingIndicator.style.display = 'inline';
        loadingIndicator.style.color = '#007bff';

        const fileName = file.name;
        const fileExtension = fileName.split('.').pop().toLowerCase();
        const supportedExtensions = ['csv', 'pdf', 'docx', 'doc', 'txt', 'json']; // Added json for xstate

        if (!supportedExtensions.includes(fileExtension)) {
            loadingIndicator.textContent = `Ошибка: Неподдерживаемый тип файла (.${fileExtension}).`;
            loadingIndicator.style.color = 'red';
            fileNameDisplay.textContent = fileName; // Show problematic file name
            fileInput.value = null; // Clear the input
            return;
        }

        try {
            let content = '';
            if (fileExtension === 'txt' || fileExtension === 'json') {
                content = await readFileAsText(file);
            } else if (fileExtension === 'csv') {
                content = parseCsvContent(await readFileAsText(file));
            } else if (fileExtension === 'pdf') {
                content = await parsePdfContent(await readFileAsArrayBuffer(file));
            } else if (fileExtension === 'docx' || fileExtension === 'doc') {
                content = await parseDocxContent(await readFileAsArrayBuffer(file), fileExtension);
            }
            targetTextarea.value = content.trim();
            fileNameDisplay.textContent = fileName;
            fileNameDisplay.style.display = 'block';
            loadingIndicator.textContent = 'Загружено!';
            setTimeout(() => { loadingIndicator.style.display = 'none'; }, 2000);
            generateAndDisplayNewChecksPrompt();
        } catch (error) {
            console.error('Error processing file for new tab:', error);
            loadingIndicator.textContent = `Ошибка: ${error.message || 'Не удалось обработать файл.'}`;
            loadingIndicator.style.color = 'red';
            fileNameDisplay.textContent = fileName; // Show problematic file name
        }
        // Do not reset fileInput.value here, so the name stays. Reset on clear.
    }

    function setupNewTabClearButton(clearButton, fileInput, targetTextarea, fileNameDisplayId, loadingIndicatorId) {
        const fileNameDisplay = document.getElementById(fileNameDisplayId);
        const loadingIndicator = document.getElementById(loadingIndicatorId);
        clearButton.addEventListener('click', () => {
            fileInput.value = null;
            targetTextarea.value = '';
            fileNameDisplay.textContent = '';
            fileNameDisplay.style.display = 'none';
            loadingIndicator.textContent = '';
            loadingIndicator.style.display = 'none';
            generateAndDisplayNewChecksPrompt();
        });
    }

    // Event listeners for "New Checks Generator" tab inputs
    [newChecksBusinessReqTextarea, newChecksXstateMachineTextarea, newChecksOtherReqTextarea, newChecksCustomRulesTextarea].forEach(textarea => {
        textarea.addEventListener('input', debounce(generateAndDisplayNewChecksPrompt, 400));
    });

    newChecksBusinessReqFile.addEventListener('change', (e) => handleNewTabSingleFileUpload(e, newChecksBusinessReqTextarea, 'newChecksBusinessReqFileName', 'newChecksBusinessReqFileLoading'));
    newChecksXstateMachineFile.addEventListener('change', (e) => handleNewTabSingleFileUpload(e, newChecksXstateMachineTextarea, 'newChecksXstateMachineFileName', 'newChecksXstateMachineFileLoading'));
    newChecksOtherReqFile.addEventListener('change', (e) => handleNewTabSingleFileUpload(e, newChecksOtherReqTextarea, 'newChecksOtherReqFileName', 'newChecksOtherReqFileLoading'));
    newChecksCustomRulesFile_newTab.addEventListener('change', (e) => handleNewTabSingleFileUpload(e, newChecksCustomRulesTextarea, 'newChecksCustomRulesFileName_newTab', 'newChecksCustomRulesFileLoading_newTab'));

    // Event listeners for the new "Кастомные правила (опционально)" field on New Checks Generator tab
    if (newChecksAdditionalCustomRulesFile && newChecksAdditionalCustomRulesTextarea) {
        newChecksAdditionalCustomRulesFile.addEventListener('change', (e) => handleNewTabSingleFileUpload(e, newChecksAdditionalCustomRulesTextarea, 'newChecksAdditionalCustomRulesFileName', 'newChecksAdditionalCustomRulesFileLoading'));
    }
    if (clearNewChecksAdditionalCustomRulesBtn && newChecksAdditionalCustomRulesFile && newChecksAdditionalCustomRulesTextarea) {
        setupNewTabClearButton(clearNewChecksAdditionalCustomRulesBtn, newChecksAdditionalCustomRulesFile, newChecksAdditionalCustomRulesTextarea, 'newChecksAdditionalCustomRulesFileName', 'newChecksAdditionalCustomRulesFileLoading');
    }
    if (loadBaseRulesForNewChecksBtn && newChecksAdditionalCustomRulesTextarea) {
        loadBaseRulesForNewChecksBtn.addEventListener('click', async () => {
            try {
                const response = await fetch('rules/base_rules.txt');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status} for rules/base_rules.txt`);
                }
                const baseRulesText = await response.text();
                newChecksAdditionalCustomRulesTextarea.value = newChecksAdditionalCustomRulesTextarea.value.trim() ? newChecksAdditionalCustomRulesTextarea.value + '\n' + baseRulesText : baseRulesText;
                generateAndDisplayNewChecksPrompt();
            } catch (error) {
                console.error('Error loading base rules for new checks (additional):', error);
                newChecksAdditionalCustomRulesTextarea.value = `Ошибка загрузки базовых правил: ${error.message}`;
            }
        });
    }
    if (newChecksAdditionalCustomRulesTextarea) {
        newChecksAdditionalCustomRulesTextarea.addEventListener('input', debounce(generateAndDisplayNewChecksPrompt, 400));
    }

    // --- Xray Importer Logic ---
    const jiraUrlInput = document.getElementById('jiraUrl');
    const jiraUsernameInput = document.getElementById('jiraUsername');
    const jiraPasswordInput = document.getElementById('jiraPassword');
    const jiraProjectKeyInput = document.getElementById('jiraProjectKey');
    const xrayCsvDataTextarea = document.getElementById('xrayCsvData');
    const runXrayImportBtn = document.getElementById('runXrayImportBtn');
    const xrayImportLoadingSpan = document.getElementById('xrayImportLoading');
    const xrayImportResultOutputPre = document.getElementById('xrayImportResultOutput');
    const xrayCsvFileInput = document.getElementById('xrayCsvFile');
    const loadCsvFileBtn = document.getElementById('loadCsvFileBtn');
    const clearCsvFileBtn = document.getElementById('clearCsvFileBtn');

    // Установить значение по умолчанию для jiraUrl, если оно пустое
    if (jiraUrlInput && !jiraUrlInput.value) {
        jiraUrlInput.value = 'https://jira.surf.dev';
    }

    function makeJiraLinksClickable(outputText, jiraUrl) {
        // Найти все уникальные ключи задач (например, SURFQA-2377)
        const issueKeyRegex = /([A-Z][A-Z0-9]+-\d+)/g;
        const foundKeys = Array.from(new Set((outputText.match(issueKeyRegex) || [])));
        if (foundKeys.length === 0) return outputText;
        // Сформировать ссылку
        const jql = encodeURIComponent('issuekey in (' + foundKeys.join(', ') + ')');
        // Использовать первый ключ для browse
        const mainKey = foundKeys[0];
        const link = `${jiraUrl}/browse/${mainKey}?jql=${jql}`;
        // Заменить все ключи на ссылку
        let replaced = outputText;
        foundKeys.forEach(key => {
            // Заменяем только "голые" ключи (не внутри других слов)
            replaced = replaced.replace(new RegExp(`(?<![\\w-])(${key})(?![\\w-])`, 'g'), `<a href="${link}" target="_blank" rel="noopener noreferrer">${key}</a>`);
        });
        // Добавить ссылку в начало блока STDOUT, если есть ключи
        replaced = replaced.replace(/(--- STDOUT \(Вывод скрипта\) ---\n)/, `$1${link}\n`);
        return replaced;
    }

    if (runXrayImportBtn) {
        runXrayImportBtn.addEventListener('click', async () => {
            const jiraUrl = jiraUrlInput.value.trim();
            const jiraUsername = jiraUsernameInput.value.trim();
            const jiraPassword = jiraPasswordInput.value; // Password might intentionally have spaces
            const jiraProjectKey = jiraProjectKeyInput.value.trim();
            const csvData = xrayCsvDataTextarea.value.trim();

            if (!jiraUrl || !jiraUsername || !jiraPassword || !jiraProjectKey || !csvData) {
                xrayImportResultOutputPre.textContent = 'Ошибка: Все поля (Jira URL, Логин, Пароль, Ключ проекта) и CSV данные должны быть заполнены.';
                return;
            }

            xrayImportLoadingSpan.style.display = 'inline';
            runXrayImportBtn.disabled = true;
            xrayImportResultOutputPre.textContent = 'Выполняется запрос к серверу...';

            try {
                const response = await fetch('http://localhost:5050/api/run-xray-script', { // Assumes API is on the same origin
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        jira_url: jiraUrl,
                        jira_username: jiraUsername,
                        jira_password: jiraPassword,
                        jira_project_key: jiraProjectKey,
                        csv_data: csvData,
                    }),
                });

                const result = await response.json();

                let outputText = `--- Результаты импорта: ---\n${result.stdout || '(пусто)'}\n\n`;
                outputText += `--- Ошибки выполнения: ---\n${result.stderr || '(пусто)'}\n`;
                
                if (result.error) { // Errors from the backend server itself
                     outputText += `\n--- Ошибка сервера Flask ---\n${result.error}\n`;
                }

                // Сделать номера задач кликабельными
                const clickableOutput = makeJiraLinksClickable(outputText, jiraUrl);
                xrayImportResultOutputPre.innerHTML = clickableOutput;

            } catch (error) {
                console.error('Error calling Xray import API:', error);
                xrayImportResultOutputPre.textContent = `Критическая ошибка при вызове API: ${error.message}\nУбедитесь, что бэкенд-сервер (Flask) запущен и доступен по адресу /api/run-xray-script.`;
            } finally {
                xrayImportLoadingSpan.style.display = 'none';
                runXrayImportBtn.disabled = false;
            }
        });
    }

    // Загрузка CSV-файла в textarea
    if (loadCsvFileBtn && xrayCsvFileInput && xrayCsvDataTextarea) {
        loadCsvFileBtn.addEventListener('click', () => {
            xrayCsvFileInput.value = '';
            xrayCsvFileInput.click();
        });
        xrayCsvFileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                xrayCsvDataTextarea.value = e.target.result;
            };
            reader.readAsText(file);
        });
    }

    if (clearCsvFileBtn && xrayCsvDataTextarea) {
        clearCsvFileBtn.addEventListener('click', () => {
            xrayCsvDataTextarea.value = '';
        });
    }

    // Sidebar menu logic
    function setupSidebarMenu() {
        const menuItems = document.querySelectorAll('.sidebar-menu-item');
        const promptSection = document.getElementById('prompt-generator-section');
        const xraySection = document.getElementById('xray-import-section');
        // newChecksGeneratorSection is already defined globally

        const sections = {
            'prompt-generator': promptSection,
            'new-checks-generator': newChecksGeneratorSection,
            'xray-import': xraySection
        };

        menuItems.forEach(item => {
            item.addEventListener('click', function() {
                menuItems.forEach(i => i.classList.remove('active'));
                this.classList.add('active');

                const activeSectionName = this.dataset.section;

                for (const sectionName in sections) {
                    if (sections[sectionName]) { // Ensure section element exists
                        sections[sectionName].style.display = (sectionName === activeSectionName) ? '' : 'none';
                    }
                }

                if (sections[activeSectionName]) {
                    sections[activeSectionName].scrollIntoView({ behavior: 'smooth', block: 'start' });
                    if (activeSectionName === 'new-checks-generator') {
                        generateAndDisplayNewChecksPrompt(); // Initial generation when tab becomes active
                    } else if (activeSectionName === 'prompt-generator') {
                        generateAndDisplayPrompt(); // Ensure prompt updates if returning to this tab
                    }
                }
            });
        });
    }
    setupSidebarMenu();

    // Setup clear buttons for "New Checks Generator" tab
    setupNewTabClearButton(clearNewChecksBusinessReqBtn, newChecksBusinessReqFile, newChecksBusinessReqTextarea, 'newChecksBusinessReqFileName', 'newChecksBusinessReqFileLoading');
    setupNewTabClearButton(clearNewChecksXstateMachineBtn, newChecksXstateMachineFile, newChecksXstateMachineTextarea, 'newChecksXstateMachineFileName', 'newChecksXstateMachineFileLoading');
    setupNewTabClearButton(clearNewChecksOtherReqBtn, newChecksOtherReqFile, newChecksOtherReqTextarea, 'newChecksOtherReqFileName', 'newChecksOtherReqFileLoading');
    setupNewTabClearButton(clearNewChecksCustomRulesBtn, newChecksCustomRulesFile_newTab, newChecksCustomRulesTextarea, 'newChecksCustomRulesFileName_newTab', 'newChecksCustomRulesFileLoading_newTab');

    // Copy button for "New Checks Generator" tab
    copyNewChecksBtn.addEventListener('click', () => {
        newChecksGeneratedPromptTextarea.select();
        document.execCommand('copy');
        newChecksCopyFeedback.style.display = 'block';
        setTimeout(() => {
            newChecksCopyFeedback.style.display = 'none';
        }, 2000);
    });
});

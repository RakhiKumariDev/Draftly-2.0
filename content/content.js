/**
 * Draftly Content Script
 * Injects two buttons into Gmail compose area:
 * 1. Reply to Thread (automatic)
 * 2. Generate Reply (user prompt)
 */

(function() {
    const BUTTON_IDS = {
        replyToThread: 'draftly-reply-thread-btn',
        generateReply: 'draftly-generate-btn'
    };

    // Observe DOM changes to handle Gmail's dynamic loading
    const observer = new MutationObserver(() => {
        addDraftlyButtons();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    /**
     * Add Draftly buttons to all visible Gmail compose boxes
     */
    function addDraftlyButtons() {
        const composeBoxes = document.querySelectorAll('div[role="textbox"][contenteditable="true"]');

        composeBoxes.forEach(box => {
            const container = box.parentElement;
            if (!container) return;

            // Add Reply to Thread button
            if (!document.getElementById(BUTTON_IDS.replyToThread)) {
                const btn = createButton('Reply to Thread', BUTTON_IDS.replyToThread);
                btn.addEventListener('click', () => handleReplyToThread(box));
                container.appendChild(btn);
            }

            // Add Generate Reply button
            if (!document.getElementById(BUTTON_IDS.generateReply)) {
                const btn = createButton('Generate Reply', BUTTON_IDS.generateReply);
                btn.addEventListener('click', () => handleGenerateReplyPrompt(box));
                container.appendChild(btn);
            }
        });
    }

    /**
     * Create a styled button
     * @param {string} text - Button text
     * @param {string} id - Button ID
     * @returns {HTMLElement} button
     */
    function createButton(text, id) {
        const btn = document.createElement('button');
        btn.id = id;
        btn.textContent = text;
        btn.style.margin = '0 4px';
        btn.style.padding = '4px 8px';
        btn.style.border = '1px solid #667eea';
        btn.style.borderRadius = '4px';
        btn.style.background = '#f1f3f4';
        btn.style.cursor = 'pointer';
        btn.style.fontSize = '12px';
        return btn;
    }

    /**
     * Handle Reply to Thread button click
     * @param {HTMLElement} composeBox - Gmail compose textbox
     */
    async function handleReplyToThread(composeBox) {
        try {
            const threadText = getEmailThreadText();
            if (!threadText) {
                alert('Unable to read email thread.');
                return;
            }

            const response = await sendMessageToBackground({
                action: 'replyToThread',
                prompt: threadText
            });

            if (response.success) {
                insertTextIntoComposeBox(composeBox, response.reply);
            } else {
                alert('Error generating reply: ' + response.error);
            }
        } catch (error) {
            console.error('Error in replyToThread:', error);
            alert('Failed to generate reply.');
        }
    }

    /**
     * Handle Generate Reply button click
     * @param {HTMLElement} composeBox - Gmail compose textbox
     */
    async function handleGenerateReplyPrompt(composeBox) {
        try {
            const userPrompt = prompt('Enter your instructions for the email reply:');
            if (!userPrompt) return;

            const response = await sendMessageToBackground({
                action: 'generateReply',
                prompt: userPrompt
            });

            if (response.success) {
                insertTextIntoComposeBox(composeBox, response.reply);
            } else {
                alert('Error generating reply: ' + response.error);
            }
        } catch (error) {
            console.error('Error in generateReply:', error);
            alert('Failed to generate reply.');
        }
    }

    /**
     * Insert text into Gmail compose box
     * @param {HTMLElement} composeBox
     * @param {string} text
     */
    function insertTextIntoComposeBox(composeBox, text) {
        composeBox.focus();
        document.execCommand('insertText', false, text);
    }

    /**
     * Retrieve email thread content from Gmail
     * @returns {string} concatenated email thread
     */
    function getEmailThreadText() {
        const threadElements = document.querySelectorAll('div.a3s'); // Gmail email body
        if (!threadElements.length) return '';

        let threadText = '';
        threadElements.forEach(el => {
            threadText += el.innerText + '\n\n';
        });

        return threadText.trim();
    }

    /**
     * Send message to background script and return the response
     * @param {Object} message
     * @returns {Promise<Object>}
     */
    function sendMessageToBackground(message) {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage(message, (response) => {
                resolve(response);
            });
        });
    }

})();

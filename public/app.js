document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    
    // Variable pour stocker l'ID de conversation
    let conversationId = null;

    // Fonction pour ajouter un message à la conversation
    function addMessage(text, sender, options = {}) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender);
        
        // Contenu principal du message
        const textSpan = document.createElement('span');
        textSpan.textContent = text;
        messageDiv.appendChild(textSpan);

        // Ajouter des informations supplémentaires si spécifiées
        if (options.specialistInfo) {
            const specialistDiv = document.createElement('div');
            specialistDiv.classList.add('specialist-info');
            specialistDiv.innerHTML = `
                <strong>Orientation médicale :</strong> 
                <span class="specialist-type">${options.specialistInfo.type}</span>
                <p class="specialist-description">${options.specialistInfo.description}</p>
            `;
            messageDiv.appendChild(specialistDiv);
        }

        chatMessages.appendChild(messageDiv);
        
        // Scroll au dernier message
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Fonction pour ajouter un indicateur de chargement
    function addLoadingIndicator() {
        const loadingDiv = document.createElement('div');
        loadingDiv.classList.add('loading');
        loadingDiv.id = 'loading-indicator';
        loadingDiv.innerHTML = `
            <div class="loading-dot"></div>
            <div class="loading-dot"></div>
            <div class="loading-dot"></div>
        `;
        chatMessages.appendChild(loadingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Fonction pour supprimer l'indicateur de chargement
    function removeLoadingIndicator() {
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.remove();
        }
    }

    // Fonction pour envoyer le message à l'API
    async function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;

        // Ajouter le message de l'utilisateur
        addMessage(message, 'user');
        userInput.value = '';

        // Ajouter indicateur de chargement
        addLoadingIndicator();

        try {
            // Envoyer le message au serveur avec l'ID de conversation
            const response = await fetch('/api/medical-assistant', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    message, 
                    conversationId  // Ajouter l'ID de conversation
                }),
            });

            if (!response.ok) {
                throw new Error('Erreur réseau');
            }

            const data = await response.json();

            // Mettre à jour l'ID de conversation
            conversationId = data.conversationId;

            // Supprimer l'indicateur de chargement
            removeLoadingIndicator();

            // Ajouter la réponse de l'IA avec les informations de spécialiste
            addMessage(data.response, 'ai', {
                specialistInfo: data.specialistInfo
            });

        } catch (error) {
            console.error('Erreur:', error);
            removeLoadingIndicator();
            addMessage('Désolé, une erreur s\'est produite. Veuillez réessayer.', 'ai');
        }
    }

    // Événement pour le bouton d'envoi
    sendButton.addEventListener('click', sendMessage);

    // Événement pour la touche Enter
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
});
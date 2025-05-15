document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    
    // Variable pour stocker l'ID de conversation
    let conversationId = null;

    // Fonction pour formater l'heure actuelle au format français
    function formatCurrentTime() {
        const now = new Date();
        const options = { 
            day: 'numeric', 
            month: 'long', 
            hour: '2-digit', 
            minute: '2-digit'
        };
        return now.toLocaleDateString('fr-FR', options);
    }

    // Fonction pour enregistrer l'historique des messages dans le stockage local
    function saveMessageHistory(messages) {
        localStorage.setItem('chatHistory', JSON.stringify(messages));
    }

    // Fonction pour récupérer l'historique des messages
    function getMessageHistory() {
        const history = localStorage.getItem('chatHistory');
        return history ? JSON.parse(history) : [];
    }

    // Fonction pour ajouter un message à la conversation
    function addMessage(text, sender, options = {}) {
        const timestamp = new Date().getTime();
        const formattedTime = formatCurrentTime();
        
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender);
        
        if (sender === 'ai') {
            messageDiv.innerHTML = `
                <div class="avatar">
                    <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f9d1-200d-2695-fe0f.svg" alt="Dr. Emma">
                </div>
                <div class="content">
                    <div class="name">Dr. Emma</div>
                    <div class="text">${text}</div>
                    <div class="time" data-timestamp="${timestamp}">${formattedTime}</div>
                </div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="content">
                    <div class="name">Vous</div>
                    <div class="text">${text}</div>
                    <div class="time" data-timestamp="${timestamp}">${formattedTime}</div>
                </div>
            `;
        }

        // Ajouter des informations supplémentaires si spécifiées
        if (options.specialistInfo) {
            const specialistDiv = document.createElement('div');
            specialistDiv.classList.add('specialist-info');
            specialistDiv.innerHTML = `
                <strong>Orientation médicale :</strong> 
                <span class="specialist-type">${options.specialistInfo.type}</span>
                <p class="specialist-description">${options.specialistInfo.description}</p>
            `;
            messageDiv.querySelector('.content').appendChild(specialistDiv);
        }

        chatMessages.appendChild(messageDiv);
        
        // Scroll au dernier message
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Enregistrer le message dans l'historique
        const messageHistory = getMessageHistory();
        messageHistory.push({
            type: sender,
            text: text,
            timestamp: timestamp,
            formattedTime: formattedTime,
            specialistInfo: options.specialistInfo || null
        });
        saveMessageHistory(messageHistory);
        
        return timestamp;
    }

    // Fonction pour ajouter un indicateur de chargement
    function addLoadingIndicator() {
        const loadingDiv = document.createElement('div');
        loadingDiv.classList.add('loading');
        loadingDiv.id = 'loading-indicator';
        loadingDiv.textContent = 'Dr. Emma est en train d\'écrire';
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

        // Ajuster la hauteur du textarea après l'envoi
        userInput.style.height = 'auto';

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
            
            // Mode simulation si le serveur n'est pas disponible
            simulateResponse(message);
        }
    }

    // Fonction de simulation de réponse (utilisée en cas d'erreur serveur)
    function simulateResponse(userMessage) {
        // Logique simple pour des réponses basées sur des mots-clés
        let response = "Je ne suis pas sûre de comprendre vos symptômes. Pouvez-vous fournir plus de détails?";
        let specialistInfo = null;
        
        const lowerMessage = userMessage.toLowerCase();
        
        if (lowerMessage.includes('mal de tête') || lowerMessage.includes('migraine')) {
            response = "Vos symptômes pourraient nécessiter une consultation chez un neurologue. Les maux de tête peuvent avoir diverses causes, allant du stress à des problèmes plus graves.";
            specialistInfo = {
                type: "Neurologue",
                description: "Spécialiste du système nerveux, qui traite les troubles du cerveau, de la moelle épinière et des nerfs."
            };
        } else if (lowerMessage.includes('fièvre') || lowerMessage.includes('température')) {
            response = "La fièvre est souvent un signe que votre corps combat une infection. Si elle persiste plus de 3 jours ou dépasse 39°C, consultez un médecin généraliste.";
            specialistInfo = {
                type: "Médecin généraliste",
                description: "Médecin de premier recours qui diagnostique et traite diverses maladies et peut vous orienter vers des spécialistes si nécessaire."
            };
        } else if (lowerMessage.includes('douleur') && (lowerMessage.includes('ventre') || lowerMessage.includes('estomac') || lowerMessage.includes('abdomen'))) {
            response = "Pour des douleurs abdominales, je vous recommande de consulter un gastro-entérologue, surtout si elles sont persistantes ou intenses.";
            specialistInfo = {
                type: "Gastro-entérologue",
                description: "Spécialiste qui traite les troubles du système digestif, y compris l'estomac, les intestins, le foie et le pancréas."
            };
        } else if (lowerMessage.includes('peau') || lowerMessage.includes('bouton') || lowerMessage.includes('éruption')) {
            response = "Pour les problèmes de peau, un dermatologue serait le spécialiste approprié à consulter.";
            specialistInfo = {
                type: "Dermatologue",
                description: "Spécialiste qui diagnostique et traite les affections de la peau, des cheveux et des ongles."
            };
        } else if (lowerMessage.includes('bonjour') || lowerMessage.includes('salut') || lowerMessage.includes('hello')) {
            response = "Bonjour ! Comment puis-je vous aider aujourd'hui ? N'hésitez pas à me décrire vos symptômes.";
        }
        
        // Ajouter la réponse de l'IA
        addMessage(response, 'ai', { specialistInfo });
    }

    // Initialiser l'application
    function initializeApp() {
        // Mettre à jour l'horodatage du premier message s'il existe déjà
        const firstMessageTime = document.querySelector('.message.ai .time');
        if (firstMessageTime) {
            firstMessageTime.textContent = formatCurrentTime();
            firstMessageTime.dataset.timestamp = new Date().getTime().toString();
        }
        
        // Charger l'historique des messages si disponible
        const messageHistory = getMessageHistory();
        if (messageHistory.length > 0) {
            // Effacer tous les messages existants
            chatMessages.innerHTML = '';
            
            // Recréer tous les messages depuis l'historique
            messageHistory.forEach(msg => {
                const messageDiv = document.createElement('div');
                messageDiv.classList.add('message', msg.type);
                
                if (msg.type === 'ai') {
                    messageDiv.innerHTML = `
                        <div class="avatar">
                            <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f9d1-200d-2695-fe0f.svg" alt="Dr. Emma">
                        </div>
                        <div class="content">
                            <div class="name">Dr. Emma</div>
                            <div class="text">${msg.text}</div>
                            <div class="time" data-timestamp="${msg.timestamp}">${msg.formattedTime}</div>
                        </div>
                    `;
                    
                    // Ajouter les informations de spécialiste si présentes
                    if (msg.specialistInfo) {
                        const specialistDiv = document.createElement('div');
                        specialistDiv.classList.add('specialist-info');
                        specialistDiv.innerHTML = `
                            <strong>Orientation médicale :</strong> 
                            <span class="specialist-type">${msg.specialistInfo.type}</span>
                            <p class="specialist-description">${msg.specialistInfo.description}</p>
                        `;
                        messageDiv.querySelector('.content').appendChild(specialistDiv);
                    }
                } else {
                    messageDiv.innerHTML = `
                        <div class="avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="content">
                            <div class="name">Vous</div>
                            <div class="text">${msg.text}</div>
                            <div class="time" data-timestamp="${msg.timestamp}">${msg.formattedTime}</div>
                        </div>
                    `;
                }
                
                chatMessages.appendChild(messageDiv);
            });
            
            // Faire défiler jusqu'au dernier message
            chatMessages.scrollTop = chatMessages.scrollHeight;
        } else {
            // Si aucun historique, enregistrer le premier message s'il existe
            const firstMessageText = document.querySelector('.message.ai .text');
            if (firstMessageText) {
                const firstMessage = {
                    type: 'ai',
                    text: firstMessageText.textContent,
                    timestamp: new Date().getTime(),
                    formattedTime: formatCurrentTime()
                };
                
                const messageHistory = [firstMessage];
                saveMessageHistory(messageHistory);
            }
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
    
    // Ajuster automatiquement la hauteur du textarea
    userInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
    
    // Initialiser l'application
    initializeApp();
});
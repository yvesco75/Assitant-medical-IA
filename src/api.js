const axios = require('axios');
require('dotenv').config();

// Vérification de la clé API
if (!process.env.GROQ_API_KEY) {
  console.warn('ATTENTION : La clé API Groq n\'est pas configurée');
}

// Base de données de conversation et de suivi
const conversationContext = {};

// Fonction pour obtenir une recommandation via Groq + LLaMA avec une approche plus naturelle
async function getGroqAIRecommendation(userMessage, conversationId) {
  try {
    // Récupérer le contexte de la conversation
    const context = conversationContext[conversationId] || {};

    // Préparer les messages pour l'IA
    const messages = [
      {
        role: "system",
        content: `Tu es un assistant médical empathique et direct. 
        Règles importantes :
        - Sois concis et naturel
        - Évite les réponses trop longues
        - Concentre-toi sur la conversation
        - Réponds de manière humaine, comme le ferait un professionnel de santé attentif
        - Ne recommande un spécialiste que si c'est vraiment nécessaire
        - Utilise un langage simple et chaleureux`
      }
    ];

    // Ajouter le contexte précédent s'il existe
    if (context.previousQuestions) {
      messages.push(...context.previousQuestions);
    }

    // Ajouter le message actuel de l'utilisateur
    messages.push({
      role: "user",
      content: userMessage
    });

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: messages,
      max_tokens: 200,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const aiResponse = response.data.choices[0].message.content.trim();
    
    // Analyser si une orientation médicale est vraiment nécessaire
    const specialistMatch = analyzeSpecialistNeeds(userMessage, aiResponse);

    // Mettre à jour le contexte de conversation
    if (!conversationContext[conversationId]) {
      conversationContext[conversationId] = { 
        previousQuestions: [],
        specialistRecommended: null
      };
    }

    conversationContext[conversationId].previousQuestions.push({
      role: "assistant",
      content: aiResponse
    });

    // Ne retourner l'info de spécialiste que si pertinent
    const specialistInfo = specialistMatch && userMessage.toLowerCase().match(/symptôme|mal|douleur|problème/i) 
      ? specialistMatch 
      : null;

    return {
      response: aiResponse,
      specialistInfo: specialistInfo
    };

  } catch (error) {
    console.error("Erreur avec l'API Groq:", error.response ? error.response.data : error.message);
    return {
      response: "Je suis à l'écoute. Pouvez-vous m'en dire plus ?",
      specialistInfo: null
    };
  }
}

// Fonction pour analyser les besoins de spécialistes
function analyzeSpecialistNeeds(userMessage, aiResponse) {
  const symptoms = userMessage.toLowerCase();

  const specialistCategories = [
    {
      keywords: ['dent', 'gencive', 'carie', 'dentaire'],
      specialist: {
        type: 'Dentiste',
        description: 'Un dentiste sera le mieux placé pour examiner vos problèmes bucco-dentaires.'
      }
    },
    {
      keywords: ['peau', 'bouton', 'éruption', 'acné', 'démangeaison'],
      specialist: {
        type: 'Dermatologue',
        description: 'Un dermatologue peut diagnostiquer et traiter les problèmes de peau avec précision.'
      }
    },
    {
      keywords: ['tête', 'migraine', 'mal de tête', 'vertiges'],
      specialist: {
        type: 'Neurologue',
        description: 'Un neurologue spécialisé pourra identifier l\'origine de vos maux de tête.'
      }
    },
    {
      keywords: ['œil', 'oeil', 'vision', 'vue'],
      specialist: {
        type: 'Ophtalmologue',
        description: 'Un ophtalmologue est expert pour les problèmes de vision et de santé oculaire.'
      }
    },
    {
      keywords: ['oreille', 'gorge', 'nez', 'rhume', 'sinusite'],
      specialist: {
        type: 'ORL',
        description: 'Un ORL (Oto-Rhino-Laryngologiste) est spécialisé dans ces zones sensibles.'
      }
    },
    {
      keywords: ['ventre', 'estomac', 'digestion', 'douleur abdominale'],
      specialist: {
        type: 'Gastro-entérologue',
        description: 'Un gastro-entérologue peut explorer en profondeur vos troubles digestifs.'
      }
    }
  ];

  // Recherche de mots-clés
  for (let category of specialistCategories) {
    if (category.keywords.some(keyword => symptoms.includes(keyword))) {
      return category.specialist;
    }
  }

  // Cas par défaut
  return null;
}

// Fonction pour traiter les messages des utilisateurs
async function processUserMessage(req, res) {
  try {
    const { message, conversationId } = req.body;

    // Générer un ID de conversation si non fourni
    const safeConversationId = conversationId || generateConversationId();

    // Obtenir la recommandation de l'IA
    const result = await getGroqAIRecommendation(message, safeConversationId);

    res.json({
      response: result.response,
      specialistInfo: result.specialistInfo,
      conversationId: safeConversationId
    });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({
      error: 'Une erreur est survenue lors de la communication avec l\'IA'
    });
  }
}

// Générer un ID de conversation unique
function generateConversationId() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

module.exports = {
  processUserMessage
};
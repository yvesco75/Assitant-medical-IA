// Importation des modules nécessaires
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Création de l'application Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Import du module API
const api = require('./src/api');

// Route pour l'API d'assistance médicale
app.post('/api/medical-assistant', async (req, res) => {
  const { message, conversationId } = req.body;
  
  // Modification de l'appel pour passer explicitement les paramètres
  const modifiedReq = {
    ...req,
    body: { message, conversationId }
  };

  // Passez conversationId à votre fonction de traitement
  await api.processUserMessage(modifiedReq, res);
});

// Route principale pour servir l'interface
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
/**
 * Voice Routes
 * Handles voice processing and analysis endpoints
 */

const express = require('express');
const router = express.Router();

function createVoiceRoutes() {
  // POST /voice/analyze - Analyze voice text input
  router.post('/analyze', async (req, res) => {
    try {
      const { services } = req.app.locals;
      const { text } = req.body;

      if (!text || typeof text !== 'string') {
        return res.apiError('Missing required field: text', 400);
      }

      // Analyze voice input
      const analysis = services.voiceProcessor.analyzeVoiceInput(text);

      if (!analysis.success) {
        return res.apiError(analysis.error, 400);
      }

      res.apiSuccess({
        analysis: {
          type: analysis.type,
          urgency: analysis.urgency,
          confidence: analysis.confidence,
          detected_keywords: analysis.detected_keywords,
          processed_text: analysis.processed_text
        },
        original_text: text
      }, 'Voice analysis completed successfully');

    } catch (error) {
      console.error('Error analyzing voice:', error);
      res.apiError('Failed to analyze voice input', 500);
    }
  });

  // GET /voice/types - Get available incident types
  router.get('/types', async (req, res) => {
    try {
      const { services } = req.app.locals;
      const types = Object.keys(services.voiceProcessor.eventTypes);

      res.apiSuccess({
        types,
        total: types.length
      }, 'Incident types retrieved successfully');

    } catch (error) {
      console.error('Error fetching voice types:', error);
      res.apiError('Failed to fetch incident types', 500);
    }
  });

  // GET /voice/keywords - Get keywords for each incident type
  router.get('/keywords', async (req, res) => {
    try {
      const { services } = req.app.locals;
      const keywords = services.voiceProcessor.eventTypes;

      res.apiSuccess({
        keywords,
        total_types: Object.keys(keywords).length
      }, 'Voice keywords retrieved successfully');

    } catch (error) {
      console.error('Error fetching voice keywords:', error);
      res.apiError('Failed to fetch voice keywords', 500);
    }
  });

  // GET /voice/urgency - Get urgency level keywords
  router.get('/urgency', async (req, res) => {
    try {
      const { services } = req.app.locals;
      const urgency = services.voiceProcessor.urgencyKeywords;

      res.apiSuccess({
        urgency,
        levels: Object.keys(urgency)
      }, 'Urgency keywords retrieved successfully');

    } catch (error) {
      console.error('Error fetching urgency keywords:', error);
      res.apiError('Failed to fetch urgency keywords', 500);
    }
  });

  return router;
}

module.exports = createVoiceRoutes;

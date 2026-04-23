/**
 * Events Routes
 * Handles all event-related API endpoints
 */

const express = require('express');
const router = express.Router();
const PingEvent = require('../services/PingEvent');

function createEventsRoutes() {
  // POST /events - Create new incident
  router.post('/', async (req, res) => {
    try {
      const { services } = req.app.locals;
      const { 
        type, 
        urgency, 
        description, 
        lat, 
        lon, 
        user_id, 
        voice_url 
      } = req.body;

      // Validation
      if (!type || !urgency || !description || !lat || !lon) {
        return res.apiError('Missing required fields: type, urgency, description, lat, lon', 400);
      }

      // Generate unique ID
      const event_id = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create new PingEvent
      const event = new PingEvent({
        id: event_id,
        type,
        urgency,
        description,
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        user_id: user_id || 'anonymous',
        voice_url: voice_url || null
      });

      // Store event
      services.eventStore.addEvent(event);

      // Log to mesh network
      services.meshSimulator.logEventCreation(event);

      // Emit WebSocket event for real-time updates
      const io = req.app.get('io');
      if (io) {
        // Get author's reputation for the WebSocket event
        const userRep = services.eventStore.getUserReputation(event.user_id);
        const reputation = services.reputationEngine.calculateScore(event.user_id, userRep);
        const tier = services.reputationEngine.getDisplayTier(reputation);
        
        const eventWithRep = {
          ...event.toJSON(),
          reputation,
          reputation_tier: tier
        };
        
        io.emit('new_event', eventWithRep);
        console.log(`📡 WebSocket: Broadcasted new event ${event.id}`);
      }

      console.log(`📨 Received event from user: ${user_id} (${type}/${urgency})`);

      res.apiCreated({
        event_id: event.id,
        type: event.type,
        urgency: event.urgency,
        timestamp: event.timestamp,
        location: { lat: event.lat, lon: event.lon },
        text: event.text
      }, 'Event created successfully');

    } catch (error) {
      console.error('Error creating event:', error);
      res.apiError('Failed to create event', 500);
    }
  });

  // GET /events/nearby - Get events near location
  router.get('/nearby', async (req, res) => {
    try {
      const { services } = req.app.locals;
      const { lat, lon, radius = 5 } = req.query;

      if (!lat || !lon) {
        return res.apiError('Missing required parameters: lat, lon', 400);
      }

      const events = services.eventStore.getNearbyEvents(
        parseFloat(lat),
        parseFloat(lon),
        parseFloat(radius)
      );

      // Add reputation data to each event
      const eventsWithReputation = events.map(event => {
        const userRep = services.eventStore.userReputation.get(event.user_id);
        const reputation = services.reputationEngine.calculateScore(
          event.user_id,
          userRep
        );
        const tier = services.reputationEngine.getDisplayTier(reputation);

        return {
          ...event.toJSON(),
          reputation,
          reputation_tier: tier,
          distance_km: services.eventStore.calculateDistance(
            parseFloat(lat),
            parseFloat(lon),
            event.lat,
            event.lon
          )
        };
      });

      res.apiSuccess({
        events: eventsWithReputation,
        center: { lat: parseFloat(lat), lon: parseFloat(lon) },
        radius: parseFloat(radius),
        count: eventsWithReputation.length
      }, 'Nearby events retrieved successfully');

    } catch (error) {
      console.error('Error fetching nearby events:', error);
      res.apiError('Failed to fetch nearby events', 500);
    }
  });

  // POST /events/:id/confirm - Confirm event is real
  router.post('/:id/confirm', async (req, res) => {
    try {
      const { services } = req.app.locals;
      const { id } = req.params;
      const { user_id } = req.body;

      if (!user_id) {
        return res.apiError('Missing required field: user_id', 400);
      }

      const event = services.eventStore.getEventById(id);
      if (!event) {
        return res.apiError('Event not found', 404);
      }

      // Add confirmation
      event.addConfirmation(user_id);
      services.eventStore.updateUserReputation(user_id, 'confirmed');

      // Log to mesh network
      services.meshSimulator.logEventConfirmation(event, user_id);

      // Emit WebSocket event for real-time updates
      const io = req.app.get('io');
      if (io) {
        // Get author's reputation for the WebSocket event
        const userRep = services.eventStore.getUserReputation(event.user_id);
        const reputation = services.reputationEngine.calculateScore(event.user_id, userRep);
        const tier = services.reputationEngine.getDisplayTier(reputation);
        
        const eventWithRep = {
          ...event.toJSON(),
          reputation,
          reputation_tier: tier
        };
        
        io.emit('event_updated', eventWithRep);
        console.log(`📡 WebSocket: Broadcasted event update ${event.id}`);
      }

      console.log(`✅ Event ${id} confirmed by ${user_id}`);

      res.apiSuccess({
        event_id: id,
        confirmations: event.confirmations,
        fakes: event.fakes,
        confirmed_by: user_id
      }, 'Event confirmed successfully');

    } catch (error) {
      console.error('Error confirming event:', error);
      res.apiError('Failed to confirm event', 500);
    }
  });

  // POST /events/:id/fake - Report event as fake
  router.post('/:id/fake', async (req, res) => {
    try {
      const { services } = req.app.locals;
      const { id } = req.params;
      const { user_id } = req.body;

      if (!user_id) {
        return res.apiError('Missing required field: user_id', 400);
      }

      const event = services.eventStore.getEventById(id);
      if (!event) {
        return res.apiError('Event not found', 404);
      }

      // Add fake report
      event.addFake(user_id);
      services.eventStore.updateUserReputation(user_id, 'fake');

      // Log to mesh network
      services.meshSimulator.logEventFakeReport(event, user_id);

      // Emit WebSocket event for real-time updates
      const io = req.app.get('io');
      if (io) {
        // Get author's reputation for the WebSocket event
        const userRep = services.eventStore.getUserReputation(event.user_id);
        const reputation = services.reputationEngine.calculateScore(event.user_id, userRep);
        const tier = services.reputationEngine.getDisplayTier(reputation);
        
        const eventWithRep = {
          ...event.toJSON(),
          reputation,
          reputation_tier: tier
        };
        
        io.emit('event_updated', eventWithRep);
        console.log(`📡 WebSocket: Broadcasted event update ${event.id}`);
      }

      console.log(`🚫 Event ${id} reported as fake by ${user_id}`);

      res.apiSuccess({
        event_id: id,
        confirmations: event.confirmations,
        fakes: event.fakes,
        reported_by: user_id
      }, 'Event reported as fake successfully');

    } catch (error) {
      console.error('Error reporting fake event:', error);
      res.apiError('Failed to report fake event', 500);
    }
  });

  // GET /events/all - Get all events (for debugging/admin)
  router.get('/all', async (req, res) => {
    try {
      const { services } = req.app.locals;
      const events = Array.from(services.eventStore.events.values());

      const eventsData = events.map(event => event.toJSON());

      res.apiSuccess({
        events: eventsData,
        count: eventsData.length,
        total_users: services.eventStore.userReputation.size
      }, 'All events retrieved successfully');

    } catch (error) {
      console.error('Error fetching all events:', error);
      res.apiError('Failed to fetch all events', 500);
    }
  });

  return router;
}

module.exports = createEventsRoutes;

import { Router } from 'express';
import {
  getOrCreateTwinConfig,
  updateTwinConfig,
  getTwinLogs,
  getTwinDrafts,
  analyzeWritingStyle,
  generateTwinResponse,
  triageIncomingPing,
  processDraftAction,
  getHandoverDigest
} from '../services/digitalTwinService';

const router = Router();

// Middleware to extract user ID (fallback to default user if unauthenticated in dev)
const getUserId = (req: any) => {
  return req.user?.id || req.headers['x-user-id'] || 'default-user';
};

// GET /api/digital-twin/config
router.get('/config', (req, res) => {
  try {
    const userId = getUserId(req);
    const config = getOrCreateTwinConfig(userId);
    res.json({ success: true, config });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/digital-twin/config
router.post('/config', (req, res) => {
  try {
    const userId = getUserId(req);
    const updated = updateTwinConfig(userId, req.body);
    res.json({ success: true, config: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/digital-twin/status
router.post('/status', (req, res) => {
  try {
    const userId = getUserId(req);
    const { status, mode } = req.body;
    const updated = updateTwinConfig(userId, {
      ...(status && { status }),
      ...(mode && { mode })
    });
    res.json({ success: true, config: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/digital-twin/analyze-style
router.post('/analyze-style', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { samples } = req.body;
    const styleProfile = await analyzeWritingStyle(userId, Array.isArray(samples) ? samples : []);
    res.json({ success: true, styleProfile });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/digital-twin/test-prompt (Playground)
router.post('/test-prompt', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ success: false, error: 'Prompt is required' });

    const result = await generateTwinResponse(userId, prompt);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/digital-twin/simulate-ping
router.post('/simulate-ping', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { message, senderName, channel } = req.body;
    const result = await triageIncomingPing(userId, message || 'Status update query', senderName || 'Team Member', channel || 'Slack');
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/digital-twin/activity
router.get('/activity', (req, res) => {
  try {
    const userId = getUserId(req);
    const logs = getTwinLogs(userId);
    res.json({ success: true, logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/digital-twin/drafts
router.get('/drafts', (req, res) => {
  try {
    const userId = getUserId(req);
    const drafts = getTwinDrafts(userId);
    res.json({ success: true, drafts });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/digital-twin/drafts/:id/action
router.post('/drafts/:id/action', (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { action, editedContent } = req.body;
    const success = processDraftAction(userId, id, action, editedContent);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/digital-twin/handover
router.get('/handover', (req, res) => {
  try {
    const userId = getUserId(req);
    const digest = getHandoverDigest(userId);
    res.json({ success: true, digest });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

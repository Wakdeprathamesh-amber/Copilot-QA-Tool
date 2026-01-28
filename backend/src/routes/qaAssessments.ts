import { Router, Request, Response } from 'express';
import { qaAssessmentRepository } from '../repositories/qaAssessmentRepository';
import { logger } from '../utils/logger';

const router = Router();

// POST /api/qa-assessments/bulk - Bulk fetch QA assessments
router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const { conversationIds } = req.body;
    
    if (!Array.isArray(conversationIds)) {
      return res.status(400).json({ error: 'conversationIds must be an array' });
    }
    
    if (conversationIds.length === 0) {
      return res.json({ data: {} });
    }
    
    const assessments = await qaAssessmentRepository.getBulk(conversationIds);
    res.json({ data: assessments });
  } catch (error) {
    logger.error('Error fetching bulk QA assessments', { error });
    res.status(500).json({ error: 'Failed to fetch QA assessments' });
  }
});

// GET /api/qa-assessments/tags - Get all available tags
router.get('/tags', async (req: Request, res: Response) => {
  try {
    const tags = await qaAssessmentRepository.getAllTags();
    res.json({ data: tags });
  } catch (error) {
    logger.error('Error fetching all tags', { error });
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// GET /api/qa-assessments/:conversationId - Get QA assessment
router.get('/:conversationId', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const assessment = await qaAssessmentRepository.get(conversationId);
    
    res.json({ data: assessment });
  } catch (error) {
    logger.error('Error fetching QA assessment', { conversationId: req.params.conversationId, error });
    res.status(500).json({ error: 'Failed to fetch QA assessment' });
  }
});

// POST /api/qa-assessments/:conversationId/rating - Set rating
router.post('/:conversationId/rating', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { rating } = req.body;

    if (!rating || !['good', 'okay', 'bad'].includes(rating)) {
      return res.status(400).json({ error: 'Invalid rating. Must be good, okay, or bad' });
    }

    const assessment = await qaAssessmentRepository.setRating(conversationId, rating);
    res.json({ data: assessment });
  } catch (error) {
    logger.error('Error setting rating', { conversationId: req.params.conversationId, rating: req.body.rating, error });
    res.status(500).json({ error: 'Failed to set rating' });
  }
});

// POST /api/qa-assessments/:conversationId/tags - Add tags
router.post('/:conversationId/tags', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { tags } = req.body;

    if (!Array.isArray(tags)) {
      return res.status(400).json({ error: 'Tags must be an array' });
    }

    await qaAssessmentRepository.addTags(conversationId, tags);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error adding tags', { conversationId: req.params.conversationId, tags: req.body.tags, error });
    res.status(500).json({ error: 'Failed to add tags' });
  }
});

// DELETE /api/qa-assessments/:conversationId/tags - Remove tags
router.delete('/:conversationId/tags', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { tags } = req.body;

    if (!Array.isArray(tags)) {
      return res.status(400).json({ error: 'Tags must be an array' });
    }

    await qaAssessmentRepository.removeTags(conversationId, tags);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error removing tags', { conversationId: req.params.conversationId, tags: req.body.tags, error });
    res.status(500).json({ error: 'Failed to remove tags' });
  }
});

// POST /api/qa-assessments/:conversationId/notes - Set notes
router.post('/:conversationId/notes', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { notes } = req.body;

    if (typeof notes !== 'string') {
      return res.status(400).json({ error: 'Notes must be a string' });
    }

    const assessment = await qaAssessmentRepository.setNotes(conversationId, notes);
    res.json({ data: assessment });
  } catch (error) {
    logger.error('Error setting notes', { conversationId: req.params.conversationId, error });
    res.status(500).json({ error: 'Failed to set notes' });
  }
});

// PATCH /api/qa-assessments/:conversationId - Update assessment
router.patch('/:conversationId', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const updates = req.body;

    const assessment = await qaAssessmentRepository.update(conversationId, updates);
    res.json({ data: assessment });
  } catch (error) {
    logger.error('Error updating assessment', { conversationId: req.params.conversationId, updates: req.body, error });
    res.status(500).json({ error: 'Failed to update assessment' });
  }
});

// POST /api/qa-assessments/bulk/rating - Bulk set rating
router.post('/bulk/rating', async (req: Request, res: Response) => {
  try {
    const { conversationIds, rating } = req.body;
    
    if (!Array.isArray(conversationIds)) {
      return res.status(400).json({ error: 'conversationIds must be an array' });
    }
    
    if (!rating || !['good', 'okay', 'bad'].includes(rating)) {
      return res.status(400).json({ error: 'Invalid rating. Must be good, okay, or bad' });
    }
    
    const results = await qaAssessmentRepository.setBulkRating(conversationIds, rating);
    res.json({ data: results });
  } catch (error) {
    logger.error('Error setting bulk rating', { conversationIds: req.body.conversationIds, rating: req.body.rating, error });
    res.status(500).json({ error: 'Failed to set bulk rating' });
  }
});

// POST /api/qa-assessments/bulk/tags - Bulk add tags
router.post('/bulk/tags', async (req: Request, res: Response) => {
  try {
    const { conversationIds, tags } = req.body;
    
    if (!Array.isArray(conversationIds)) {
      return res.status(400).json({ error: 'conversationIds must be an array' });
    }
    
    if (!Array.isArray(tags)) {
      return res.status(400).json({ error: 'Tags must be an array' });
    }
    
    await qaAssessmentRepository.addBulkTags(conversationIds, tags);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error adding bulk tags', { conversationIds: req.body.conversationIds, tags: req.body.tags, error });
    res.status(500).json({ error: 'Failed to add bulk tags' });
  }
});

export default router;

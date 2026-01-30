import { Router, Request, Response } from 'express';
import { conversationRepository } from '../repositories/conversationRepository';
import { ConversationFilters } from '../types';
import { logger } from '../utils/logger';

const router = Router();

// GET /api/conversations - List conversations with filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;
    const search = req.query.search as string;
    const sortBy = req.query.sortBy as string;

    // Parse filters
    const filters: ConversationFilters = {};

    // CSAT/QA Rating filter (human QA assessments: good, okay, bad, No Rating)
    if (req.query.csat) {
      const csatArray = Array.isArray(req.query.csat) ? req.query.csat : [req.query.csat];
      filters.csat = csatArray.map(c => c === 'null' ? null : c as 'good' | 'okay' | 'bad');
    }

    // Channel filter
    if (req.query.channel) {
      const channelArray = Array.isArray(req.query.channel) ? req.query.channel : [req.query.channel];
      filters.channel = channelArray as ('website' | 'whatsapp')[];
    }

    // Intent filter
    if (req.query.intent) {
      filters.intent = Array.isArray(req.query.intent) ? req.query.intent as string[] : [req.query.intent as string];
    }

    // Date filters
    if (req.query.dateFrom) {
      filters.dateFrom = req.query.dateFrom as string;
    }
    if (req.query.dateTo) {
      filters.dateTo = req.query.dateTo as string;
    }

    // Human handover filter
    if (req.query.humanHandover !== undefined) {
      filters.humanHandover = req.query.humanHandover === 'true';
    }

    // Lead created filter
    if (req.query.leadCreated !== undefined) {
      const leadCreatedValue = req.query.leadCreated as string;
      if (leadCreatedValue === 'true') {
        filters.leadCreated = true;
      } else if (leadCreatedValue === 'false') {
        filters.leadCreated = false;
      } else if (leadCreatedValue === 'null') {
        filters.leadCreated = null;
      }
    }

    const result = await conversationRepository.list(filters, page, pageSize, search, sortBy);

    res.json({
      data: result,
    });
  } catch (error: any) {
    logger.error('Error fetching conversations', {
      message: error?.message,
      code: error?.code,
      detail: error?.detail,
      hint: error?.hint,
    });
    res.status(500).json({ 
      error: 'Failed to fetch conversations',
      details: error?.message || String(error)
    });
  }
});

// GET /api/conversations/filters - Get filter options
router.get('/filters', async (req: Request, res: Response) => {
  try {
    const filterOptions = await conversationRepository.getFilterOptions();
    res.json({ data: filterOptions });
  } catch (error) {
    logger.error('Error fetching filter options', { error });
    res.status(500).json({ error: 'Failed to fetch filter options' });
  }
});

// GET /api/conversations/:id - Get conversation by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const includeMessages = req.query.messages === 'true';

    // Add timeout protection for slow queries
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Query timeout')), 25000); // 25 second timeout
    });

    const conversationPromise = conversationRepository.getById(id, includeMessages);
    
    const conversation = await Promise.race([conversationPromise, timeoutPromise]) as any;

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ data: conversation });
  } catch (error: any) {
    logger.error('Error fetching conversation', { 
      id: req.params.id,
      message: error?.message,
      stack: error?.stack 
    });
    res.status(500).json({ 
      error: 'Failed to fetch conversation',
      message: error?.message || 'Unknown error'
    });
  }
});

export default router;

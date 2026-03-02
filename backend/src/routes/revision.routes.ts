import { Router } from 'express';
import { RevisionService } from '../services/revision.service';
import { authMiddleware, requireAdmin } from '../middleware/auth.middleware';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Create revision items for a report (admin only)
router.post('/report/:reportId', authMiddleware, requireAdmin, async (req, res, next) => {
  try {
    const { reportId } = req.params;
    const { descriptions } = req.body;

    if (!Array.isArray(descriptions) || descriptions.length === 0) {
      return res.status(400).json({ error: 'Descriptions array is required' });
    }

    const items = await RevisionService.createRevisionItems(reportId, descriptions);
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
});

// Get all revision items for a report
router.get('/report/:reportId', authMiddleware, async (req, res, next) => {
  try {
    const { reportId } = req.params;
    const items = await RevisionService.getRevisionItemsByReport(reportId);
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
});

// Get revision item with files
router.get('/:itemId', authMiddleware, async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const data = await RevisionService.getRevisionItemWithFiles(itemId);
    
    if (!data) {
      return res.status(404).json({ error: 'Revision item not found' });
    }

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// Submit response to revision item (user)
router.put('/:itemId/response', authMiddleware, async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { userResponse } = req.body;

    if (!userResponse || !userResponse.trim()) {
      return res.status(400).json({ error: 'User response is required' });
    }

    const item = await RevisionService.submitRevisionResponse(itemId, userResponse);
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

// Upload file for revision item
router.post('/:itemId/files', authMiddleware, upload.single('file'), async (req, res, next) => {
  try {
    const { itemId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'File is required' });
    }

    const file = await RevisionService.uploadRevisionFile(itemId, req.file);
    res.json({ success: true, data: file });
  } catch (error) {
    next(error);
  }
});

// Get files for revision item
router.get('/:itemId/files', authMiddleware, async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const data = await RevisionService.getRevisionItemWithFiles(itemId);
    
    if (!data) {
      return res.status(404).json({ error: 'Revision item not found' });
    }

    res.json({ success: true, data: data.files });
  } catch (error) {
    next(error);
  }
});

// Approve revision item (admin only)
router.post('/:itemId/approve', authMiddleware, requireAdmin, async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { adminNotes } = req.body;

    const item = await RevisionService.approveRevisionItem(itemId, adminNotes);
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

// Reject revision item (admin only)
router.post('/:itemId/reject', authMiddleware, requireAdmin, async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { adminNotes } = req.body;

    if (!adminNotes || !adminNotes.trim()) {
      return res.status(400).json({ error: 'Admin notes are required for rejection' });
    }

    const item = await RevisionService.rejectRevisionItem(itemId, adminNotes);
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

// Download revision file
router.get('/files/download/:fileId', authMiddleware, async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const file = await RevisionService.getRevisionFileById(fileId);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.download(file.file_path, file.original_name);
  } catch (error) {
    next(error);
  }
});

export default router;

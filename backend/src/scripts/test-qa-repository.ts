import { qaAssessmentRepository } from '../repositories/qaAssessmentRepository';
import { logger } from '../utils/logger';

const testQARepository = async () => {
  try {
    logger.info('🧪 Testing QA Assessment Repository...\n');

    // Test 1: Create a test conversation ID
    const testConversationId = `test_conv_${Date.now()}`;
    logger.info(`Test Conversation ID: ${testConversationId}\n`);

    // Test 2: Get (should return null for new conversation)
    logger.info('Test 1: Get assessment (should be null)');
    const initial = await qaAssessmentRepository.get(testConversationId);
    if (initial === null) {
      logger.info('✅ Pass: Assessment not found (expected)\n');
    } else {
      logger.info('⚠️  Warning: Assessment found when it should be null\n');
    }

    // Test 3: Set rating
    logger.info('Test 2: Set rating');
    const ratingResult = await qaAssessmentRepository.setRating(testConversationId, 'good');
    if (ratingResult.rating === 'good' && ratingResult.conversationId === testConversationId) {
      logger.info('✅ Pass: Rating set successfully\n');
    } else {
      logger.info('❌ Fail: Rating not set correctly\n');
      process.exit(1);
    }

    // Test 4: Get after setting rating
    logger.info('Test 3: Get assessment after setting rating');
    const afterRating = await qaAssessmentRepository.get(testConversationId);
    if (afterRating && afterRating.rating === 'good') {
      logger.info('✅ Pass: Assessment retrieved correctly\n');
    } else {
      logger.info('❌ Fail: Assessment not retrieved correctly\n');
      process.exit(1);
    }

    // Test 5: Add tags
    logger.info('Test 4: Add tags');
    await qaAssessmentRepository.addTags(testConversationId, ['test-tag-1', 'test-tag-2']);
    const afterTags = await qaAssessmentRepository.get(testConversationId);
    if (afterTags && afterTags.tags.includes('test-tag-1') && afterTags.tags.includes('test-tag-2')) {
      logger.info('✅ Pass: Tags added successfully\n');
    } else {
      logger.info('❌ Fail: Tags not added correctly\n');
      process.exit(1);
    }

    // Test 6: Set notes
    logger.info('Test 5: Set notes');
    const notesResult = await qaAssessmentRepository.setNotes(testConversationId, 'Test notes');
    if (notesResult.notes === 'Test notes') {
      logger.info('✅ Pass: Notes set successfully\n');
    } else {
      logger.info('❌ Fail: Notes not set correctly\n');
      process.exit(1);
    }

    // Test 7: Bulk operations
    logger.info('Test 6: Bulk operations');
    const testIds = [`bulk_test_1_${Date.now()}`, `bulk_test_2_${Date.now()}`];
    
    // Bulk rating
    const bulkRatingResult = await qaAssessmentRepository.setBulkRating(testIds, 'okay');
    if (Object.keys(bulkRatingResult).length === 2) {
      logger.info('✅ Pass: Bulk rating works\n');
    } else {
      logger.info('❌ Fail: Bulk rating failed\n');
      process.exit(1);
    }

    // Bulk tags
    await qaAssessmentRepository.addBulkTags(testIds, ['bulk-tag']);
    const bulkGet = await qaAssessmentRepository.getBulk(testIds);
    if (Object.keys(bulkGet).length === 2 && bulkGet[testIds[0]]?.tags.includes('bulk-tag')) {
      logger.info('✅ Pass: Bulk tags work\n');
    } else {
      logger.info('❌ Fail: Bulk tags failed\n');
      process.exit(1);
    }

    // Test 8: Get bulk
    logger.info('Test 7: Get bulk assessments');
    const bulkResult = await qaAssessmentRepository.getBulk([testConversationId, ...testIds]);
    if (bulkResult[testConversationId] && bulkResult[testIds[0]] && bulkResult[testIds[1]]) {
      logger.info('✅ Pass: Bulk get works\n');
    } else {
      logger.info('❌ Fail: Bulk get failed\n');
      process.exit(1);
    }

    // Cleanup: Remove test data
    logger.info('🧹 Cleaning up test data...');
    // Note: We don't have a delete method, but test data is fine to leave
    logger.info('ℹ️  Test data left in database (can be cleaned manually if needed)\n');

    logger.info('✅ All tests passed! QA repository is working correctly.');
    process.exit(0);
  } catch (error: any) {
    logger.error('❌ Test failed', {
      error: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack,
    });

    if (error.code === '42P01') {
      logger.error('\n💡 Tables do not exist. Run: npm run setup-qa-tables');
    } else if (error.code === '28P01') {
      logger.error('\n💡 Authentication failed. Check DB credentials in .env');
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      logger.error('\n💡 Cannot connect to database. Check network/VPN access');
    }

    process.exit(1);
  }
};

testQARepository();

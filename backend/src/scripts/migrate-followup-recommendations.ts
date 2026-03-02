import { query } from '../config/database';
import { FollowupRecommendationModel } from '../models/followup-recommendation.model';

async function migrateFollowupRecommendations() {
  console.log('🔄 Migrating existing followup items to individual recommendations...\n');

  try {
    // Get all existing followup items
    const followupItems = await query(
      'SELECT * FROM followup_items ORDER BY created_at DESC'
    );

    console.log(`Found ${followupItems.rows.length} followup items to migrate`);

    for (const item of followupItems.rows) {
      console.log(`\nProcessing followup item: ${item.id}`);
      console.log(`Temuan: ${item.temuan.substring(0, 60)}...`);

      // Check if recommendations already exist for this item
      const existingRecs = await query(
        'SELECT COUNT(*) as count FROM followup_item_recommendations WHERE followup_item_id = ?',
        [item.id]
      );

      if (existingRecs.rows[0].count > 0) {
        console.log(`  ⏭️ Already has ${existingRecs.rows[0].count} recommendations, skipping`);
        continue;
      }

      // Split rekomendasi into individual recommendations
      const rekomendasiList = item.rekomendasi.split('\n\n').filter((rec: string) => rec.trim());
      console.log(`  📝 Found ${rekomendasiList.length} recommendations to create`);

      // Create individual recommendations
      const createdRecs = await FollowupRecommendationModel.createRecommendationsFromFollowupItem(
        item.id,
        rekomendasiList
      );

      console.log(`  ✅ Created ${createdRecs.length} individual recommendations`);
    }

    console.log('\n🎉 Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateFollowupRecommendations()
    .then(() => {
      console.log('Migration finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { migrateFollowupRecommendations };
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function testOptimizedTabSaving() {
  console.log('🧪 Testing optimized tab saving process...')
  
  try {
    // Test data with pre-generated categories and tags
    const testData = {
      url: 'https://example.com/test-optimized',
      title: 'Test Optimized Tab',
      description: 'Testing the optimized tab saving process',
      image: 'https://example.com/image.jpg',
      favicon: 'https://example.com/favicon.ico',
      content: 'This is test content for the optimized tab saving process.',
      tags: ['test', 'optimization', 'performance'],
      primaryCategory: 'technology',
      secondaryCategory: 'testing',
      confidence: 0.95
    }

    console.log('📊 Test data prepared:', {
      ...testData,
      content: testData.content.substring(0, 50) + '...'
    })

    // Test the optimized database function directly
    const startTime = Date.now()
    
    const result = await supabase.rpc('save_tab_with_tags', {
      p_url: testData.url,
      p_title: testData.title,
      p_description: testData.description,
      p_image: testData.image,
      p_favicon: testData.favicon,
      p_content: testData.content,
      p_primary_category: testData.primaryCategory,
      p_secondary_category: testData.secondaryCategory,
      p_category_confidence: testData.confidence,
      p_auto_categorized_at: new Date().toISOString(),
      p_tag_names: testData.tags,
      p_user_id: 'test-user-id' // This will be replaced with actual user ID in real usage
    })

    const endTime = Date.now()
    const duration = endTime - startTime

    if (result.error) {
      console.error('❌ Test failed:', result.error)
      return
    }

    console.log('✅ Test completed successfully!')
    console.log('📈 Performance metrics:')
    console.log(`   Duration: ${duration}ms`)
    console.log(`   Result:`, result.data)
    
    if (duration < 1000) {
      console.log('🚀 Excellent performance! Under 1 second.')
    } else if (duration < 2000) {
      console.log('⚡ Good performance! Under 2 seconds.')
    } else {
      console.log('⚠️  Performance could be improved.')
    }

    // Clean up test data
    if (result.data && result.data[0] && result.data[0].tab_id) {
      console.log('🧹 Cleaning up test data...')
      await supabase
        .from('tabs')
        .delete()
        .eq('id', result.data[0].tab_id)
      console.log('✅ Test data cleaned up.')
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error)
  }
}

// Run the test
testOptimizedTabSaving()
  .then(() => {
    console.log('🎉 Test completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Test failed:', error)
    process.exit(1)
  }) 
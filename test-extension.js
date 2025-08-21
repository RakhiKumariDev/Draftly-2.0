/**
 * Test script to validate Draftly extension functionality
 * Run this in the browser console on the popup page to debug issues
 */

function testDraftlyExtension() {
    console.log('🧪 Testing Draftly Extension...');
    
    // Test 1: Check if DOM elements exist
    console.log('\n1. Testing DOM elements...');
    const elements = {
        emailInput: document.getElementById('emailInput'),
        toneSelect: document.getElementById('toneSelect'),
        generateBtn: document.getElementById('generateBtn'),
        outputSection: document.getElementById('outputSection'),
        generatedReply: document.getElementById('generatedReply'),
        copyBtn: document.getElementById('copyBtn'),
        regenerateBtn: document.getElementById('regenerateBtn'),
        statusMessage: document.getElementById('statusMessage'),
        charCount: document.getElementById('charCount')
    };
    
    for (const [name, element] of Object.entries(elements)) {
        if (element) {
            console.log(`✅ ${name} found`);
        } else {
            console.error(`❌ ${name} NOT found`);
        }
    }
    
    // Test 2: Check if DraftlyPopup instance exists
    console.log('\n2. Testing DraftlyPopup instance...');
    if (window.draftly) {
        console.log('✅ DraftlyPopup instance found');
        
        // Test email generation with sample data
        console.log('\n3. Testing email generation...');
        testEmailGeneration();
    } else {
        console.error('❌ DraftlyPopup instance NOT found');
    }
    
    // Test 3: Check Chrome extension APIs
    console.log('\n4. Testing Chrome APIs...');
    if (typeof chrome !== 'undefined') {
        console.log('✅ Chrome APIs available');
        
        if (chrome.storage) {
            console.log('✅ Chrome storage API available');
        } else {
            console.error('❌ Chrome storage API NOT available');
        }
    } else {
        console.error('❌ Chrome APIs NOT available');
    }
}

async function testEmailGeneration() {
    if (!window.draftly) {
        console.error('❌ Cannot test email generation - DraftlyPopup not found');
        return;
    }
    
    const testInputs = [
        { input: 'Hello, I need help with my account', tone: 'professional' },
        { input: 'Can we schedule a meeting next week?', tone: 'friendly' },
        { input: 'Thank you for your assistance', tone: 'formal' },
        { input: 'There seems to be an issue with my order', tone: 'casual' }
    ];
    
    for (const test of testInputs) {
        try {
            console.log(`\n🧪 Testing: "${test.input}" with tone: ${test.tone}`);
            const reply = await window.draftly.generateEmailReply(test.input, test.tone);
            
            if (reply && reply.length > 0) {
                console.log(`✅ Generated reply (${reply.length} chars)`);
                console.log(`📝 Preview: ${reply.substring(0, 100)}...`);
            } else {
                console.error('❌ Empty reply generated');
            }
        } catch (error) {
            console.error(`❌ Error generating reply: ${error.message}`);
        }
    }
}

function testTemplateSystem() {
    console.log('\n🧪 Testing Template System...');
    
    if (!window.draftly) {
        console.error('❌ Cannot test templates - DraftlyPopup not found');
        return;
    }
    
    const tones = ['professional', 'friendly', 'formal', 'casual'];
    
    for (const tone of tones) {
        try {
            const templates = window.draftly.getEmailTemplates(tone);
            
            if (templates && typeof templates === 'object') {
                console.log(`✅ ${tone} templates found`);
                
                const requiredFields = ['greeting', 'acknowledgment', 'response', 'closing', 'signature'];
                const missingFields = requiredFields.filter(field => !templates[field]);
                
                if (missingFields.length === 0) {
                    console.log(`✅ All required fields present for ${tone}`);
                } else {
                    console.warn(`⚠️ Missing fields in ${tone}: ${missingFields.join(', ')}`);
                }
            } else {
                console.error(`❌ Invalid templates for ${tone}`);
            }
        } catch (error) {
            console.error(`❌ Error getting ${tone} templates: ${error.message}`);
        }
    }
}

// Auto-run tests if this script is loaded in popup context
if (typeof window !== 'undefined' && window.document) {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(testDraftlyExtension, 1000);
            setTimeout(testTemplateSystem, 1500);
        });
    } else {
        setTimeout(testDraftlyExtension, 1000);
        setTimeout(testTemplateSystem, 1500);
    }
}

// Export test functions for manual use
if (typeof window !== 'undefined') {
    window.testDraftly = {
        runAllTests: testDraftlyExtension,
        testGeneration: testEmailGeneration,
        testTemplates: testTemplateSystem
    };
    
    console.log('🔧 Test functions available: window.testDraftly.runAllTests()');
}

// Test script for Gemini function
// Usage: node test-gemini-function.js ACCESS_TOKEN

const fetch = require('node-fetch');

const accessToken = process.argv[2];
if (!accessToken) {
  console.error('Please provide your access token as an argument: node test-gemini-function.js ACCESS_TOKEN');
  process.exit(1);
}

async function testGeminiFunction() {
  try {
    const response = await fetch('https://prbbuxgirnecbkpdpgcb.supabase.co/functions/v1/chat-google', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: 'Explain the concept of proximate cause in negligence law.'
          }
        ]
      })
    });

    if (!response.ok) {
      console.error('Error response:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return;
    }

    const data = await response.json();
    console.log('Response from Gemini function:');
    console.log(JSON.stringify(data, null, 2));
    
    // Show the actual answer text
    if (data.choices && data.choices[0] && data.choices[0].message) {
      console.log('\nAnswer text:');
      console.log(data.choices[0].message.content);
    }
  } catch (error) {
    console.error('Error calling Gemini function:', error);
  }
}

testGeminiFunction(); 
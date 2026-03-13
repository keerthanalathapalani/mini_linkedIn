export async function enhanceBio(bio, token) {
  try {
    const res = await fetch('/api/ai/enhance-bio', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ bio })
    });
    const data = await res.json();
    return data.enhancedBio;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function enhanceCaption(caption, token) {
  try {
    const res = await fetch('/api/ai/enhance-caption', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ caption })
    });
    const data = await res.json();
    return data.enhancedCaption;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

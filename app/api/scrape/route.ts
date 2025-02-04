import { createServiceRoleClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { JSDOM } from 'jsdom';

async function resolveUrl(url: string): Promise<string> {
  try {
    const parsedUrl = new URL(url);
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DialectBot/1.0; +https://dialect.so)'
      }
    });

    // If we get a relative redirect, resolve it against the original URL
    const location = response.headers.get('location');
    if (location) {
      if (location.startsWith('/')) {
        return `${parsedUrl.origin}${location}`;
      }
      return location;
    }

    return response.url;
  } catch (error) {
    console.error('Error resolving URL:', error);
    return url;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json(
        { error: 'Missing messageId parameter' },
        { status: 400 }
      );
    }

    // Create Supabase service role client
    const supabase = createServiceRoleClient();

    // Get the URL from the database
    const { data: contentData, error: contentError } = await supabase
      .from('shared_content')
      .select('content_url')
      .eq('message_id', messageId)
      .single();

    if (contentError || !contentData) {
      console.error('Error fetching content URL:', contentError);
      return NextResponse.json(
        { error: 'Failed to fetch content URL' },
        { status: 500 }
      );
    }

    const url = contentData.content_url;
    console.log('Initial URL from database:', url);

    // Fetch the webpage content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DialectBot/1.0; +https://dialect.so)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();

    // Parse the HTML using jsdom
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Extract metadata with fallbacks and special handling for Wikipedia
    let title = document.querySelector('title')?.textContent ||
      document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
      document.querySelector('meta[name="twitter:title"]')?.getAttribute('content') ||
      '';

    let description = document.querySelector('meta[name="description"]')?.getAttribute('content') ||
      document.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
      document.querySelector('meta[name="twitter:description"]')?.getAttribute('content') ||
      '';

    let image = document.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
      document.querySelector('meta[name="twitter:image"]')?.getAttribute('content') ||
      document.querySelector('meta[name="twitter:image:src"]')?.getAttribute('content') ||
      '';

    // Special handling for Wikipedia
    if (url.includes('wikipedia.org')) {
      // Get the first paragraph as description if not found
      if (!description) {
        const firstParagraph = document.querySelector('#mw-content-text p:not(.mw-empty-elt)');
        description = firstParagraph?.textContent?.trim() || '';
      }

      // Get the first infobox image if no image found
      if (!image) {
        const infoboxImage = document.querySelector('.infobox img');
        if (infoboxImage) {
          const imgSrc = infoboxImage.getAttribute('src');
          if (imgSrc) {
            image = imgSrc.startsWith('http') ? imgSrc : `https:${imgSrc}`;
          }
        }
      }

      // If still no image, try getting the first content image
      if (!image) {
        const contentImage = document.querySelector('#mw-content-text img[src]:not(.mw-file-element)');
        if (contentImage) {
          const imgSrc = contentImage.getAttribute('src');
          if (imgSrc) {
            image = imgSrc.startsWith('http') ? imgSrc : `https:${imgSrc}`;
          }
        }
      }
    }

    console.log('Extracted metadata:', { title, description, image });

    // Update the shared_content record with the scraped data
    const { error: updateError } = await supabase
      .from('shared_content')
      .update({
        processed_data: {
          title,
          description,
          image
        },
        status: 'scraped',
        last_scraped_at: new Date().toISOString()
      })
      .eq('message_id', messageId);

    if (updateError) {
      console.error('Error updating shared_content:', updateError);
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      data: { title, description, image }
    });

  } catch (error) {
    console.error('Error in scrape endpoint:', error);

    // Update status to failed if we have a messageId
    const messageId = new URL(request.url).searchParams.get('messageId');
    if (messageId) {
      const supabase = createServiceRoleClient();
      await supabase
        .from('shared_content')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          last_scraped_at: new Date().toISOString()
        })
        .eq('message_id', messageId);
    }

    return NextResponse.json(
      { error: 'Failed to scrape URL', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 
"""
Web Crawler — web_crawler.py
Crawls entire domains with JavaScript rendering support.
Outputs all discovered content to a single .txt file.

Usage:
    python web_crawler.py <start_url>
    Example: python web_crawler.py https://example.com
"""

import asyncio
import sys
import time
import logging
from datetime import datetime
from pathlib import Path
from urllib.parse import urljoin, urlparse
from collections import defaultdict

import httpx
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(message)s'
)
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────

MAX_PAGES = 500  # Max pages to crawl per domain
MAX_DEPTH = 10  # Max depth to follow links
TIMEOUT = 30  # Seconds per page
RATE_LIMIT = 1.0  # Seconds between requests
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

# ─────────────────────────────────────────────
# CRAWLER
# ─────────────────────────────────────────────

class DomainCrawler:
    def __init__(self, start_url: str):
        self.start_url = start_url
        self.domain = urlparse(start_url).netloc
        self.visited = set()
        self.failed = set()
        self.queue = [(start_url, 0)]  # (url, depth)
        self.pages = []  # List of crawled pages
        self.last_request = 0
        
    def is_same_domain(self, url: str) -> bool:
        """Check if URL belongs to same domain."""
        try:
            parsed = urlparse(url)
            return parsed.netloc == self.domain
        except:
            return False
    
    def normalize_url(self, url: str) -> str:
        """Normalize URL (remove fragments, lowercase domain)."""
        try:
            parsed = urlparse(url)
            # Remove fragment and trailing slashes
            normalized = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
            if parsed.query:
                normalized += f"?{parsed.query}"
            return normalized.rstrip('/')
        except:
            return url
    
    async def fetch_with_browser(self, url: str, browser) -> str:
        """Fetch page content using Playwright (handles JS)."""
        try:
            page = await browser.new_page(user_agent=USER_AGENT)
            await page.goto(url, wait_until="networkidle", timeout=TIMEOUT * 1000)
            
            # Wait for common dynamic content
            await asyncio.sleep(1)
            
            content = await page.content()
            await page.close()
            return content
        except PlaywrightTimeout:
            logger.warning(f"Timeout: {url}")
            return ""
        except Exception as e:
            logger.warning(f"Browser fetch failed for {url}: {e}")
            return ""
    
    async def fetch_with_httpx(self, url: str, client: httpx.AsyncClient) -> str:
        """Fallback: fetch with httpx (faster, no JS)."""
        try:
            response = await client.get(url, timeout=TIMEOUT, follow_redirects=True)
            return response.text
        except Exception as e:
            logger.warning(f"HTTPX fetch failed for {url}: {e}")
            return ""
    
    def extract_text_and_links(self, html: str, page_url: str) -> tuple[str, list[str]]:
        """Extract text content and links from HTML."""
        try:
            soup = BeautifulSoup(html, 'html.parser')
            
            # Remove script/style tags
            for tag in soup(['script', 'style', 'meta', 'link']):
                tag.decompose()
            
            # Extract text
            text = soup.get_text(separator='\n', strip=True)
            text = '\n'.join(line.strip() for line in text.split('\n') if line.strip())
            
            # Extract links
            links = []
            for a in soup.find_all('a', href=True):
                link = a['href']
                # Convert relative to absolute
                absolute_link = urljoin(page_url, link)
                # Filter to same domain
                if self.is_same_domain(absolute_link):
                    normalized = self.normalize_url(absolute_link)
                    if normalized not in self.visited and normalized not in self.failed:
                        links.append(normalized)
            
            return text, list(set(links))  # Deduplicate links
        except Exception as e:
            logger.warning(f"Parse error: {e}")
            return "", []
    
    async def crawl_page(self, url: str, depth: int, browser) -> None:
        """Crawl a single page."""
        if url in self.visited or url in self.failed:
            return
        if depth > MAX_DEPTH or len(self.visited) >= MAX_PAGES:
            return
        
        # Rate limiting
        elapsed = time.time() - self.last_request
        if elapsed < RATE_LIMIT:
            await asyncio.sleep(RATE_LIMIT - elapsed)
        self.last_request = time.time()
        
        self.visited.add(url)
        logger.info(f"[{len(self.visited)}/{MAX_PAGES}] Crawling (depth {depth}): {url}")
        
        try:
            # Try browser first (handles JS)
            html = await self.fetch_with_browser(url, browser)
            
            if not html:
                self.failed.add(url)
                return
            
            text, links = self.extract_text_and_links(html, url)
            
            if not text.strip():
                logger.warning(f"No text extracted: {url}")
                self.failed.add(url)
                return
            
            # Store page
            self.pages.append({
                "url": url,
                "depth": depth,
                "text": text,
                "word_count": len(text.split()),
                "timestamp": datetime.now().isoformat(),
            })
            
            # Queue new links
            for link in links:
                if link not in self.visited and link not in self.failed:
                    self.queue.append((link, depth + 1))
        
        except Exception as e:
            logger.error(f"Crawl error on {url}: {e}")
            self.failed.add(url)
    
    async def run(self) -> None:
        """Run the crawler."""
        logger.info(f"\n{'='*60}")
        logger.info(f"Starting domain crawl: {self.domain}")
        logger.info(f"Start URL: {self.start_url}")
        logger.info(f"{'='*60}\n")
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            
            while self.queue and len(self.visited) < MAX_PAGES:
                url, depth = self.queue.pop(0)
                await self.crawl_page(url, depth, browser)
            
            await browser.close()
        
        logger.info(f"\n{'='*60}")
        logger.info(f"Crawl complete!")
        logger.info(f"Pages crawled: {len(self.visited)}")
        logger.info(f"Pages failed: {len(self.failed)}")
        logger.info(f"Total content: {sum(p['word_count'] for p in self.pages):,} words")
        logger.info(f"{'='*60}\n")
    
    def save_to_file(self, output_path: str = None) -> str:
        """Save all crawled content to a .txt file."""
        if not output_path:
            safe_domain = self.domain.replace('/', '_').replace(':', '_')
            output_path = f"crawled_{safe_domain}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        
        output_path = Path(output_path)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(f"DOMAIN CRAWL REPORT\n")
            f.write(f"{'='*80}\n")
            f.write(f"Domain: {self.domain}\n")
            f.write(f"Start URL: {self.start_url}\n")
            f.write(f"Crawl Date: {datetime.now().isoformat()}\n")
            f.write(f"Total Pages: {len(self.pages)}\n")
            f.write(f"Total Words: {sum(p['word_count'] for p in self.pages):,}\n")
            f.write(f"\n{'='*80}\n\n")
            
            # Sort by depth, then by URL
            sorted_pages = sorted(self.pages, key=lambda p: (p['depth'], p['url']))
            
            for i, page in enumerate(sorted_pages, 1):
                f.write(f"\n{'─'*80}\n")
                f.write(f"PAGE {i} of {len(self.pages)}\n")
                f.write(f"{'─'*80}\n")
                f.write(f"URL: {page['url']}\n")
                f.write(f"Depth: {page['depth']}\n")
                f.write(f"Words: {page['word_count']}\n")
                f.write(f"Crawled: {page['timestamp']}\n")
                f.write(f"\n{page['text']}\n")
            
            f.write(f"\n{'='*80}\n")
            f.write(f"END OF REPORT\n")
            f.write(f"{'='*80}\n")
        
        logger.info(f"✓ Saved to: {output_path}")
        return str(output_path)


async def main():
    if len(sys.argv) < 2:
        print("\nUsage: python web_crawler.py <start_url> [output_file.txt]")
        print("Example: python web_crawler.py https://example.com")
        print("Example: python web_crawler.py https://example.com crawled.txt\n")
        sys.exit(1)
    
    start_url = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None
    
    # Validate URL
    if not start_url.startswith(('http://', 'https://')):
        start_url = 'https://' + start_url
    
    try:
        urlparse(start_url).netloc
    except:
        print(f"Invalid URL: {start_url}")
        sys.exit(1)
    
    crawler = DomainCrawler(start_url)
    await crawler.run()
    crawler.save_to_file(output_file)


if __name__ == "__main__":
    asyncio.run(main())
